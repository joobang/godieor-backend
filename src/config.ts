import { DateTime, IANAZone } from 'luxon';
export const CATEGORIES = ['movie', 'ott', 'game', 'epl'] as const;
export const SERVICES = ['netflix', 'disney_plus', 'coupang_play', 'tving'] as const;
export const DEVICES = ['pc', 'playstation', 'xbox', 'switch'] as const;
export const TIME_ZONES = [...new Set(['UTC', ...Intl.supportedValuesOf('timeZone')])];
export const COUNTRIES = ['KR', 'US', 'GB', 'JP'] as const;
export const KIND_CATEGORY = { theatrical_release: 'movie', ott_season_premiere: 'ott', game_release: 'game', epl_match: 'epl' } as const;
function required(name: string): string { const value = process.env[name]; if (!value) throw new Error(`필수 환경 변수 누락: ${name}`); return value; }
export function runtimeConfig() {
  const databaseUrl = required('DATABASE_URL');
  try { const u = new URL(databaseUrl); if (!['postgres:', 'postgresql:'].includes(u.protocol)) throw new Error(); } catch { throw new Error('DATABASE_URL 형식 오류'); }
  const cursorKey = required('CURSOR_SIGNING_KEY');
  if (Buffer.byteLength(cursorKey) < 32 || cursorKey.startsWith('replace-')) throw new Error('CURSOR_SIGNING_KEY 설정 필요');
  const port = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT 설정 오류');
  return { databaseUrl, cursorKey, port, host: process.env.API_HOST ?? '127.0.0.1', schedule: process.env.COLLECTION_SCHEDULE_ENABLED === 'true' };
}
export function validZone(zone: string) { return IANAZone.isValidZone(zone) || zone === 'UTC'; }
export function iso(date: Date | null) { return date?.toISOString() ?? null; }
export function calendarDate(date: Date) { return DateTime.fromJSDate(date, { zone: 'utc' }).toISODate()!; }
