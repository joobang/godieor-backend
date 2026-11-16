# DATA-65 · TMDB 변경분 연계 (2026-11-16)

- 요구: 공식 OTT 일정과 TMDB 대량 탐색을 연결하는 파이프라인에서 변경된 TMDB 작품의 재탐색을 놓치지 않는다. 범위: backend 수집, 재실행 체크포인트, 파이프라인 연결. 예상 실패: TMDB 500페이지 초과, 변경 ID 폭증, 중단 이후 재시도, 변경분을 한국 OTT 공개일로 오인.
- 구현: `scripts/sync-tmdb-changes.mjs`에서 TMDB `/movie/changes`, `/tv/changes` 조회, 기간 자동 분할, 파일 원자 저장, 마지막 날짜 재조회. `run-official-ott-pipeline.mjs` 첫 단계에 연결. 기존 후보에 포함된 변경 ID만 `collect-tmdb-release-candidates.mjs`의 재검토 입력으로 합친다. 신규 작품은 별도 TMDB 월간 discover와 공식 OTT 수집 경로에서 찾는다.
- 실 API 검증: 2026-11-16 일간 Changes 총 2,564개(영화 2,200, TV 364), 기존 후보 1,215개 중 변경 ID 70개와 교차. 처음 14일 일괄 조회는 500페이지 초과 오류로 실패해 날짜 분할 구현 및 첫 실행 1일 부트스트랩으로 수정했다. 1일 실제 수집 성공.
- 검증: `node --test tests/tmdb-changes.test.mjs tests/official-ott-pipeline.test.mjs tests/tmdb-release-candidates.test.mjs` 24/24, 권한 상승 후 `npm test` 253/253 통과. 초기 샌드박스에서 dist 삭제 EPERM이 발생했으며 권한 상승 재시도 성공.
- 범위 제한: Disney+/Coupang 공식 자동 수집, 신규 한국 OTT 첫 공개 확정, 실제 신규 DB 게시, 주기 실행 연결, StreamPick 24개 미게시 해소는 이 변경에서 달성하지 못했다. 전체 파이프라인 실행과 독립 검증은 재실행하지 않았다. 참조 26/52는 이전 관측이며 새 결과로 주장하지 않는다.
- 작업 원본: backend. verifier 승인기준/판정은 변경하지 않았다. 학습 기록 LEARN-ID: 해당 없음(기존 API의 증분 수집 구현).
