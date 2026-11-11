import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseNetflixTudumText } from '../scripts/parse-netflix-tudum.mjs';
import { prepareLineup } from '../scripts/prepare-ott-lineup.mjs';

const options = { sourceUrl: 'https://www.netflix.com/tudum/articles/new-on-netflix', year: 2026, month: 11, observedAt: '2026-11-11T03:00:00Z' };
const sample = `# New on Netflix in November 2026\n## November 1\nImage\nNovember 1\n### 가상 작품 하나\n시놉시스\n### 가상 작품 둘\nSeason 2\n설명\n## November 5\n### 가상 작품 셋\n## December 1\n### 제외할 작품\n`;

test('날짜별 다작품 수집과 시즌/월 경계를 유지하며 전부 심사 대기로 처리', () => {
  const input = parseNetflixTudumText(sample, options);
  assert.deepEqual(input.items.map(({title,date})=>[title,date]), [
    ['가상 작품 하나','2026-11-01'], ['가상 작품 둘','2026-11-01'], ['가상 작품 셋','2026-11-05'],
  ]);
  assert.equal(input.items[1].seasonNumber, 2);
  assert.equal(input.items.every((item) => item.market === null && !item.premiereConfirmed), true);
  assert.equal(prepareLineup(input).candidates.every((item) => item.published === false), true);
});

test('빈 추출, 틀린 월, 잘못된 날짜, 잘못된 URL, 중복 작품 거절', () => {
  assert.throws(() => parseNetflixTudumText('# News', options), /NO_DATE/);
  assert.throws(() => parseNetflixTudumText('## November 31\n### Test', options), /NO_DATE/);
  assert.throws(() => parseNetflixTudumText(sample, {...options, month: 10}), /NO_DATE/);
  assert.throws(() => parseNetflixTudumText(sample, {...options, sourceUrl:'https://example.com/tudum/articles/new-on-netflix'}), /INVALID_TUDUM_SOURCE/);
  assert.throws(() => parseNetflixTudumText('## November 1\n### 가상 작품\n### 가상 작품', options), /DUPLICATE_LINEUP_TITLE/);
});
