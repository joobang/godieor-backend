import { appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const providers = ['kobis', 'football_data_pl', 'igdb'];
const targets = new Map([
  ['all', { providers, ott: true }],
  ['kobis', { providers: ['kobis'] }],
  ['epl', { providers: ['football_data_pl'] }],
  ['igdb', { providers: ['igdb'] }],
  ['ott', { ott: true }],
  ...['WORLD', 'KR', 'JP', 'AU', 'NZ', 'CN', 'BR'].map(market =>
    ['igdb-' + market.toLowerCase(), { providers: ['igdb'], market }]),
]);

export function planCollection(event, mode, target) {
  if (event === 'schedule') return { daily: true, providers: [], market: '', ott: true };
  if (event !== 'workflow_dispatch' || !['daily', 'backfill'].includes(mode) || !targets.has(target))
    throw Error('INVALID_COLLECTION_SELECTION');
  if (mode === 'daily') {
    if (target !== 'all') throw Error('SELECT_BACKFILL_MODE_FOR_TARGET');
    return { daily: true, providers: [], market: '', ott: true };
  }
  const selected = targets.get(target);
  return { daily: false, providers: selected.providers ?? [], market: selected.market ?? '', ott: selected.ott ?? false };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const plan = planCollection(process.env.GITHUB_EVENT_NAME, process.env.COLLECTION_MODE,
      process.env.BACKFILL_TARGET || 'all');
    appendFileSync(process.env.GITHUB_OUTPUT,
      `daily=${plan.daily}\nproviders=${plan.providers.join(' ')}\nmarket=${plan.market}\nott=${plan.ott}\n`);
  } catch (error) {
    console.error('Collection selection failed:', error.message);
    process.exitCode = 1;
  }
}
