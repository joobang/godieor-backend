import { appendFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export function collectionDayStart(now) {
  // Seoul stays at UTC+09:00. Calculate midnight independently of runner time zone.
  const seoul = new Date(now.getTime() + 9 * 60 * 60_000);
  return new Date(`${seoul.toISOString().slice(0, 10)}T00:00:00+09:00`).toISOString();
}

const dailySteps = ['Collect daily providers', 'Collect and publish reviewed OTT premieres', 'Report overall collection failures'];

async function readCollectionPage(endpoint, field, token, fetchPage) {
  const response = await fetchPage(endpoint, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw Error(`COLLECTION_RUN_LOOKUP_HTTP_${response.status}`);
  const report = await response.json();
  if (!Array.isArray(report[field]) || !Number.isSafeInteger(report.total_count) || report.total_count !== report[field].length) {
    throw Error('COLLECTION_RUN_LOOKUP_INCOMPLETE');
  }
  return report[field];
}

export async function shouldCollect({ apiUrl, repository, runId, refName, token, now = new Date(), fetchRuns = fetch }) {
  const base = `${apiUrl}/repos/${repository}/actions`;
  const endpoint = new URL(`${base}/workflows/daily-collection.yml/runs`);
  endpoint.search = new URLSearchParams({
    status: 'success',
    created: `>=${collectionDayStart(now)}`,
    per_page: '100',
  });
  const runs = await readCollectionPage(endpoint, 'workflow_runs', token, fetchRuns);
  for (const run of runs) {
    if (String(run.id) === runId || run.conclusion !== 'success') continue;
    const scheduled = run.event === 'schedule' && run.head_branch === refName;
    const manual = run.event === 'workflow_dispatch' && run.head_branch === 'main';
    if (!scheduled && !manual) continue;
    if (!Number.isSafeInteger(run.id)) throw Error('COLLECTION_RUN_LOOKUP_INCOMPLETE');
    const jobsUrl = new URL(`${base}/runs/${run.id}/jobs?filter=latest&per_page=100`);
    const jobs = await readCollectionPage(jobsUrl, 'jobs', token, fetchRuns);
    const collect = jobs.find(job => job.name === 'collect' && job.conclusion === 'success');
    if (dailySteps.every(name => collect?.steps?.some(step => step.name === name && step.conclusion === 'success'))) {
      return false;
    }
  }
  return true;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const collect = await shouldCollect({
      apiUrl: process.env.GITHUB_API_URL,
      repository: process.env.GITHUB_REPOSITORY,
      runId: process.env.GITHUB_RUN_ID,
      refName: process.env.GITHUB_REF_NAME,
      token: process.env.GITHUB_TOKEN,
    });
    await appendFile(process.env.GITHUB_OUTPUT, `collect=${collect}\n`);
    console.log(collect ? 'No completed daily collection today.' : 'Daily collection already succeeded today.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
