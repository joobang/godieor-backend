# DATA-58 · TMDB 글로벌 방영일 탐색 페이지 누락 개선

- Requirement: OTT KR 신작·시즌의 독립 발견 / 공식 최초 공개 검증 / 검토 후 게시. DATA-57 후속.
- 시작 HEAD: backend `0d3a9f9`, app `0148530`, branch `codex/ott-animation-support`.
- 범위: TMDB 독립 발견의 global `air_date` 페이징, 읽기 전용 실측 CLI, 참조용 별도 recall 감사. API 계약·migration·verifier 승인 기준은 변경하지 않는다.
- 작업 대상과 무관한 기존 dirty: backend `.env.example`, `package.json` 및 기존 미추적 감사 코드; app 개인 iOS signing project 파일. 스테이징/커밋에서 제외한다.

## 실패 조건 및 수정

- 과거 2026년 11~12월 `maxPages=20` 독립 조회에서 TMDB 작품 821개(글로벌 방영일 경로 652개, 그 경로로만 발견 509개)를 찾았지만 글로벌 방영일 조회의 월별 155/55페이지 중 20페이지만 읽어 `truncated=2`였다. 이 값은 한국 OTT 공개 이벤트나 DB 게시 건수가 아니다.
- 전 세계 TV 방영일 구간이 `maxPages`를 넘으면 날짜를 절반씩 분할한다. 충분히 작은 구간에서 모든 페이지를 수집하고 작품 ID를 중복 제거한다. 하루 분할 뒤에도 페이지가 넘거나 요청 실패라면 불완전한 coverage를 그대로 기록한다.
- 월별 한국 제공처·한국 제작 예정작 필터는 기존대로 유지. 누락된 provider 등록은 전체 검색 완전성의 별도 제약으로 남긴다.
- 글로벌 시리즈 후보를 OTT 첫 공개로 자동 게시하지 않는다. 시즌/지역/플랫폼 공식 일자 및 정체성 확인 전에는 리뷰 후보에만 남긴다.
- 실제 TMDB TV 상세 조회: `tv:387`의 시즌 20, `tv:261102`의 시즌 6은 시리즈 `seasons` 배열에서 찾지 못했다. 시리즈 ID를 발견해도 해당 시즌이 발견되었다는 뜻이 아니다.

## 자체 검사

- `/private/tmp/godieor-data48/node-v24.22.3-darwin-arm64/bin/node --test tests/tmdb-date-discovery.test.mjs tests/tmdb-live-recall.test.mjs tests/tmdb-release-candidates.test.mjs` → 32/32 PASS.
- `/private/tmp/godieor-data48/node-v24.22.3-darwin-arm64/bin/node --test tests/*.test.mjs` → 157/157 PASS.
- 실 TMDB 독립 조회(20페이지): `/private/tmp/godieor-data58-sharded-full.json` → 2,825 작품, API 오류 0, 잘림 12(11월 특정 일자에서 24~31페이지 중 20페이지만 조회), Coupang 영화 provider 미등재.
- 실 TMDB 독립 조회(100페이지): `/private/tmp/godieor-data58-sharded-100.json` → **3,303 작품, 글로벌 날짜 경로 3,285개, 잘림 0, API 오류 0**. `movie:coupang_play` provider 정보 미등재 때문에 `discoveryComplete=false`가 정확한 상태다. 검색 상한 기본값은 100으로 조정했다.
- 참조 사후 identity 감사 `/private/tmp/godieor-data58-identity-audit.json`: 52행 중 과거 TMDB 후보 ID가 있었던 49행의 작품 ID 49개를 재발견, 기존 ID가 없었던 3행(스폰지밥 시즌20, 몰몬교 주부들 시즌6, 나인 투 식스)은 동일 ID 추적 불가. 이 감사는 **작품 단위**이고 대상 시즌이나 OTT 날짜 검증은 0건이다.

## 인계 / 독립 검증

- 제품 DB 작성·API 게시·배포 없음. StreamPick 52행은 사후 비교 전용이며 조회 입력과 피드 생성에 사용하지 않는다. 기존 26/52 게시 일치가 신규 후보 수집 때문에 증가했다고 주장할 수 없다.
- next: 분할 후 전체 coverage 확인, 작품→시즌 후보 변환과 OTT 공식 최초 공개 근거의 결합률 실측. 미존재 시즌은 외부 공식 OTT 상세/시즌 편성 자료를 통해 추가 발견해야 한다.
- app/verifier 계약·migration digest, acceptance/verdict 및 이전 ERROR/4 SKIPPED 유지. 독립 runner/실폰/클라우드 미실행.
- ADR: 기존 TMDB 발견/OTT 증거 분리 방침 유지, 신규 선택 없음. 관련 학습: LEARN-0011/0021(게시와 후보의 구분).
