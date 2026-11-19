#!/usr/bin/env node
// Refresh official KR sources, TMDB evidence, the durable review queue and the
// local published snapshot. The reference comparison is an output only.
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { prepareReviewed } from '../dist/src/reviewed-ott/domain/reviewed-mapping.js';
import { collectionDiagnostic, COLLECTION_PHASES } from '../dist/src/common/collection-diagnostic.js';
import { configuredMonths } from './ott-schedule-window.mjs';

const node = process.execPath;
const bindings = 'data/curated/ott-official-tmdb-bindings-2026-11-13.json';
const mappings = 'data/curated/ott-reviewed-mappings.json';

// Child output may contain provider credentials or DB queries. Retain only typed diagnostics.
export function childFailure(args, code, stdout, stderr) {
  const command = args.find(arg => /^(scripts|dist)\/[a-zA-Z0-9_./-]+\.(mjs|js)$/.test(arg)) ?? 'child';
  const diagnostics = [];
  for (const line of [stdout, stderr, ...`${stdout}\n${stderr}`.split('\n')]) {
    try {
      const value = JSON.parse(line);
      for (const result of Array.isArray(value.results) ? value.results : [value]) {
        const diagnostic = collectionDiagnostic({ message: result.errorCode ?? result.code,
          code: result.causeCode });
        if (result.status === 'failed' || result.code) {
          const scope = {};
          if (['KR','WORLD','JP','AU','NZ','CN','BR'].includes(result.market)) scope.market = result.market;
          if (COLLECTION_PHASES.includes(result.phase)) scope.phase = result.phase;
          diagnostics.push({ ...diagnostic, ...scope });
        }
      }
    } catch { /* Unstructured output is deliberately not logged. */ }
  }
  return new Error(`${command} exit=${code}; ${JSON.stringify(diagnostics)}`);
}

export async function runStep(args, { env = process.env, acceptedExitCodes = [0] } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(node, args, { env, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', error => reject(new Error(`CHILD_START_FAILED ${JSON.stringify(collectionDiagnostic(error))}`)));
    child.on('close', (code) => acceptedExitCodes.includes(code) ? resolve(JSON.stringify({ exitCode: code, stdout: stdout.trim() })) :
      reject(childFailure(args, code, stdout, stderr)));
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
    child.on('error', error => reject(new Error(`CHILD_START_FAILED ${JSON.stringify(collectionDiagnostic(error))}`)));
    child.on('close', (code) => {
      if (code !== 0 && code !== 2) return reject(childFailure(args, code, stdout, stderr));
      try { resolve({ exitCode: code, ...JSON.parse(stdout) }); }
      catch { reject(new Error(`AUDIT_INVALID_REPORT exit=${code}`)); }
    });
  });
}

export function publicationGate(state, mappingInput, tmdbReport) {
  const records = prepareReviewed(mappingInput, state);
  if (!tmdbReport || tmdbReport.referenceInputUsed !== false || !Array.isArray(tmdbReport.rows))
    throw new Error('INVALID_TMDB_REPORT');
  const expectedMonths = configuredMonths();
  if (JSON.stringify(tmdbReport.months) !== JSON.stringify(expectedMonths))
    throw new Error('TMDB_REPORT_WRONG_WINDOW');
  const boundCandidates = new Set(mappingInput.mappings.map((m) => m.candidateId));
  const readyUnmapped = tmdbReport.rows.filter((r) => r.readyForBatchReview &&
    r.officialEvidence?.some((o) => o.reviewCandidateId && !boundCandidates.has(o.reviewCandidateId)));
  return { reviewedMappings: records.length, readyUnmapped: readyUnmapped.map((r) => r.id),
    officialAndTmdbReady: tmdbReport.rows.filter((r) => r.readyForBatchReview).length,
    discoveryComplete: tmdbReport.discoveryComplete, tmdbErrors: tmdbReport.errors.length };
}

export async function runPipeline({ publish = true, reuseRecentTmdb = false, compareReference = false, run = runStep, read = readFile,
  auditRun = runAudit, fileStat = stat } = {}) {
  const temporary = await mkdtemp(join(tmpdir(), 'godieor-official-pipeline-'));
  const steps = [];
  const failedSources = [];
  let publicationSucceeded = false;
  async function step(label, args, acceptedExitCodes = [0]) {
    let output;
    try { output = await run(args, { acceptedExitCodes }); }
    catch (error) {
      steps.push({ label, failed: true, error: error.message });
      throw error;
    }
    const parsed = JSON.parse(output);
    steps.push({ label, exitCode: parsed.exitCode, output: parsed.stdout.slice(-1000) });
    return parsed.exitCode;
  }
  async function optionalStep(label, args, acceptedExitCodes = [0]) {
    try { return await step(label, args, acceptedExitCodes); }
    catch (error) {
      failedSources.push({ label, error: error.message });
      return null;
    }
  }
  try {
    const netflix = join(temporary, 'netflix.json');
    const tving = join(temporary, 'tving.json');
    const tvingAds = join(temporary, 'tving-ads.json');
    const disney = join(temporary, 'disney.json');
    const coupang = join(temporary, 'coupang.json');
    await optionalStep('tmdb_changes', ['--env-file-if-exists=.env', 'scripts/sync-tmdb-changes.mjs']);
    const netflixExit = await optionalStep('netflix_official', ['scripts/collect-netflix-kr-schedule.mjs', netflix]);
    if (netflixExit === 0) await optionalStep('netflix_staging', ['scripts/bridge-netflix-lineup.mjs', netflix]);
    else steps.push({ label: 'netflix_staging', skipped: 'netflix_official_unavailable' });
    const netflixReviewExit = netflixExit === 0 ? await optionalStep('netflix_first_premiere_review',
      ['scripts/review-netflix-first-premieres.mjs', netflix, 'work/ott-lineups/netflix-first-premiere-review.json', '--apply'], [0, 2]) : null;
    let tmdbUsable = true;
    if (reuseRecentTmdb) {
      const snapshot = 'work/tmdb-release-candidates/latest.json';
      try {
        const [saved, metadata] = await Promise.all([read(snapshot, 'utf8').then(JSON.parse), fileStat(snapshot)]);
        if (saved.kind !== 'tmdb-first-ott-release-review' || saved.referenceInputUsed !== false ||
            !Array.isArray(saved.rows) || !Array.isArray(saved.discoveryCoverage) ||
            JSON.stringify(saved.months) !== JSON.stringify(configuredMonths()) ||
            Date.now() - metadata.mtimeMs > 60 * 60 * 1000 || metadata.mtimeMs > Date.now() + 60000)
          throw new Error('TMDB_RECENT_SNAPSHOT_UNAVAILABLE');
        steps.push({ label: 'tmdb_recent_snapshot_reused', snapshot,
          ageMinutes: Math.round((Date.now() - metadata.mtimeMs) / 60000), total: saved.total,
          discoveryComplete: saved.discoveryComplete, errors: saved.errors?.length });
      } catch (error) {
        tmdbUsable = false;
        failedSources.push({ label: 'tmdb_recent_snapshot_reused', error: error.message });
        steps.push({ label: 'tmdb_recent_snapshot_reused', failed: true, error: error.message });
      }
    } else {
      tmdbUsable = await optionalStep('tmdb_official_crosscheck', ['--env-file-if-exists=.env', 'scripts/collect-tmdb-release-candidates.mjs', 'work/tmdb-release-candidates', bindings], [0, 2]) !== null;
    }
    const tvingExit = await optionalStep('tving_official_tmdb', ['--env-file-if-exists=.env', 'scripts/collect-tving-upcoming.mjs', tving], [0, 2]);
    // An incomplete official report cannot be staged; preserve the existing queue.
    if (tvingExit === 0) await optionalStep('tving_staging', ['scripts/bridge-tving-upcoming.mjs', tving]);
    // The Ads schedule covers TVING and Wavve together. Keep its dates in the
    // review queue; they cannot independently establish a TVING KR premiere.
    const adsExit = await optionalStep('tving_ads_official', ['scripts/collect-tvingads-kr-lineup.mjs', tvingAds], [0, 1]);
    if (adsExit === 0) await optionalStep('tving_ads_staging', ['scripts/stage-ott-lineup.mjs', tvingAds, 'work/ott-lineups']);
    const disneyExit = await optionalStep('disney_upcoming_official', ['scripts/collect-disneyplus-kr-lineup.mjs', disney], [0, 1]);
    if (disneyExit === 0) await optionalStep('disney_upcoming_staging', ['scripts/stage-ott-lineup.mjs', disney, 'work/ott-lineups']);
    const coupangExit = await optionalStep('coupang_news_official', ['scripts/collect-coupangplay-kr-lineup.mjs', coupang], [0, 1]);
    if (coupangExit === 0) await optionalStep('coupang_news_staging', ['scripts/stage-ott-lineup.mjs', coupang, 'work/ott-lineups']);
    const coupangPremiereExit = await optionalStep('coupang_explicit_premiere_review', ['--env-file-if-exists=.env', 'scripts/collect-coupang-premieres.mjs'], [0, 2]);
    // Persist identity leads for title-only official listings. No release dates are invented.
    let undatedLinkExit = disneyExit === 0 && coupangExit === 0 ? 0 : 2;
    if (disneyExit === 0 && coupangExit === 0) {
      undatedLinkExit = await optionalStep('undated_official_tmdb_link', ['--env-file-if-exists=.env', 'scripts/link-undated-official-tmdb.mjs',
        'work/ott-lineups/tmdb-identity-review.json', disney, coupang], [0, 2]);
    }
    // Only validated pre-reviewed first-release claims with a fresh official
    // recheck are eligible for automation. Unknown first releases remain queued.
    if (tmdbUsable) await optionalStep('auto_review_verified_first_releases',
      ['scripts/auto-review-verified-premieres.mjs']);
    const sourceRecheckExit = await optionalStep('posted_official_source_recheck',
      ['scripts/recheck-posted-official-sources.mjs', 'data/curated/ott-source-reviewed-batch-2026-11-16.json',
        'work/ott-lineups/posted-source-recheck.json', ...(netflixExit === 0 ? [netflix] : [])], [0, 2]);
    // Assign opaque keys to approved candidates before reading the snapshot.
    await step('complete_reviewed_mappings', ['scripts/complete-reviewed-mappings.mjs']);
    const [state, mappingInput] = await Promise.all([
      read('work/ott-candidates/state.json', 'utf8').then(JSON.parse),
      read(mappings, 'utf8').then(JSON.parse),
    ]);
    let gate;
    if (tmdbUsable) {
      try {
        const report = JSON.parse(await read('work/tmdb-release-candidates/latest.json', 'utf8'));
        gate = publicationGate(state, mappingInput, report);
      } catch (error) {
        failedSources.push({ label: 'tmdb_report', error: error.message });
      }
    }
    gate ??= { reviewedMappings: prepareReviewed(mappingInput, state).length,
      readyUnmapped: [], officialAndTmdbReady: 0, discoveryComplete: false, tmdbErrors: 1 };
    // A missing provider-coverage slice cannot invalidate 70 already reviewed
    // publications. It *does* prevent a claim of complete discovery/parity.
    if (publish) {
      await step('publish_reviewed', ['--env-file-if-exists=.env', 'dist/src/cli/publish-reviewed.js', '--file', mappings]);
      publicationSucceeded = true;
      await optionalStep('ott_poster_enrichment', ['--env-file-if-exists=.env', 'scripts/enrich-ott-posters.mjs', '--apply'], [0, 2]);
    }
    const audit = publish && compareReference ? await auditRun(['--env-file-if-exists=.env', 'scripts/audit-current-first-premieres.mjs']) : null;
    return {
      status: failedSources.length || netflixExit !== 0 || netflixReviewExit !== 0 || tvingExit !== 0 || adsExit !== 0 || disneyExit !== 0 || coupangExit !== 0 || undatedLinkExit !== 0 || coupangPremiereExit !== 0 || sourceRecheckExit !== 0 || !gate.discoveryComplete || gate.tmdbErrors || gate.readyUnmapped.length
        ? 'published_with_discovery_gaps' : publish ? 'published' : 'validated_without_publish',
      gate, steps, failedSources, published: publish, audit: audit && { referenceRows: audit.referenceRows,
        exactMatches: audit.exactMatches, unresolved: audit.unresolved, statusCounts: audit.statusCounts,
        parity: audit.parity },
    };
  } catch (error) {
    error.report = { status: 'failed', published: publicationSucceeded, steps, failedSources,
      error: error.message };
    throw error;
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

if (process.argv[1]?.endsWith('/run-official-ott-pipeline.mjs')) {
  try {
    const report = await runPipeline({ publish: !process.argv.includes('--no-publish'),
      reuseRecentTmdb: process.argv.includes('--reuse-recent-tmdb'),
      compareReference: process.argv.includes('--compare-reference') });
    console.log(JSON.stringify(report, null, 2));
    if (report.status === 'published_with_discovery_gaps') process.exitCode = 2;
  } catch (e) {
    console.log(JSON.stringify(e.report ?? { status: 'failed', published: false, error: 'PIPELINE_BOOTSTRAP_FAILED' }, null, 2));
    console.error('OFFICIAL_OTT_PIPELINE_FAILED:', e.message);
    process.exitCode = 1;
  }
}
