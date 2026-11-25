const timeZone = "Asia/Seoul";
const workflow = "https://api.github.com/repos/joobang/godieor-backend/actions/workflows/daily-collection.yml";
const production = "https://godieor-backend.onrender.com/v1";
const now = new Date();
const dateParts = new Intl.DateTimeFormat("en-US", {
  timeZone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).formatToParts(now);
const { year, month, day } = Object.fromEntries(dateParts.map(({ type, value }) => [type, value]));
const collectionDate = `${year}-${month}-${day}`;
const dayStart = new Date(`${collectionDate}T00:00:00+09:00`).toISOString();

async function readJson(label, url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(45_000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    throw new Error(`${label}: ${error.message}`, { cause: error });
  }
}

function summarizeRun(run) {
  return {
    event: run.event,
    branch: run.head_branch,
    sha: run.head_sha,
    status: run.status,
    conclusion: run.conclusion,
    createdAt: run.created_at,
    url: run.html_url,
  };
}

try {
  const [today, scheduled, health, calendar] = await Promise.all([
    readJson("GitHub Actions today", `${workflow}/runs?per_page=100&created=${encodeURIComponent(`>=${dayStart}`)}`),
    readJson("GitHub Actions latest schedule", `${workflow}/runs?event=schedule&per_page=1`),
    readJson("Production health", `${production}/health`),
    readJson("Production calendar", `${production}/calendar?month=${year}-${month}&country=KR`),
  ]);
  const [latestScheduled] = scheduled.workflow_runs;
  console.log(JSON.stringify({
    checkedAt: now.toISOString(),
    collectionDate,
    timeZone,
    runsToday: today.workflow_runs.map(summarizeRun),
    totalRunsToday: today.total_count,
    latestScheduled: latestScheduled ? summarizeRun(latestScheduled) : null,
    health,
    freshness: calendar.freshness.map((entry) => ({
      providerKey: entry.providerKey,
      category: entry.category,
      scopeCountry: entry.scopeCountry,
      coverage: entry.coverage,
      dataOrigin: entry.dataOrigin,
      lastAttemptStatus: entry.lastAttemptStatus,
      lastAttemptAt: entry.lastAttemptAt,
      lastSuccessfulAt: entry.lastSuccessfulAt,
    })),
  }, null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
