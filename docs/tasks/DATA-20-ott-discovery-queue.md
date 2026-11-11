# DATA-20 · StreamPick 대조 누락 조사 (2026-11-11)

- Requirement: 한국 OTT 2026-11~12 일정 확장, 공식 근거 후 게시.
- 범위: 제3자 참고 목록 35행 대조 조사 queue, Netflix 한국 공식 기사 2건 staging.
- 예상 실패: 참고 목록의 날짜를 공식 사실로 승격, 글로벌 목록 KR 오인, 시즌 표기 중복, 후보 수를 제품 게시 수로 오인.
- LEARN-ID: 해당 없음(제품 데이터 작업).

## 실행

- 공식 기사: https://about.netflix.com/ko/news/the-devils-plan-dead-again-teaser 및 https://about.netflix.com/ko/news/heartbeat-arrives-netflix-november-2.
- `node scripts/stage-ott-lineup.mjs data/lineups/netflix-kr-2026-11-dead-again.json` → created 1, stored 91, published 0.
- `node scripts/stage-ott-lineup.mjs data/lineups/netflix-kr-2026-11-heartbeat.json` → created 1, stored 92, published 0.
- `node scripts/build-ott-discovery-queue.mjs data/reference/streampick-2026-11-12-titles.json work/ott-lineups/state.json work/ott-lineups/discovery-queue.json` → 참고 35, 제목 매칭 5, 조사 30.
- `node --test tests/ott-discovery-queue.test.mjs tests/ott-reference-compare.test.mjs tests/ott-coverage.test.mjs` → 6/6 PASS.

심장소리는 과거 영화제 공개 이력이 있으므로 `premiereConfirmed=false`로 보존. 데블스 플랜 공식 부제와 외부 서비스 '시즌3' 표기는 자동 동치 처리하지 않음. 조사 queue는 게시 금지, DB 신규 게시 0. 실 DB 확인, 한국 공식 월별 자동수집, 후보 검토·게시, 클라우드/폰 확인, 독립 검증 미완료. API 계약·migration 변경 없음.
