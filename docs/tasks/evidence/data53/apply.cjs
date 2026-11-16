const fs = require('node:fs');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const req = createRequire(process.cwd() + '/package.json');
req('reflect-metadata');
const c = req('./dist/src/ott-candidates/domain/candidate');
const { prepareReviewed } = req('./dist/src/reviewed-ott/domain/reviewed-mapping');
const { OttCandidatesRepository } = req('./dist/src/ott-candidates/ott-candidates.repository');
(async () => {
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(process.env.DATABASE_URL).hostname));
  const file = 'data/curated/ott-reviewed-mappings.json';
  const old = JSON.parse(fs.readFileSync(file));
  assert.equal(old.mappings.length, 65);
  const investigation = JSON.parse(fs.readFileSync('docs/tasks/evidence/data53/tmdb-investigation.json'));
  const observations = JSON.parse(fs.readFileSync('docs/tasks/evidence/data53/official-observations.json'));
  fs.copyFileSync('work/ott-candidates/state.json', '/private/tmp/godieor-data53/state-before.json');
  fs.copyFileSync(file, '/private/tmp/godieor-data53/mappings-before.json');
  const artifact = { version: 1, asOf: '2026-11-13', scope: 'implementer evidence crosscheck, not independent approval', updates: [], additions: [] };
  let next;
  const repo = new OttCandidatesRepository(process.cwd() + '/work/ott-candidates');
  await repo.transaction(async state => {
    const prior = prepareReviewed(old, state);
    const now = new Date().toISOString();
    const enriched = new Set();
    for (const [title, platform] of [['뜨거운 안녕','tving'], ['푸른길','netflix'], ['대리수능','tving'], ['천천히 강렬하게','netflix']]) {
      const candidate = state.candidates.find(x => x.review?.value.title === title && x.review.value.platform === platform);
      assert.ok(candidate);
      const before = candidate.review.value;
      assert.equal(before.seasonNumber, null);
      const hint = investigation.rows.find(x => x.title === title && x.platform === platform);
      assert.equal(hint.seasonNumber, 1);
      assert.equal(hint.dateMatched, true);
      assert.equal(hint.dates.seasonFirstDate, before.date);
      assert.equal(hint.dates.firstEpisodeDate, before.date);
      assert.deepEqual(hint.errors, []);
      const review = { ...before, reviewer: 'GODIEOR 구현 담당 공식 플랫폼 날짜·TMDB 명시 시즌 교차검토 2026-11-13', seasonNumber: 1,
        evidence: `기존 공식 한국 ${platform} 공개일/작품 검토 유지: ${candidate.url}. TMDB tv/${hint.tmdbId}/season/1의 명시 시즌1 첫날·1회 첫날 모두 ${before.date}, 원천 한국어 제목과 기존 공개일 일치 재조회. 시즌 개수로 번호 추정하지 않음. DATA-53 작성자 교차검토/독립 승인 아님.` };
      c.applyReview(state, review, now);
      const mapping = old.mappings.find(x => x.candidateId === candidate.id);
      assert.ok(mapping);
      enriched.add(mapping.eventKey);
      artifact.updates.push({ before, review, mapping, tmdb: { id: hint.tmdbId, season: 1, firstDate: hint.dates.seasonFirstDate } });
    }
    next = structuredClone(old);
    const additions = [
      ['tving','https://www.tving.com/contents/P001794298','무쇠소녀단3','무쇠소녀단','2026-11-26',3,'variety'],
      ['tving','https://www.tving.com/contents/P001793657','보검매직컬 시즌2','보검 매직컬','2026-11-29',2,'variety'],
      ['tving','https://www.tving.com/contents/P001793986','대탈출 : 도시괴담','대탈출','2026-12-02',6,'variety'],
      ['disney','https://www.disneyplus.com/ko-kr/browse/entity-f1c31566-ec05-4d30-b23f-3177442233f4','퍼시 잭슨과 올림포스의 신들','퍼시 잭슨과 올림포스의 신들','2026-11-20',3,'drama'],
    ];
    for (const [source, url, title, refTitle, date, seasonNumber, contentKind] of additions) {
      const platform = source === 'disney' ? 'disney_plus' : 'tving';
      const observation = observations.find(x => x.url === url);
      assert.ok(observation);
      if (source === 'tving') assert.ok(observation.openText.includes(`시즌 ${seasonNumber}`));
      else assert.equal(observation.seasonNumber, seasonNumber);
      const hint = investigation.rows.find(x => x.title === refTitle && x.platform === platform && x.seasonNumber === seasonNumber);
      assert.ok(hint?.dateMatched);
      const discovery = { source, url, headline: title, publishedRaw: null, evidenceRevision: 'DATA53-explicit-KR-season-premiere-2026-11-13' };
      const id = c.addCandidate(state, discovery, now);
      const candidate = state.candidates.find(x => x.id === id);
      const revision = candidate.revisions.at(-1).token;
      const review = { id, revision, reviewer: 'GODIEOR 구현 담당 공식 공개일·시즌 배치 교차검토 2026-11-13',
        title, platform, market: 'KR', contentKind, premiereConfirmed: true, date, seasonNumber,
        localTime: null, timeZone: null, announcedYear: 2026, announcedPeriod: null,
        evidence: `공식 한국 작품 ${url}는 시즌${seasonNumber} ${date.slice(5,7)}월${date.slice(8)}일 공개 명시. TVING openText/Disney+ 한국 공개 배너 직접확인, 2026 연도 문맥·TMDB tv/${hint.tmdbId}/season/${seasonNumber} 첫날 일치 대조. 방송시각/시즌개수/기존시즌 제공처를 신규 공개일로 쓰지 않음. DATA-53 작성자 검토.` };
      c.applyReview(state, review, now);
      const key = String(next.mappings.length + 1).padStart(6,'0');
      const mapping = { candidateId: id, revision, contentKey: `work-${key}`, eventKey: `event-${key}` };
      next.mappings.push(mapping);
      artifact.additions.push({ discovery, review, mapping, observation });
    }
    const after = prepareReviewed(next, state);
    assert.equal(after.length, 69);
    for (let i = 0; i < prior.length; i++) {
      if (enriched.has(old.mappings[i].eventKey)) {
        assert.equal(after[i].seasonNumber, 1);
        assert.deepEqual({ ...after[i], seasonNumber: prior[i].seasonNumber }, prior[i]);
      } else assert.deepEqual(after[i], prior[i]);
    }
  });
  fs.writeFileSync('data/curated/ott-parity-reviewed-2026-11-13.json', JSON.stringify(artifact,null,2)+'\n');
  fs.writeFileSync(file+'.data53.tmp', JSON.stringify(next,null,2)+'\n');
  fs.renameSync(file+'.data53.tmp',file);
  console.log('preflight69 / additions4 / explicit season enrichments4 / other61 canonical records unchanged');
})().catch(e => { console.error('DATA53_REVIEW_FAILED:', e.name, e.message?.startsWith('Expected') ? 'assertion mismatch' : e.message); process.exitCode=1; });
