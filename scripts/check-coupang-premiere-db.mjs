#!/usr/bin/env node
// Synthetic first-party proof -> review -> mapping -> disposable PostgreSQL; never product DB.
import 'reflect-metadata';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import { parsePremiereArticle, identifyPremiere, stageAndReview } from './collect-coupang-premieres.mjs';
import { completeReviewedMappings } from './complete-reviewed-mappings.mjs';
const require = createRequire(import.meta.url);
const { NestFactory } = require('@nestjs/core');
const { ReviewedOttModule } = require('../dist/src/reviewed-ott/reviewed-ott.module.js');
const { ReviewedPublishService } = require('../dist/src/reviewed-ott/reviewed-publish.service.js');
const { ReviewedMappingRepository } = require('../dist/src/reviewed-ott/reviewed-mapping.repository.js');
const { ReviewedOttAdapter } = require('../dist/src/reviewed-ott/reviewed-ott.adapter.js');
const { CollectionRepository } = require('../dist/src/collection/collection.repository.js');
const { CollectionService } = require('../dist/src/collection/collection.service.js');
const { OttCandidatesRepository } = require('../dist/src/ott-candidates/ott-candidates.repository.js');
const { PrismaService } = require('../dist/src/database/prisma.service.js');
const container = `godieor-data69-${randomBytes(5).toString('hex')}`;
const password = randomBytes(24).toString('hex');
const directory = await mkdtemp(join(tmpdir(), 'godieor-data69-db-'));
const pinned = /image:\s+(\S+)/.exec(await readFile('compose.yaml', 'utf8'))[1];
const image = process.env.GODIEOR_TEST_POSTGRES_IMAGE ?? pinned;
const docker = args => execFileSync('docker', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, POSTGRES_PASSWORD: password } }).trim();
let app, created = false;
try {
  docker(['run', '--pull=never', '--rm', '-d', '--name', container, '-e', 'POSTGRES_USER=godieor', '-e', 'POSTGRES_DB=godieor_data69', '-e', 'POSTGRES_PASSWORD', '-p', '127.0.0.1::5432', '--tmpfs', '/var/lib/postgresql/data', image]); created = true;
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try { docker(['exec', container, 'pg_isready', '-U', 'godieor', '-d', 'godieor_data69']); ready = true; break; } catch {}
    await new Promise(r => setTimeout(r, 250));
  }
  assert.ok(ready);
  const port = /:(\d+)$/.exec(docker(['port', container, '5432/tcp']))[1];
  process.env.DATABASE_URL = `postgresql://godieor:${password}@127.0.0.1:${port}/godieor_data69`;
  process.env.CURSOR_SIGNING_KEY = randomBytes(32).toString('hex');
  process.env.COLLECTION_SCHEDULE_ENABLED = 'false';
  execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], { stdio: 'pipe', env: process.env });
  app = await NestFactory.createApplicationContext(ReviewedOttModule, { logger: false, abortOnError: false });
  const repo = new OttCandidatesRepository(directory);
  const publisher = new ReviewedPublishService(repo, app.get(ReviewedMappingRepository), app.get(ReviewedOttAdapter), app.get(CollectionRepository), app.get(CollectionService));
  const prisma = app.get(PrismaService);
  const now = '2026-11-16T00:00:00Z', url = 'https://news.coupang.com/archives/999999/';
  const reportFor = async (title, tmdbId) => {
    const html = `<title>쿠팡플레이 금주의 추천작: 가상 검사</title><link rel="canonical" href="${url}"><meta property="article:published_time" content="2026-11-12T00:00:00Z"><p class="cpnr-intro"><strong>제목</strong>${title}<br><strong>출연</strong>가상 배우 A, 가상 배우 B<br><strong>공개</strong>2026년 11월 18일 첫 공개</p>`;
    const request = async path => {
      if (path === '/search/movie') return { total_pages: 1, results: [{ id: tmdbId, title }] };
      if (path === '/search/tv') return { total_pages: 1, results: [] };
      if (path.endsWith('/credits')) return { cast: [{ id: 101, name: '가상 배우 A' }, { id: 102, name: '가상 배우 B' }] };
      if (path === `/movie/${tmdbId}`) return { id: tmdbId, title, genres: [] };
      throw Error('UNEXPECTED_SYNTHETIC_LOOKUP');
    };
    const row = await identifyPremiere(parsePremiereArticle(html, url)[0], request);
    assert.equal(row.eligible, true);
    return { kind: 'coupang-official-premiere-review', referenceInputUsed: false, observedAt: now, complete: true, errors: [], rows: [row] };
  };
  await stageAndReview(await reportFor('가상 기존 영화', 900001), directory, now);
  let state = await repo.readState(); const seed = state.candidates[0];
  const mappingFile = join(directory, 'mapping.json');
  let mappings = { version: 1, mappings: [{ candidateId: seed.id, revision: seed.revisions.at(-1).token, contentKey: 'synthetic-existing-work', eventKey: 'synthetic-existing-event' }] };
  await writeFile(mappingFile, JSON.stringify(mappings));
  assert.ok((await publisher.publish(mappingFile)).every(r => r.status === 'succeeded'));
  const before = await prisma.event.findMany({ orderBy: { id: 'asc' } }); assert.equal(before.length, 1);
  const fresh = await reportFor('가상 신규 영화', 900002);
  assert.equal((await stageAndReview(fresh, directory, now)).approved, 1);
  state = await repo.readState(); const completed = completeReviewedMappings(state, mappings); assert.equal(completed.added, 1);
  mappings = completed.completed; await writeFile(mappingFile, JSON.stringify(mappings));
  assert.ok((await publisher.publish(mappingFile)).every(r => r.status === 'succeeded'));
  const after = await prisma.event.findMany({ orderBy: { id: 'asc' } }); assert.equal(after.length, 2);
  assert.deepEqual(after.find(e => e.id === before[0].id), before[0]);
  const freshEvent = after.find(e => e.id !== before[0].id);
  assert.equal(freshEvent.local_date.toISOString().slice(0, 10), '2026-11-18'); assert.equal(freshEvent.instant_at, null);
  assert.equal(await prisma.event_service.count({ where: { event_id: freshEvent.id, service: 'coupang_play' } }), 1);
  const changes = await prisma.event_change.count();
  assert.equal((await stageAndReview(fresh, directory, now)).approved, 0);
  assert.equal(completeReviewedMappings(await repo.readState(), mappings).added, 0);
  await publisher.publish(mappingFile);
  assert.deepEqual(await prisma.event.findMany({ orderBy: { id: 'asc' } }), after);
  assert.equal(await prisma.event_change.count(), changes);
  console.log(JSON.stringify({ synthetic: true, disposableDatabase: true, image, pinnedImageUsed: image === pinned,
    baselineEvents: 1, afterNewProof: 2, replayEvents: 2, existingRowsPreserved: true, dateOnlyNoInstant: true, productPublicationDelta: 0 }));
} finally {
  await app?.close();
  if (created) docker(['rm', '-f', container]);
  await rm(directory, { recursive: true, force: true });
}
