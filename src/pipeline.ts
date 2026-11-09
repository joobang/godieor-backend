import { Injectable, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { randomUUID } from 'node:crypto';
import { DateTime } from 'luxon';
import { Database } from './database';
import { Prisma } from './generated/prisma/client';
import { Canonical, normalize, ProviderAdapter, Scope } from './domain';
import { FixtureAdapter } from './providers/fixture';
import { runtimeConfig } from './config';
type Tx = Prisma.TransactionClient;
type Outcome = { provider: string; category: string; status: string; published?: number; errorCode?: string };
function stable(value: unknown): string { return JSON.stringify(value, (_key, x) => x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b))) : x); }
function json(value: unknown): Prisma.InputJsonValue { return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue; }
@Injectable()
export class Pipeline implements OnModuleInit {
 private readonly adapters: ProviderAdapter[] = [new FixtureAdapter()];
 constructor(private readonly db: Database) {}
 async onModuleInit() {
  await this.db.$transaction(async tx => {
   let changed = false;
   for (const adapter of this.adapters) {
    const registered = await tx.provider.findUnique({ where: { key: adapter.key } });
    if (registered && registered.origin !== adapter.origin) throw new Error('ADAPTER_ORIGIN_MISMATCH');
    await tx.provider.upsert({ where: { key: adapter.key }, create: { key: adapter.key, name: adapter.name, origin: adapter.origin }, update: {} });
    for (const scope of adapter.scopes) {
     const found = await tx.collection_scope.findUnique({ where: { provider_key_category_scope_market: { provider_key: adapter.key, category: scope.category, scope_market: scope.market } } });
     if (!found) { await tx.collection_scope.create({ data: { id: randomUUID(), provider_key: adapter.key, category: scope.category, scope_market: scope.market } }); changed = true; }
    }
   }
   if (changed) await this.bump(tx);
  });
 }
 private async bump(tx: Tx) { return tx.catalog_state.update({ where: { singleton: true }, data: { revision: { increment: 1 }, published_at: new Date() } }); }
 async collect(mode: 'backfill' | 'daily', force = false): Promise<Outcome[]> {
  const outcomes: Outcome[] = [];
  for (const adapter of this.adapters) {
   const got = await this.db.withCollectorLock('collector:' + adapter.key, async () => {
    for (const scope of adapter.scopes) outcomes.push(await this.collectScope(adapter, scope, mode, force));
    return true;
   });
   if (got === null) outcomes.push({ provider: adapter.key, category: 'all', status: 'already_running' });
  }
  return outcomes;
 }
 private async collectScope(adapter: ProviderAdapter, scope: Scope, mode: 'backfill' | 'daily', force: boolean): Promise<Outcome> {
  const state = await this.db.collection_scope.findUniqueOrThrow({ where: { provider_key_category_scope_market: { provider_key: adapter.key, category: scope.category, scope_market: scope.market } } });
  if (mode === 'daily' && !force && state.last_successful_at && DateTime.fromJSDate(state.last_successful_at, { zone: 'Asia/Seoul' }).toISODate() === DateTime.now().setZone('Asia/Seoul').toISODate()) return { provider: adapter.key, category: scope.category, status: 'already_collected_today' };
  const runId = randomUUID(); const started = new Date();
  await this.db.$transaction(async tx => {
   await tx.collection_scope.update({ where: { id: state.id }, data: { last_attempt_at: started, last_attempt_status: 'running', last_error_code: null } });
   await tx.collection_run.create({ data: { id: runId, scope_id: state.id, mode, status: 'running', started_at: started } });
   await this.bump(tx);
  });
  try {
   // I/O·정규화는 publish 트랜잭션 밖. 한 scope의 검증 실패는 부분 공개하지 않는다.
   const records = (await adapter.fetch(scope, mode)).map(raw => normalize(raw, scope));
   const keys = new Set<string>();
   for (const r of records) { const key = JSON.stringify([r.externalId, r.variantKey]); if (keys.has(key)) throw new Error('DUPLICATE_SOURCE_KEY'); keys.add(key); }
   await this.db.$transaction(async tx => {
    const catalog = await this.bump(tx);
    for (const record of records) await this.publish(tx, adapter, record, catalog.revision);
    const finished = new Date();
    await tx.collection_scope.update({ where: { id: state.id }, data: { coverage: 'partial', last_attempt_status: 'succeeded', last_successful_at: finished, last_error_code: null } });
    await tx.collection_run.update({ where: { id: runId }, data: { status: 'succeeded', finished_at: finished } });
   }, { timeout: 30000 });
   return { provider: adapter.key, category: scope.category, status: 'succeeded', published: records.length };
  } catch (error) {
   const known = new Set(['SCOPE_MISMATCH', 'MARKET_MISMATCH', 'INVALID_MATCH', 'INVALID_CONTENT', 'INVALID_SEASON_OR_SERVICE', 'MISSING_OTT_EVIDENCE', 'INVALID_DEVICE', 'MISSING_GAME_DEVICE', 'INVALID_DATE', 'INVALID_INSTANT', 'INVALID_SOURCE_URL', 'DUPLICATE_SOURCE_KEY', 'IDENTITY_CHANGED', 'INVALID_FIXTURE_BATCH', 'INVALID_FIXTURE_KIND']);
   const code = error instanceof Error && known.has(error.message) ? error.message : error instanceof Error && error.name === 'ZodError' ? 'NORMALIZATION_FAILED' : 'COLLECTION_FAILED';
   await this.db.$transaction(async tx => {
    await tx.collection_scope.update({ where: { id: state.id }, data: { last_attempt_status: 'failed', last_error_code: code } });
    await tx.collection_run.update({ where: { id: runId }, data: { status: 'failed', finished_at: new Date(), error_code: code } });
    await this.bump(tx);
   });
   return { provider: adapter.key, category: scope.category, status: 'failed', errorCode: code };
  }
 }
 private async content(tx: Tx, providerKey: string, c: NonNullable<Canonical['content']>) {
  const key = { provider_key: providerKey, content_type: c.kind, external_id: c.externalId };
  const found = await tx.content_source.findUnique({ where: { provider_key_content_type_external_id: key } });
  if (found) { await tx.content.update({ where: { id: found.content_id }, data: { title: c.title, updated_at: new Date() } }); return found.content_id; }
  const id = randomUUID();
  await tx.content.create({ data: { id, kind: c.kind, title: c.title } });
  await tx.content_source.create({ data: { ...key, content_id: id } });
  return id;
 }
 private async team(tx: Tx, providerKey: string, team: NonNullable<Canonical['home']>) {
  const key = { provider_key: providerKey, external_id: team.externalId };
  const found = await tx.team_source.findUnique({ where: { provider_key_external_id: key } });
  if (found) { await tx.team.update({ where: { id: found.team_id }, data: { name: team.name } }); return found.team_id; }
  const id = randomUUID(); await tx.team.create({ data: { id, name: team.name } });
  await tx.team_source.create({ data: { ...key, team_id: id } }); return id;
 }
 private async publish(tx: Tx, adapter: ProviderAdapter, r: Canonical, revision: bigint) {
  const key = { provider_key: adapter.key, external_id: r.externalId, variant_key: r.variantKey };
  const source = await tx.event_source.findUnique({ where: { provider_key_external_id_variant_key: key } });
  const prior = source ? await tx.event.findUniqueOrThrow({ where: { id: source.event_id } }) : null;
  if (prior && (prior.kind !== r.kind || prior.origin !== adapter.origin)) throw new Error('IDENTITY_CHANGED');
  const contentId = r.content ? await this.content(tx, adapter.key, r.content) : null;
  let seasonId: string | null = null;
  if (contentId && r.seasonNumber !== null) {
   seasonId = (await tx.drama_season.upsert({ where: { content_id_season_number: { content_id: contentId, season_number: r.seasonNumber } }, create: { id: randomUUID(), content_id: contentId, season_number: r.seasonNumber }, update: {} })).id;
  }
  const t = r.time;
  const data = { kind: r.kind, title: r.title, content_id: contentId, content_type: r.content?.kind ?? null, season_id: seasonId, status: r.status, precision: t.type, instant_at: t.type === 'instant' ? new Date(t.value) : null, local_date: t.type === 'date_only' ? new Date(t.value + 'T00:00:00Z') : null, source_time_zone: t.type === 'instant' ? t.sourceTimeZone : null, announced_year: t.type === 'unknown' ? t.announcedYear : null, announced_period: t.type === 'unknown' ? t.announcedPeriod : null, release_market: r.market, venue_country: r.venueCountry, home_team_id: r.home ? await this.team(tx, adapter.key, r.home) : null, away_team_id: r.away ? await this.team(tx, adapter.key, r.away) : null, origin: adapter.origin };
  const eventId = prior?.id ?? randomUUID();
  const last = prior ? await tx.event_change.findFirst({ where: { event_id: eventId }, orderBy: { catalog_revision: 'desc' } }) : null;
  const after = json(r);
  if (!last || stable(last.after_value) !== stable(after)) {
   await tx.event.upsert({ where: { id: eventId }, create: { id: eventId, ...data }, update: { ...data, updated_at: new Date() } });
   await tx.event_service.deleteMany({ where: { event_id: eventId } });
   await tx.event_device.deleteMany({ where: { event_id: eventId } });
   if (r.services.length) await tx.event_service.createMany({ data: r.services.map(service => ({ event_id: eventId, service })) });
   if (r.devices.length) await tx.event_device.createMany({ data: r.devices.map(device => ({ event_id: eventId, device })) });
   await tx.event_change.create({ data: { id: randomUUID(), event_id: eventId, catalog_revision: revision, before_value: last?.after_value ?? Prisma.DbNull, after_value: after } });
  }
  await tx.event_source.upsert({ where: { provider_key_external_id_variant_key: key }, create: { ...key, event_id: eventId, source_url: r.sourceUrl, observed_at: new Date(), source_updated_at: r.sourceUpdatedAt ? new Date(r.sourceUpdatedAt) : null }, update: { source_url: r.sourceUrl, observed_at: new Date(), source_updated_at: r.sourceUpdatedAt ? new Date(r.sourceUpdatedAt) : null } });
 }
 @Cron('0 0 6 * * *', { timeZone: 'Asia/Seoul', waitForCompletion: true })
 async daily() { if (!runtimeConfig().schedule) return; try { console.log(JSON.stringify({ job: 'daily_collection', results: await this.collect('daily') })); } catch { console.error(JSON.stringify({ job: 'daily_collection', errorCode: 'COLLECTION_UNAVAILABLE' })); } }
}
