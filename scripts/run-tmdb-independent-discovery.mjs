#!/usr/bin/env node
// Stage 1: discover TMDB identities without StreamPick inputs or DB writes.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { createTmdbClient, discoverByDate, monthRange } from './tmdb-date-discovery.mjs';

const months = (process.env.GODIEOR_DISCOVERY_MONTHS ?? '2026-11,2026-12').split(',').map(s => s.trim());
const output = resolve(process.argv[2] ?? '/private/tmp/godieor-tmdb-independent-discovery.json');
const maxPages = Number(process.env.GODIEOR_DISCOVERY_MAX_PAGES ?? '100');
if (!months.length || months.some(m => !m) || !Number.isInteger(maxPages) || maxPages < 1 || maxPages > 500)
  throw new Error('INVALID_DISCOVERY_OPTIONS');
months.forEach(monthRange);

const request = createTmdbClient(fetch, process.env.TMDB_API_READ_ACCESS_TOKEN);
const discovered = await discoverByDate(request, months, { maxPages, includeKoreanUpcoming: true, includeUnmappedAiring: true });
const report = { kind: 'tmdb-independent-discovery', observedAt: new Date().toISOString(), months,
  maxPages, referenceInputUsed: false, ...discovered,
  discoveryComplete: discovered.coverage.every(c => !c.error && !c.truncated && c.reason !== 'provider_not_found') };
await mkdir(dirname(output), { recursive: true });
await writeFile(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ output, uniqueWorks: report.rows.length,
  discoveryComplete: report.discoveryComplete,
  errorCount: report.coverage.filter(c => c.error).length,
  truncatedCount: report.coverage.filter(c => c.truncated).length,
  missingProviders: report.coverage.filter(c => c.reason === 'provider_not_found').map(c => `${c.kind}:${c.service}`),
  unmappedUniqueWorks: report.rows.filter(r => r.discoveredBy?.includes('unmapped_air_date')).length }, null, 2));
