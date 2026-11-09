import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ProviderAdapter, Scope } from '../domain';
import { KIND_CATEGORY } from '../config';
export class FixtureAdapter implements ProviderAdapter {
 readonly key = 'fixture'; readonly name = '가상 일정 로컬 어댑터'; readonly origin = 'fixture' as const;
 readonly scopes: Scope[] = [{ category: 'movie', market: 'KR' }, { category: 'ott', market: 'KR' }, { category: 'game', market: 'KR' }, { category: 'epl', market: 'WORLD' }];
 async fetch(scope: Scope): Promise<unknown[]> {
  const raw: unknown = JSON.parse(await readFile(resolve(process.cwd(), 'data/fixtures/provider.json'), 'utf8'));
  if (!Array.isArray(raw)) throw new Error('INVALID_FIXTURE_BATCH');
  for (const x of raw) if (!x || typeof x !== 'object' || !Object.hasOwn(KIND_CATEGORY, x.kind)) throw new Error('INVALID_FIXTURE_KIND');
  return raw.filter(x => KIND_CATEGORY[x.kind as keyof typeof KIND_CATEGORY] === scope.category);
 }
}
