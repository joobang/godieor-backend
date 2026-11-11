// TMDB Korean watch-provider discovery is a catalog hint, NEVER premiere evidence.
// Usage: node --env-file=.env scripts/ingest-tmdb-catalog.mjs [--pages=5]
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { Pool } from 'pg';
import { selectPoster } from './enrich-reviewed-tmdb.mjs';

const token = process.env.TMDB_API_READ_ACCESS_TOKEN;
if (!token) throw new Error('TMDB_API_READ_ACCESS_TOKEN is required');
const database = process.env.DATABASE_URL;
if (!database) throw new Error('DATABASE_URL is required');
const pagesArg = process.argv.find((arg) => arg.startsWith('--pages='));
const pages = Number(pagesArg?.split('=')[1] ?? 5);
if (!Number.isInteger(pages) || pages < 1 || pages > 25) throw new Error('pages must be 1..25');
const services = [
  { key: 'netflix', match: /\bnetflix\b/i },
  { key: 'tving', match: /\btving\b/i },
  { key: 'disney_plus', match: /\bdisney\s*(?:\+|plus)\b|disney\s*\+/i },
  { key: 'coupang_play', match: /coupang/i },
];

async function tmdb(endpoint, params = {}) {
  const url = new URL(`https://api.themoviedb.org/3${endpoint}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}`, accept: 'application/json' } });
    if (response.ok) return response.json();
    if (response.status !== 429 && response.status < 500) throw new Error(`TMDB_HTTP_${response.status}`);
    if (attempt === 2) throw new Error(`TMDB_HTTP_${response.status}`);
    await new Promise((resolve) => setTimeout(resolve, 1100 * (attempt + 1)));
  }
}

const discovered = new Map();
const coverage = [];
for (const kind of ['tv', 'movie']) {
  const providers = await tmdb(`/watch/providers/${kind}`, { watch_region: 'KR' });
  for (const service of services) {
    const matched = providers.results.filter((provider) => service.match.test(provider.provider_name));
    if (!matched.length) {
      coverage.push({ kind, service: service.key, providerIds: [], count: 0, note: 'not listed in TMDB KR providers' });
      continue;
    }
    const providerIds = matched.map((x) => x.provider_id);
    let rows = 0;
    for (let page = 1; page <= pages; page++) {
      const data = await tmdb(`/discover/${kind}`, {
        watch_region: 'KR', with_watch_providers: providerIds.join('|'),
        with_watch_monetization_types: 'flatrate', language: 'ko-KR',
        sort_by: 'popularity.desc', page,
      });
      for (const item of data.results ?? []) {
        if (!item.id || !(item.title || item.name)) continue;
        const key = `${kind}:${item.id}`;
        if (!discovered.has(key)) discovered.set(key, {
          tmdbId: item.id, type: kind,
          title: item.title || item.name,
          originalTitle: item.original_title || item.original_name || null,
          synopsis: item.overview || null,
          posterUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
          backdropUrl: item.backdrop_path ? `https://image.tmdb.org/t/p/w780${item.backdrop_path}` : null,
          tmdbFirstDate: item.release_date || item.first_air_date || null,
          services: [],
          // TMDB dates cannot establish first publication on a given Korean OTT.
          koreanOttPremiereDate: null, releaseEvidence: 'unverified',
        });
        const record = discovered.get(key);
        if (!record.services.includes(service.key)) record.services.push(service.key);
        rows++;
      }
      if (page >= (data.total_pages ?? 1)) break;
    }
    coverage.push({ kind, service: service.key, providerIds, count: rows });
  }
}

const pool = new Pool({ connectionString: database, max: 3 });
let inserted = 0, updated = 0, reviewedPostersUpdated = 0;
try {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`INSERT INTO provider (key, name, origin) VALUES ('tmdb', 'The Movie Database metadata and KR watch-provider discovery', 'provider') ON CONFLICT (key) DO NOTHING`);
    for (const item of discovered.values()) {
      const contentType = item.type === 'movie' ? 'movie' : 'drama';
      const externalId = String(item.tmdbId);
      const source = await client.query('SELECT content_id FROM content_source WHERE provider_key=$1 AND content_type=$2::content_kind AND external_id=$3', ['tmdb', contentType, externalId]);
      if (source.rows[0]) {
        // Preserve existing manually reviewed titles, but enrich missing metadata.
        await client.query(`UPDATE content SET poster_url=COALESCE(poster_url,$1), synopsis=COALESCE(synopsis,$2), original_title=COALESCE(original_title,$3), updated_at=now() WHERE id=$4`, [item.posterUrl, item.synopsis, item.originalTitle, source.rows[0].content_id]);
        updated++;
      } else {
        const id = randomUUID();
        await client.query('INSERT INTO content (id,kind,title,original_title,poster_url,synopsis) VALUES ($1,$2::content_kind,$3,$4,$5,$6)', [id,contentType,item.title,item.originalTitle,item.posterUrl,item.synopsis]);
        await client.query('INSERT INTO content_source (provider_key,external_id,content_type,content_id) VALUES ($1,$2,$3::content_kind,$4)', ['tmdb',externalId,contentType,id]);
        inserted++;
      }
    }
    // The reviewed OTT publisher owns dates. Enrich its existing content only.
    const reviewed = await client.query(`SELECT DISTINCT e.content_id AS "contentId", e.title,
      c.kind::text AS kind, c.poster_url AS "posterUrl", es.service::text AS platform
      FROM event e JOIN event_source src ON src.event_id=e.id
      JOIN content c ON c.id=e.content_id JOIN event_service es ON es.event_id=e.id
      WHERE src.provider_key='ott_reviewed' AND e.release_market='KR'`);
    const proposals = new Map();
    const catalog = [...discovered.values()];
    for (const event of reviewed.rows) {
      const proposal = selectPoster(event, catalog);
      if (!proposal) continue;
      const previous = proposals.get(event.contentId);
      if (previous && previous.posterUrl !== proposal.posterUrl) proposals.set(event.contentId, { conflict: true });
      else if (!previous) proposals.set(event.contentId, proposal);
    }
    for (const [id, proposal] of proposals) {
      if (proposal.conflict) continue;
      const result = await client.query('UPDATE content SET poster_url=$1, updated_at=now() WHERE id=$2 AND poster_url IS NULL', [proposal.posterUrl, id]);
      reviewedPostersUpdated += result.rowCount;
    }
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
  const count = await pool.query("SELECT count(*)::integer AS total, count(*) FILTER (WHERE c.poster_url IS NOT NULL)::integer AS posters FROM content_source cs JOIN content c ON c.id=cs.content_id WHERE cs.provider_key='tmdb'");
  await mkdir('work/tmdb', { recursive: true });
  const report = { observedAt: new Date().toISOString(), market: 'KR', source: 'TMDB', type: 'metadata-discovery-only', pagesPerService: pages, coverage, uniqueTitles: discovered.size, inserted, updated, stored: count.rows[0], rows: [...discovered.values()] };
  await writeFile('work/tmdb/latest.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ market: report.market, coverage, uniqueTitles: report.uniqueTitles, inserted, updated, reviewedPostersUpdated, stored: report.stored, calendarPublished: 0 }, null, 2));
} finally { await pool.end(); }
