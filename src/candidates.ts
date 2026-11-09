import { createHash, randomUUID } from 'node:crypto';
import { mkdir, open, readFile, rename, unlink, lstat } from 'node:fs/promises';
import { join } from 'node:path';
import { DateTime } from 'luxon';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { z } from 'zod';

export const SOURCES = {
 netflix: { host: 'about.netflix.com', feed: 'https://about.netflix.com/ko/feed.xml' },
 coupang: { host: 'news.coupang.com', feed: 'https://news.coupang.com/feed/' },
 cj: { host: 'cjnews.cj.net', feed: 'https://cjnews.cj.net/feed/' },
 disney: { host: 'www.disneyplus.com', feed: null },
} as const;
const sourceSchema = z.enum(['netflix', 'coupang', 'cj', 'disney']);
type Source = z.infer<typeof sourceSchema>;
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const stamp = z.iso.datetime({ offset: true });
const shortText = z.string().min(1).max(500);
export const reviewSchema = z.object({
 id: digest, revision: digest, reviewer: z.string().min(1).max(100),
 title: shortText, platform: z.enum(['netflix', 'disney_plus', 'coupang_play', 'tving']).nullable(),
 market: z.string().regex(/^[A-Z]{2}$/).nullable(), contentKind: z.enum(['drama', 'other', 'unknown']),
 premiereConfirmed: z.boolean(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
 localTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable(),
 timeZone: z.string().max(100).nullable(), seasonNumber: z.number().int().positive().nullable(),
 announcedYear: z.number().int().min(1900).max(9999).nullable(), announcedPeriod: z.string().max(100).nullable(),
 evidence: shortText,
}).strict().superRefine((r, ctx) => {
 if (r.date && (!DateTime.fromISO(r.date).isValid || DateTime.fromISO(r.date).toISODate() !== r.date)) ctx.addIssue({ code: 'custom', message: 'INVALID_DATE' });
 if (r.timeZone && !DateTime.now().setZone(r.timeZone).isValid) ctx.addIssue({ code: 'custom', message: 'INVALID_TIME_ZONE' });
 if (r.timeZone && !r.localTime) ctx.addIssue({ code: 'custom', message: 'TIME_ZONE_WITHOUT_TIME' });
 if (r.localTime && !r.date) ctx.addIssue({ code: 'custom', message: 'TIME_WITHOUT_DATE' });
 if (r.date && r.announcedYear !== null && Number(r.date.slice(0, 4)) !== r.announcedYear) ctx.addIssue({ code: 'custom', message: 'YEAR_CONFLICT' });
});
export type Review = z.infer<typeof reviewSchema>;
const revisionSchema = z.object({ token: digest, hash: digest, observedAt: stamp, headline: shortText, publishedRaw: z.string().max(200).nullable(), publishedAt: stamp.nullable() }).strict();
const candidateSchema = z.object({
 id: digest, source: sourceSchema, url: z.string().max(2000), firstSeenAt: stamp, lastSeenAt: stamp,
 revisions: z.array(revisionSchema).min(1), review: z.object({ value: reviewSchema, reviewedAt: stamp }).strict().nullable(),
}).strict();
export type Candidate = z.infer<typeof candidateSchema>;
const stateSchema = z.object({ version: z.literal(2), stage: z.literal('candidate-not-published'),
 candidates: z.array(candidateSchema), attempts: z.record(z.string(), z.object({ at: stamp, status: z.enum(['succeeded', 'failed']), discovered: z.number().int().nonnegative(), error: z.string().nullable() }).strict()),
}).strict();
export type State = z.infer<typeof stateSchema>;
const legacyStateSchema = stateSchema.extend({ version: z.literal(1), candidates: z.array(candidateSchema.extend({ revisions: z.array(revisionSchema.omit({ token: true })).min(1) })) });
const upgradedStates = new WeakSet<State>();
export type Discovery = { source: Source; url: string; headline: string; publishedRaw: string | null; publishedAt: string | null; contentHash: string };
export const hash = (text: string): string => createHash('sha256').update(text).digest('hex');
export function canonicalUrl(source: Source, text: string): string {
 const url = new URL(text);
 if (url.protocol !== 'https:' || url.hostname !== SOURCES[source].host || url.port || url.username || url.password) throw new Error('UNTRUSTED_SOURCE_URL');
 for (const key of [...url.searchParams.keys()]) {
  if (key.startsWith('utm_') || key === 'msockid') url.searchParams.delete(key);
  else if (!(source === 'cj' && key === 'p' && /^\d+$/.test(url.searchParams.get(key)!))) throw new Error('UNEXPECTED_SOURCE_QUERY');
 }
 url.hash = '';
 return url.toString();
}
export function publishedDate(raw: string | null): string | null {
 if (!raw) return null;
 const ko = /^(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일$/.exec(raw.trim());
 const dt = ko ? DateTime.fromObject({ year: Number(ko[1]), month: Number(ko[2]), day: Number(ko[3]) }, { zone: 'Asia/Seoul' }) : DateTime.fromRFC2822(raw, { setZone: true });
 return dt.isValid ? dt.toUTC().toISO() : null;
}
export function parseFeed(source: Source, xml: string): Discovery[] {
 if (/<!DOCTYPE|<!ENTITY/i.test(xml) || Buffer.byteLength(xml) > 2_000_000) throw new Error('UNSAFE_XML');
 if (XMLValidator.validate(xml) !== true) throw new Error('INVALID_XML');
 const document = new XMLParser({ ignoreAttributes: true, parseTagValue: false, processEntities: true, trimValues: true }).parse(xml);
 if (!document?.rss?.channel || typeof document.rss.channel !== 'object') throw new Error('NOT_RSS');
 const raw = document.rss.channel.item;
 const items = raw === undefined ? [] : Array.isArray(raw) ? raw : [raw];
 if (items.length > 500) throw new Error('TOO_MANY_ITEMS');
 const entries = new Map<string, Discovery>();
 for (const item of items) {
  const headline = shortText.parse(item.title);
  const url = canonicalUrl(source, z.string().parse(item.link));
  const rawDate = item.pubDate === undefined ? null : z.string().max(200).parse(item.pubDate);
  const description = [item.description, item['content:encoded']].filter(x => typeof x === 'string').join('\n');
  // Keep a fingerprint, not article bodies/images or inferred release dates.
  const contentHash = hash(JSON.stringify([headline, rawDate, description]));
  const prior = entries.get(url);
  if (prior && prior.contentHash !== contentHash) throw new Error('CONFLICTING_DUPLICATE_ITEM');
  entries.set(url, { source, url, headline, publishedRaw: rawDate, publishedAt: publishedDate(rawDate), contentHash });
 }
 return [...entries.values()];
}
export function merge(state: State, entries: Discovery[], now: string): void {
 for (const entry of entries) {
  const id = hash(entry.source + '\n' + entry.url);
  let candidate = state.candidates.find(x => x.id === id);
  if (!candidate) { candidate = { id, source: entry.source, url: entry.url, firstSeenAt: now, lastSeenAt: now, revisions: [], review: null }; state.candidates.push(candidate); }
  candidate.lastSeenAt = now;
  if (candidate.revisions.at(-1)?.hash !== entry.contentHash) {
   candidate.revisions.push({ token: hash(candidate.id + '\n' + (candidate.revisions.length + 1) + '\n' + entry.contentHash), hash: entry.contentHash, observedAt: now, headline: entry.headline, publishedRaw: entry.publishedRaw, publishedAt: entry.publishedAt });
   candidate.review = null;
  }
 }
}
export function eligibility(candidate: Candidate): string[] {
 const review = candidate.review?.value;
 if (!review || review.revision !== candidate.revisions.at(-1)!.token) return ['needs_review'];
 const reasons: string[] = [];
 if (!review.date) reasons.push('missing_exact_date');
 else if (review.date < '2026-01-01') reasons.push('before_2026');
 if (!review.platform) reasons.push('unconfirmed_platform');
 if (!review.market) reasons.push('unconfirmed_market');
 if (review.contentKind !== 'drama') reasons.push('not_confirmed_drama');
 if (!review.premiereConfirmed) reasons.push('not_confirmed_premiere');
 return reasons;
}
export function applyReview(state: State, value: unknown, now: string): void {
 const review = reviewSchema.parse(value);
 const candidate = state.candidates.find(x => x.id === review.id);
 if (!candidate) throw new Error('CANDIDATE_NOT_FOUND');
 if (candidate.revisions.at(-1)!.token !== review.revision) throw new Error('STALE_REVIEW');
 candidate.review = { value: review, reviewedAt: now };
}
export function reviewedExport(state: State): unknown[] {
 return state.candidates.filter(x => eligibility(x).length === 0).map(candidate => ({
  sourceUrl: candidate.url, sourceRevision: candidate.revisions.at(-1)!.token,
  ...candidate.review!.value, reviewedAt: candidate.review!.reviewedAt,
  // No inferred season, timezone or UTC midnight. These are still review inputs, not product events.
  precision: candidate.review!.value.localTime && candidate.review!.value.timeZone ? 'local_datetime' : 'date_only',
 }));
}

export async function readState(directory: string): Promise<State> {
 let raw: string;
 try { raw = await readFile(join(directory, 'state.json'), 'utf8'); }
 catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { version: 2, stage: 'candidate-not-published', candidates: [], attempts: {} }; throw error; }
 const input: unknown = JSON.parse(raw);
 let state: State;
 if ((input as { version?: unknown })?.version === 1) {
  const legacy = legacyStateSchema.parse(input);
  state = stateSchema.parse({ ...legacy, version: 2, candidates: legacy.candidates.map(candidate => ({
   ...candidate, review: null,
   revisions: candidate.revisions.map((revision, index) => ({ ...revision, token: hash(candidate.id + '\n' + (index + 1) + '\n' + revision.hash) })),
  })) });
  upgradedStates.add(state);
 } else state = stateSchema.parse(input);
 const ids = new Set<string>();
 for (const candidate of state.candidates) {
  if (canonicalUrl(candidate.source, candidate.url) !== candidate.url || hash(candidate.source + '\n' + candidate.url) !== candidate.id || ids.has(candidate.id)) throw new Error('INVALID_STORED_ID');
  ids.add(candidate.id);
  if (candidate.review && (candidate.review.value.id !== candidate.id || candidate.review.value.revision !== candidate.revisions.at(-1)!.token)) throw new Error('INVALID_STORED_REVIEW');
 }
 return state;
}
export async function atomicWrite(directory: string, filename: string, value: unknown): Promise<void> {
 const target = join(directory, filename);
 try { if ((await lstat(target)).isSymbolicLink()) throw new Error('SYMLINK_TARGET'); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
 const temporary = target + '.' + randomUUID() + '.tmp';
 const handle = await open(temporary, 'wx', 0o600);
 try { await handle.writeFile(JSON.stringify(value, null, 2) + '\n'); await handle.sync(); }
 finally { await handle.close(); }
 try { await rename(temporary, target); } catch (error) { await unlink(temporary).catch(() => {}); throw error; }
}
export async function invalidateExport(directory: string): Promise<void> {
 try { await unlink(join(directory, 'reviewed.json')); }
 catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
}
export async function transaction<T>(directory: string, action: (state: State) => Promise<T>, invalidatesExport = true): Promise<T> {
 await mkdir(directory, { recursive: true });
 if ((await lstat(directory)).isSymbolicLink()) throw new Error('SYMLINK_DIRECTORY');
 const lockPath = join(directory, 'writer.lock');
 const lock = await open(lockPath, 'wx', 0o600);
 try {
  const state = await readState(directory);
  if (invalidatesExport || upgradedStates.has(state)) await invalidateExport(directory);
  const result = await action(state);
  await atomicWrite(directory, 'state.json', state); return result;
 }
 finally { await lock.close(); await unlink(lockPath); }
}

// Match the current honest user-agent against robots groups; do not impersonate an allowed bot.
export function robotsAllows(text: string, path: string): boolean {
 if (text.includes('<html') || text.length > 100_000) return false;
 const groups: { agents: string[]; rules: { allow: boolean; path: string }[] }[] = [];
 let group = { agents: [] as string[], rules: [] as { allow: boolean; path: string }[] };
 for (const line of text.split(/\r?\n/)) {
  const match = /^\s*([\w-]+)\s*:\s*([^#]*)/.exec(line);
  if (!match) continue;
  const key = match[1]!.toLowerCase(), value = match[2]!.trim();
  if (key === 'user-agent') {
   if (group.rules.length) { groups.push(group); group = { agents: [], rules: [] }; }
   group.agents.push(value.toLowerCase());
  } else if ((key === 'allow' || key === 'disallow') && group.agents.length && value) group.rules.push({ allow: key === 'allow', path: value });
 }
 groups.push(group);
 const specificity = (g: typeof group) => Math.max(-1, ...g.agents.map(a => a === '*' ? 0 : 'godieor-candidates'.startsWith(a) ? a.length : -1));
 const longest = Math.max(0, ...groups.map(specificity));
 const rules = groups.filter(g => specificity(g) === longest).flatMap(g => g.rules).filter(rule => {
  const regex = '^' + rule.path.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$/, '$');
  return new RegExp(regex).test(path);
 }).sort((a, b) => b.path.replace(/\*/g, '').length - a.path.replace(/\*/g, '').length || Number(b.allow) - Number(a.allow));
 return rules[0]?.allow ?? true;
}
type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;
export async function fetchText(url: string, fetcher: Fetcher = fetch): Promise<string> {
 const response = await fetcher(url, { redirect: 'error', signal: AbortSignal.timeout(20_000), headers: { 'user-agent': 'GODIEOR-candidates/0.1 (public RSS candidate discovery)', accept: 'application/rss+xml, application/xml, text/xml, text/plain' } });
 if (!response.ok) throw new Error('HTTP_' + response.status);
 if (!response.body) throw new Error('EMPTY_RESPONSE');
 const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let bytes = 0;
 try { for (;;) { const part = await reader.read(); if (part.done) break; bytes += part.value.byteLength; if (bytes > 2_000_000) throw new Error('RESPONSE_TOO_LARGE'); chunks.push(part.value); } }
 finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
 return Buffer.concat(chunks).toString('utf8');
}
export async function collectFeeds(state: State, now: string, fetcher: Fetcher = fetch): Promise<void> {
 for (const source of ['netflix', 'coupang', 'cj'] as const) {
  try {
   const feed = SOURCES[source].feed;
   const robots = await fetchText('https://' + SOURCES[source].host + '/robots.txt', fetcher);
   if (!robotsAllows(robots, new URL(feed).pathname)) throw new Error('ROBOTS_DISALLOWED');
   const entries = parseFeed(source, await fetchText(feed, fetcher));
   merge(state, entries, now);
   state.attempts[source] = { at: now, status: 'succeeded', discovered: entries.length, error: null };
  } catch (error) {
   const message = error instanceof Error ? error.message : '';
   const known = /^(HTTP_\d{3}|ROBOTS_DISALLOWED|UNSAFE_XML|INVALID_XML|NOT_RSS|TOO_MANY_ITEMS|RESPONSE_TOO_LARGE|CONFLICTING_DUPLICATE_ITEM|UNTRUSTED_SOURCE_URL|UNEXPECTED_SOURCE_QUERY)$/;
   state.attempts[source] = { at: now, status: 'failed', discovered: 0, error: known.test(message) ? message : 'FEED_UNAVAILABLE' };
  }
 }
}
