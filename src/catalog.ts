import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { DateTime } from 'luxon';
import { Database } from './database';
import { Prisma } from './generated/prisma/client';
import { calendarDate, CATEGORIES, COUNTRIES, DEVICES, iso, KIND_CATEGORY, runtimeConfig, SERVICES, TIME_ZONES, validZone } from './config';
type Tx = Prisma.TransactionClient;
const includes = { event_service: true, event_device: true, drama_season: true, team_event_home_team_idToteam: true, team_event_away_team_idToteam: true } as const;
type Row = Prisma.eventGetPayload<{ include: typeof includes }>;
type Q = { country: string; zone: string; categories: string[]; services: string[]; devices: string[]; revision?: string; month?: string; schedule?: string; from?: string; to?: string; contentId?: string; limit: number; cursor?: string };
type KeyRow = { id: string; sort_day: string; sort_rank: number; sort_time: string };
function bad(field: string): never { throw new BadRequestException({ code: 'INVALID_QUERY', message: '조회 조건을 확인하세요.', details: [{ field, reason: '유효하지 않거나 지원하지 않는 값' }] }); }
function id(value: string) { if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) bad('id'); return value; }
function revision(value: string | undefined) { if (value && !/^[1-9][0-9]{0,18}$/.test(value)) bad('catalogRevision'); return value; }
function parse(raw: Record<string, unknown>, calendar: boolean): Q {
 const allowed = new Set(['country', 'timeZone', 'categories', 'services', 'devices', 'catalogRevision', ...(calendar ? ['month'] : ['schedule', 'from', 'to', 'contentId', 'limit', 'cursor'])]);
 const values: Record<string, string> = {};
 for (const [k, v] of Object.entries(raw)) { if (!allowed.has(k) || typeof v !== 'string' || v.length > 4096) bad(k); values[k] = v; }
 function list(key: string, valid: readonly string[], fallback: readonly string[]) { const value = values[key]; const a = value ? value.split(',') : [...fallback]; if (new Set(a).size !== a.length || a.some(x => !valid.includes(x))) bad(key); return [...new Set(a)].sort(); }
 const q: Q = { country: values.country || 'KR', zone: values.timeZone || 'Asia/Seoul', categories: list('categories', CATEGORIES, CATEGORIES), services: list('services', SERVICES, []), devices: list('devices', DEVICES, []), revision: revision(values.catalogRevision), limit: Number(values.limit || 50), cursor: values.cursor };
 if (!(COUNTRIES as readonly string[]).includes(q.country)) bad('country');
 if (!validZone(q.zone) || !TIME_ZONES.includes(q.zone)) bad('timeZone');
 if (!Number.isInteger(q.limit) || q.limit < 1 || q.limit > 100) bad('limit');
 function date(value: string | undefined, field: string) { if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) bad(field); const dt = DateTime.fromISO(value, { zone: q.zone }); if (!dt.isValid || dt.toISODate() !== value) bad(field); return dt; }
 if (calendar) {
  if (!values.month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(values.month)) bad('month');
  const first = date(values.month + '-01', 'month'); if (values.month < '2026-01') bad('month');
  q.month = values.month; q.schedule = 'dated'; q.from = first.toISODate()!; q.to = first.plus({ months: 1 }).toISODate()!;
 } else {
  if (!['dated', 'undated'].includes(values.schedule ?? '')) bad('schedule'); q.schedule = values.schedule;
  if (q.schedule === 'dated') { const from = date(values.from, 'from'); const to = date(values.to, 'to'); const days = to.diff(from, 'days').days; if (values.from! < '2026-01-01' || days <= 0 || days > 62) bad('from/to'); q.from = values.from; q.to = values.to; }
  else if ('from' in values || 'to' in values) bad('from/to');
  if (values.contentId) q.contentId = id(values.contentId);
 }
 return q;
}
function timeOf(e: { precision: string; instant_at: Date | null; local_date: Date | null; source_time_zone: string | null; announced_year: number | null; announced_period: string | null }, zone: string) {
 if (e.precision === 'instant' && e.instant_at) { const dt = DateTime.fromJSDate(e.instant_at, { zone }); return { type: 'instant', instantUtc: e.instant_at.toISOString(), sourceTimeZone: e.source_time_zone, displayDate: dt.toISODate(), displayTime: dt.toFormat('HH:mm') }; }
 if (e.precision === 'date_only' && e.local_date) return { type: 'date_only', date: calendarDate(e.local_date) };
 return { type: 'unknown', announcedYear: e.announced_year, announcedPeriod: e.announced_period };
}
function serialize(e: Row, zone: string) {
 return { id: e.id, kind: e.kind, title: e.title, contentId: e.content_id, season: e.drama_season ? { id: e.drama_season.id, number: e.drama_season.season_number } : null, status: e.status, time: timeOf(e, zone), releaseMarket: e.release_market, venueCountry: e.venue_country, services: e.event_service.map(x => x.service).sort(), devices: e.event_device.map(x => x.device).sort(), match: e.kind === 'epl_match' ? { competition: 'epl', home: { id: e.team_event_home_team_idToteam!.id, name: e.team_event_home_team_idToteam!.name }, away: { id: e.team_event_away_team_idToteam!.id, name: e.team_event_away_team_idToteam!.name } } : null, dataOrigin: e.origin, updatedAt: e.updated_at.toISOString() };
}
@Injectable()
export class Catalog {
 constructor(private readonly db: Database) {}
 options() { return { contractVersion: '0.1.0-draft.2', categories: CATEGORIES, services: SERVICES, devices: DEVICES, countries: COUNTRIES, timeZones: TIME_ZONES, queryDefaults: { country: 'KR', timeZone: 'Asia/Seoul' }, newAccountDefaults: { version: '1', country: 'KR', timeZone: 'Asia/Seoul', enabledCategories: ['movie', 'ott'], services: [], devices: [], view: 'calendar' } }; }
 private conditions(q: Q) {
  const kinds = Object.entries(KIND_CATEGORY).filter(([, c]) => q.categories.includes(c)).map(([k]) => Prisma.sql`${k}::event_kind`);
  const clauses = [Prisma.sql`e.kind IN (${Prisma.join(kinds)})`, Prisma.sql`(e.kind = 'epl_match' OR e.release_market IN (${q.country}, 'WORLD'))`];
  if (q.contentId) clauses.push(Prisma.sql`e.content_id = ${q.contentId}::uuid`);
  if (q.services.length) clauses.push(Prisma.sql`(e.kind <> 'ott_season_premiere' OR EXISTS (SELECT 1 FROM event_service s WHERE s.event_id=e.id AND s.service IN (${Prisma.join(q.services.map(s => Prisma.sql`${s}::ott_service`))})))`);
  if (q.devices.length) clauses.push(Prisma.sql`(e.kind <> 'game_release' OR EXISTS (SELECT 1 FROM event_device d WHERE d.event_id=e.id AND d.device IN (${Prisma.join(q.devices.map(d => Prisma.sql`${d}::game_device`))})))`);
  if (q.schedule === 'undated') clauses.push(Prisma.sql`e.precision='unknown' AND (e.announced_year IS NULL OR e.announced_year>=2026)`);
  else {
   const start = DateTime.fromISO(q.from!, { zone: q.zone }).toUTC().toJSDate(); const end = DateTime.fromISO(q.to!, { zone: q.zone }).toUTC().toJSDate();
   clauses.push(Prisma.sql`((e.precision='date_only' AND e.local_date>=${q.from}::date AND e.local_date<${q.to}::date) OR (e.precision='instant' AND e.instant_at>=${start} AND e.instant_at<${end}))`);
  }
  return Prisma.join(clauses, ' AND ');
 }
 private base(q: Q) { return Prisma.sql`SELECT e.id, CASE WHEN e.precision='date_only' THEN to_char(e.local_date, 'YYYY-MM-DD') WHEN e.precision='instant' THEN to_char(e.instant_at AT TIME ZONE ${q.zone}, 'YYYY-MM-DD') ELSE '' END AS sort_day, CASE WHEN e.precision='instant' THEN 1 ELSE 0 END AS sort_rank, CASE WHEN e.precision='instant' THEN to_char(e.instant_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US') ELSE '' END AS sort_time FROM event e WHERE ${this.conditions(q)}`; }
 private fingerprint(q: Q) { const { cursor, revision, ...rest } = q; return JSON.stringify(rest); }
 private encode(q: Q, version: string, row: KeyRow) { const payload = Buffer.from(JSON.stringify({ filter: this.fingerprint(q), version, key: row, expires: Date.now() + 15 * 60 * 1000 })).toString('base64url'); const signature = createHmac('sha256', runtimeConfig().cursorKey).update(payload).digest('base64url'); return payload + '.' + signature; }
 private decode(q: Q): { version: string; key: KeyRow } | null {
  if (!q.cursor) return null;
  try {
   const [payload, signature, extra] = q.cursor.split('.'); if (!payload || !signature || extra) throw new Error();
   const expected = createHmac('sha256', runtimeConfig().cursorKey).update(payload).digest(); const actual = Buffer.from(signature, 'base64url');
   if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) throw new Error();
   const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { filter: string; version: string; key: KeyRow; expires: number };
   if (data.filter !== this.fingerprint(q) || data.expires < Date.now() || (q.revision && q.revision !== data.version)) throw new Error();
   return data;
  } catch { throw new BadRequestException({ code: 'INVALID_CURSOR', message: '목록을 처음부터 다시 조회하세요.' }); }
 }
 private async snapshot<T>(q: Q, fn: (tx: Tx, version: string) => Promise<T>): Promise<T> {
  return this.db.$transaction(async tx => { const current = await tx.catalog_state.findUniqueOrThrow({ where: { singleton: true } }); const version = current.revision.toString(); if (q.revision && q.revision !== version) throw new ConflictException({ code: 'CATALOG_CHANGED', message: '일정이 갱신되어 다시 조회해야 합니다.' }); return fn(tx, version); }, { isolationLevel: 'RepeatableRead' });
 }
 private async freshness(tx: Tx, q: Q) {
  const scopes = await tx.collection_scope.findMany({ where: { category: { in: q.categories as ('movie' | 'ott' | 'game' | 'epl')[] } }, include: { provider: true }, orderBy: [{ provider_key: 'asc' }, { category: 'asc' }] });
  const selected = new Map<string, (typeof scopes)[number]>();
  for (const scope of scopes) { const key = scope.provider_key + ':' + scope.category; const prior = selected.get(key); if (!prior || scope.category === 'epl' || scope.scope_market === q.country || (scope.scope_market === 'WORLD' && prior.scope_market !== q.country)) selected.set(key, scope); }
  return [...selected.values()].map(s => { const matches = s.category === 'epl' || [q.country, 'WORLD'].includes(s.scope_market); return { providerKey: s.provider_key, category: s.category, scopeCountry: s.category === 'epl' ? null : q.country, coverage: matches ? s.coverage : 'unsupported', lastAttemptStatus: matches ? s.last_attempt_status : 'never', lastAttemptAt: matches ? iso(s.last_attempt_at) : null, lastSuccessfulAt: matches ? iso(s.last_successful_at) : null, dataOrigin: s.provider.origin }; });
 }
 async events(raw: Record<string, unknown>) {
  const q = parse(raw, false); const after = this.decode(q); if (after) q.revision = after.version;
  return this.snapshot(q, async (tx, version) => {
   const seek = after ? (q.schedule === 'undated' ? Prisma.sql`WHERE id > ${after.key.id}::uuid` : Prisma.sql`WHERE (sort_day, sort_rank, sort_time, id) > (${after.key.sort_day}, ${after.key.sort_rank}, ${after.key.sort_time}, ${after.key.id}::uuid)`) : Prisma.empty;
   const order = q.schedule === 'undated' ? Prisma.sql`id` : Prisma.sql`sort_day, sort_rank, sort_time, id`;
   const keys = await tx.$queryRaw<KeyRow[]>(Prisma.sql`WITH selected AS (${this.base(q)}) SELECT * FROM selected ${seek} ORDER BY ${order} LIMIT ${q.limit + 1}`);
   const shown = keys.slice(0, q.limit); const rows = await tx.event.findMany({ where: { id: { in: shown.map(r => r.id) } }, include: includes }); const byId = new Map(rows.map(r => [r.id, r]));
   return { catalogRevision: version, items: shown.map(k => serialize(byId.get(k.id)!, q.zone)), nextCursor: keys.length > q.limit ? this.encode(q, version, shown[shown.length - 1]!) : null, freshness: await this.freshness(tx, q) };
  });
 }
 async calendar(raw: Record<string, unknown>) {
  const q = parse(raw, true);
  return this.snapshot(q, async (tx, version) => {
   const keys = await tx.$queryRaw<(KeyRow & { day_total: bigint })[]>(Prisma.sql`WITH selected AS (${this.base(q)}), ranked AS (SELECT *, count(*) OVER(PARTITION BY sort_day) AS day_total, row_number() OVER(PARTITION BY sort_day ORDER BY sort_rank, sort_time, id) AS rn FROM selected) SELECT id, sort_day, sort_rank, sort_time, day_total FROM ranked WHERE rn<=2 ORDER BY sort_day, sort_rank, sort_time, id`);
   const rows = await tx.event.findMany({ where: { id: { in: keys.map(k => k.id) } }, include: includes }); const byId = new Map(rows.map(r => [r.id, r]));
   const first = DateTime.fromISO(q.from!, { zone: q.zone }); const days = Array.from({ length: first.daysInMonth! }, (_, i) => { const date = first.plus({ days: i }).toISODate()!; const selected = keys.filter(k => k.sort_day === date); return { date, total: Number(selected[0]?.day_total ?? 0), previews: selected.map(k => serialize(byId.get(k.id)!, q.zone)) }; });
   return { month: q.month, catalogRevision: version, days, freshness: await this.freshness(tx, q) };
  });
 }
 async detail(eventId: string, zone = 'Asia/Seoul') {
  id(eventId); if (!validZone(zone) || !TIME_ZONES.includes(zone)) bad('timeZone');
  return this.db.$transaction(async tx => {
   const row = await tx.event.findUnique({ where: { id: eventId }, include: { ...includes, event_source: true, event_change: false } });
   if (!row) throw new NotFoundException({ code: 'NOT_FOUND', message: '일정을 찾을 수 없습니다.' });
   const history = await tx.$queryRaw<{ before_value: { time?: { type: string; value?: string; sourceTimeZone?: string | null } } }[]>(Prisma.sql`SELECT before_value FROM event_change WHERE event_id=${eventId}::uuid AND before_value->'time' IS DISTINCT FROM after_value->'time' AND before_value->'time'->>'type' IN ('instant', 'date_only') ORDER BY catalog_revision DESC LIMIT 1`);
   const previous = history[0]?.before_value ?? null;
   const p = previous?.time; let previousTime = null;
   if (p?.type === 'instant' && p.value) previousTime = timeOf({ precision: 'instant', instant_at: new Date(p.value), local_date: null, source_time_zone: p.sourceTimeZone ?? null, announced_year: null, announced_period: null }, zone);
   if (p?.type === 'date_only' && p.value) previousTime = { type: 'date_only', date: p.value };
   return { event: serialize(row, zone), sources: row.event_source.map(s => ({ providerKey: s.provider_key, url: s.source_url, observedAt: s.observed_at.toISOString(), sourceUpdatedAt: iso(s.source_updated_at) })), previousTime };
  }, { isolationLevel: 'RepeatableRead' });
 }
 async content(contentId: string) {
  id(contentId); const row = await this.db.content.findUnique({ where: { id: contentId }, include: { drama_season: { orderBy: { season_number: 'asc' } } } });
  if (!row) throw new NotFoundException({ code: 'NOT_FOUND', message: '작품을 찾을 수 없습니다.' });
  return { id: row.id, kind: row.kind, title: row.title, originalTitle: row.original_title, posterUrl: row.poster_url, synopsis: row.synopsis, seasons: row.drama_season.map(s => ({ id: s.id, number: s.season_number })) };
 }
}
