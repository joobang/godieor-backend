#!/usr/bin/env node
// Read-only evaluation. Competitor rows are evaluation labels, never discovery seeds.
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

export function auditParityCauses(reference, discovery) {
  if (!Array.isArray(reference?.rows) || !Array.isArray(discovery?.rows)) throw new Error('INVALID_AUDIT_INPUT');
  const key = (r) => [r.date, r.platform, r.title, r.season ?? r.seasonNumber ?? ''].join('\u0000');
  const byKey = new Map(discovery.rows.map(r => [key(r), r]));
  const rows = reference.rows.map(row => {
    const candidate = byKey.get(key(row));
    if (!candidate) throw new Error(`MISSING_DISCOVERY_EVALUATION:${row.title}`);
    const evidence = row.candidateMatches ?? [];
    const category = row.status === 'published_match' ? 'published_match'
      : row.status === 'date_disagreement' ? 'published_date_conflict'
      : candidate.candidateStatus === 'not_discovered' ? 'tmdb_season_not_discovered'
      : candidate.candidateStatus === 'candidate_platform_unverified' ? 'target_platform_unverified'
      : !evidence.length ? 'candidate_not_linked'
      : evidence.some(c => c.verification === 'date_conflict') ? 'tmdb_official_date_conflict'
      : evidence.some(c => c.platformEvidence === 'tmdb_series_provider_hint_only') ? 'series_provider_only'
      : evidence.some(c => c.platformEvidence === 'tmdb_season_or_movie_provider') ? 'season_or_movie_provider_only'
      : 'official_publish_evidence_incomplete';
    return { date: row.date, platform: row.platform, title: row.title, season: row.season,
      publication: row.status, discovery: candidate.candidateStatus,
      category, candidateIds: evidence.map(e => e.id) };
  });
  const counts = Object.fromEntries([...new Set(rows.map(r => r.category))].sort().map(category =>
    [category, rows.filter(r => r.category === category).length]));
  return { referenceTotal: rows.length, publishedMatches: rows.filter(r => r.publication === 'published_match').length,
    candidateDiscoveryMatches: rows.filter(r => r.discovery === 'candidate_platform_date_match').length,
    counts, rows, caveat: 'Reference data used only for retrospective evaluation. TMDB availability is not an OTT premiere.' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [refPath, discoveredPath, outputPath] = process.argv.slice(2);
  if (!refPath || !discoveredPath) throw new Error('USAGE: audit-tmdb-parity-causes.mjs <comparison.json> <candidate-recall.json> [output.json]');
  const result = auditParityCauses(JSON.parse(await readFile(refPath, 'utf8')),
    JSON.parse(await readFile(discoveredPath, 'utf8')));
  if (outputPath) await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify({ referenceTotal: result.referenceTotal, publishedMatches: result.publishedMatches,
    candidateDiscoveryMatches: result.candidateDiscoveryMatches, counts: result.counts }, null, 2));
}
