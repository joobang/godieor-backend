import { appendFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export function collectionDayStart(now) {
  // Seoul stays at UTC+09:00. Calculate midnight independently of runner time zone.
  const seoul = new Date(now.getTime() + 9 * 60 * 60_000);
  return new Date(`${seoul.toISOString().slice(0, 10)}T00:00:00+09:00`).toISOString();
}

export async function shouldCollect({ apiUrl, repository, runId, token, now = new Date(), fetchRuns = fetch }) {
  const endpoint = new URL(`${apiUrl}/repos/${repository}/actions/workflows/daily-collection.yml/runs`);
  endpoint.search = new URLSearchParams({
    event: 'schedule',
    status: 'success',
    created: `>=${collectionDayStart(now)}`,
    per_page: '100',
  });
  const response = await fetchRuns(endpoint, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw Error(`COLLECTION_RUN_LOOKUP_HTTP_${response.status}`);
  const report = await response.json();
  if (!Array.isArray(report.workflow_runs) || report.total_count > report.workflow_runs.length) {
    throw Error('COLLECTION_RUN_LOOKUP_INCOMPLETE');
  }
  return !report.workflow_runs.some(run => String(run.id) !== runId && run.conclusion === 'success');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const collect = await shouldCollect({
      apiUrl: process.env.GITHUB_API_URL,
      repository: process.env.GITHUB_REPOSITORY,
      runId: process.env.GITHUB_RUN_ID,
      token: process.env.GITHUB_TOKEN,
    });
    await appendFile(process.env.GITHUB_OUTPUT, `collect=${collect}\n`);
    console.log(collect ? 'No successful scheduled collection today.' : 'Scheduled collection already succeeded today.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
