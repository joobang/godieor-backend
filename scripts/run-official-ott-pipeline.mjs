#!/usr/bin/env node
// Refresh official KR sources, TMDB evidence, the durable review queue and the
// local published snapshot. The reference comparison is an output only.
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { prepareReviewed } from '../dist/src/reviewed-ott/domain/reviewed-mapping.js';

const node = process.execPath;
const bindings = 'data/curated/ott-official-tmdb-bindings-2026-11-13.json';
const mappings = 'data/curated/ott-reviewed-mappings.json';

export async function runStep(args, { env = process.env, acceptedExitCodes = [0] } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(node, args, { env, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => acceptedExitCodes.includes(code) ? resolve(JSON.stringify({ exitCode: code, stdout: stdout.trim() })) :
      reject(new Error(`${args[0]} exit=${code}; ${stderr.trim().slice(-1200)}`)));
  });
}

// Parity exit 2 is an audit result. Preserve it as data rather than turning a
// successful publish into a failed job. Other nonzero exits remain failures.
export async function runAudit(args, { env = process.env } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(node, args, { env, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0 && code !== 2) return reject(new Error(`AUDIT_FAILED exit=${code}; ${stderr.slice(-1200)}`));
      try { resolve({ exitCode: code, ...JSON.parse(stdout) }); }
      catch { reject(new Error(`AUDIT_INVALID_REPORT exit=${code}; ${stderr.slice(-1200)}`)); }
    });
  });
}

export function publicationGate(state, mappingInput, tmdbReport) {
  const records = prepareReviewed(mappingInput, state);
  if (!tmdbReport || tmdbReport.referenceInputUsed !== false || !Array.isArray(tmdbReport.rows))
    throw new Error('INVALID_TMDB_REPORT');
  const boundCandidates = new Set(mappingInput.mappings.map((m) => m.candidateId));
  const readyUnmapped = tmdbReport.rows.filter((r) => r.readyForBatchReview &&
    r.officialEvidence?.some((o) => o.reviewCandidateId && !boundCandidates.has(o.reviewCandidateId)));
  return { reviewedMappings: records.length, readyUnmapped: readyUnmapped.map((r) => r.id),
    officialAndTmdbReady: tmdbReport.rows.filter((r) => r.readyForBatchReview).length,
    discoveryComplete: tmdbReport.discoveryComplete, tmdbErrors: tmdbReport.errors.length };
}

export async function runPipeline({ publish = true, reuseRecentTmdb = false, run = runStep, read = readFile,
  auditRun = runAudit, fileStat = stat } = {}) {
  const temporary = await mkdtemp(join(tmpdir(), 'godieor-official-pipeline-'));
  const steps = [];
  async function step(label, args, acceptedExitCodes = [0]) {
    const output = await run(args, { acceptedExitCodes });
    const parsed = JSON.parse(output);
    steps.push({ label, exitCode: parsed.exitCode, output: parsed.stdout.slice(-1000) });
    return parsed.exitCode;
  }
  try {
    const netflix = join(temporary, 'netflix.json');
    const tving = join(temporary, 'tving.json');
    const tvingAds = join(temporary, 'tving-ads.json');
    await step('netflix_official', ['scripts/collect-netflix-kr-schedule.mjs', netflix]);
    await step('netflix_staging', ['scripts/bridge-netflix-lineup.mjs', netflix]);
    if (reuseRecentTmdb) {
      const snapshot = 'work/tmdb-release-candidates/latest.json';
      const [saved, metadata] = await Promise.all([read(snapshot, 'utf8').then(JSON.parse), fileStat(snapshot)]);
      if (saved.kind !== 'tmdb-first-ott-release-review' || saved.referenceInputUsed !== false ||
          !Array.isArray(saved.rows) || !Array.isArray(saved.discoveryCoverage) ||
          Date.now() - metadata.mtimeMs > 60 * 60 * 1000 || metadata.mtimeMs > Date.now() + 60000)
        throw new Error('TMDB_RECENT_SNAPSHOT_UNAVAILABLE');
      steps.push({ label: 'tmdb_recent_snapshot_reused', snapshot,
        ageMinutes: Math.round((Date.now() - metadata.mtimeMs) / 60000), total: saved.total,
        discoveryComplete: saved.discoveryComplete, errors: saved.errors?.length });
    } else {
      await step('tmdb_official_crosscheck', ['--env-file=.env', 'scripts/collect-tmdb-release-candidates.mjs', 'work/tmdb-release-candidates', bindings], [0, 2]);
    }
    const tvingExit = await step('tving_official_tmdb', ['--env-file=.env', 'scripts/collect-tving-upcoming.mjs', tving], [0, 2]);
    // An incomplete official report cannot be staged; preserve the existing queue.
    if (tvingExit === 0) await step('tving_staging', ['scripts/bridge-tving-upcoming.mjs', tving]);
    // The Ads schedule covers TVING and Wavve together. Keep its dates in the
    // review queue; they cannot independently establish a TVING KR premiere.
    const adsExit = await step('tving_ads_official', ['scripts/collect-tvingads-kr-lineup.mjs', tvingAds], [0, 1]);
    if (adsExit === 0) await step('tving_ads_staging', ['scripts/stage-ott-lineup.mjs', tvingAds, 'work/ott-lineups']);
    // Assign opaque keys to newly reviewed source candidates before reading the
    // publication snapshot. Unreviewed TMDB hints remain outside publication.
    await step('complete_reviewed_mappings', ['scripts/complete-reviewed-mappings.mjs']);
    const [state, mappingInput, report] = await Promise.all([
      read('work/ott-candidates/state.json', 'utf8').then(JSON.parse),
      read(mappings, 'utf8').then(JSON.parse),
      read('work/tmdb-release-candidates/latest.json', 'utf8').then(JSON.parse),
    ]);
    const gate = publicationGate(state, mappingInput, report);
    // A missing provider-coverage slice cannot invalidate 70 already reviewed
    // publications. It *does* prevent a claim of complete discovery/parity.
    if (publish) await step('publish_reviewed', ['--env-file=.env', 'dist/src/cli/publish-reviewed.js', '--file', mappings]);
    const audit = publish ? await auditRun(['--env-file=.env', 'scripts/audit-current-first-premieres.mjs']) : null;
    return {
      status: tvingExit !== 0 || adsExit !== 0 || !gate.discoveryComplete || gate.tmdbErrors || gate.readyUnmapped.length || (audit && !audit.parity)
        ? 'published_with_discovery_gaps' : publish ? 'published_and_audited' : 'validated_without_publish',
      gate, steps, published: publish, audit: audit && { referenceRows: audit.referenceRows,
        exactMatches: audit.exactMatches, unresolved: audit.unresolved, statusCounts: audit.statusCounts,
        parity: audit.parity },
    };
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

if (process.argv[1]?.endsWith('/run-official-ott-pipeline.mjs')) {
  try {
    const report = await runPipeline({ publish: !process.argv.includes('--no-publish'),
      reuseRecentTmdb: process.argv.includes('--reuse-recent-tmdb') });
    console.log(JSON.stringify(report, null, 2));
    if (report.status === 'published_with_discovery_gaps') process.exitCode = 2;
  } catch (e) {
    console.error('OFFICIAL_OTT_PIPELINE_FAILED:', e.message);
    process.exitCode = 1;
  }
}
