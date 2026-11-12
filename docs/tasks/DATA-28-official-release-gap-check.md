# DATA-28 · StreamPick 누락 11건 공식 일정 재확인

- Requirement: PROD-005/007/009, ADR-015. 담당: `codex-context-01`(구현). 기준 backend `c7ee0ad`, app `097c59c`, verifier `62e137b`. 브랜치 `codex/app-auth-phone-ready`.
- 범위: Netflix 한국 공식 신규 콘텐츠 공지와 TMDB/StreamPick 날짜 비교, 날짜 충돌 탐지 회귀 검사, 11건 재검토 큐와 인계. 기존 dirty 파일 보존.
- 완료 조건: 누락 11건 모두 근거 수준별로 분류하고 공식 날짜 충돌을 분리; 근거 없는 제품 게시 0건.
- 예상 실패: `release_date`/`first_air_date`가 한국 OTT 첫 공개를 증명한다고 오인, 공개 날짜 하루 차이 무시, 제공처가 없다는 이유로 후보 삭제, 시즌과 회차 혼동.

## 실제 조사 · 2026-11-12

- 전체 StreamPick 11~12월 885건은 회차 849와 신작 36으로 구분. 대상 4 OTT 연결 신작은 15건. 기존 로컬 DB 게시 9건과 플랫폼·제목·일자 일치 4, StreamPick-only 11, DB-only 5. 서로 다른 집계 정의는 그대로 유지하며 `11건 전부 게시`로 숫자만 맞추지 않는다.
- 빠진 11건 전부 TMDB의 영화 `release_date`, TV 시즌 `air_date` 또는 첫 회 `air_date`와 일치. 그러나 당시 인기순 5페이지 기반 수집기에는 시즌/회차 첫 날짜를 이용한 월별 발견·후보 적재가 없어서 실제 공식 검토까지 도달하지 못한다.
- Netflix 공식 한국 신규 콘텐츠 목록 `https://about.netflix.com/ko/new-to-watch`에서 **배스 X 마키나(11/03)**, **반려견의 완벽한 크리스마스(11/04)**, **시한부 1년, 남자를 사다(11/05)** 세 작품은 StreamPick과 날짜 일치. **오버액션 갱**은 공식 목록 **11/05**, StreamPick/TMDB **11/04**로 1일 차이. 네 건 모두 `premiereConfirmed=false`인 검토 후보로 저장.
- 기존 TVING `유일무이 로맨스`(11/09), Disney+ `스타일 워즈`(11/11)의 공식 한국 일정 후보도 일치. 총 같은 날짜 공식 한국 일정 단서 **5건**, 공식 날짜 충돌 **1건**, TMDB 날짜+KR 제공처만 **1건**(`전지적 집착 시점`), TMDB 날짜만 **4건**(`더 바디`, `Alicia's Law`, `문무`, `나인 투 식스`). **공식 첫 공개 확인 0건**.
- Netflix 네 후보 `data/lineups/netflix-kr-2026-11-new-to-watch-observed.json`; 스테이징 실행 `created=4, stored=98, published=0`. 원본 감사 `/private/tmp/streampick-tmdb-11-audit.json`, 대조 `/private/tmp/streampick-gaps-reconciled.json`. 게시 DB의 과거 9건은 이번 차수에서 재조회하지 않았다.

## 다음 단계

- 이번 실행: `node --test tests/streampick-gaps.test.mjs` **4/4 PASS**, `node scripts/reconcile-streampick-gaps.mjs /private/tmp/streampick-tmdb-11-audit.json data/lineups /private/tmp/streampick-gaps-reconciled.json` **11건 재분류 성공**, `npm test` **108/108 PASS**(최초 기본 sandbox에서 dist unlink EPERM 발생, 허용된 실행에서 전체 성공), `git diff --check` 통과.

- 월별 날짜 기반 TMDB 검색과 TV 시즌 상세 조회를 인기순 수집기에 연결해 검토 후보 발견률을 높일 것. 한국 OTT 공개 근거와 global TMDB 날짜를 필드 수준에서 구분해야 한다.
- 5개 공식 일정 후보의 한국 **최초** 공개 여부, 1개 날짜 충돌의 시간대·한국 공개일, 5개 공식 일정 미확인 작품의 실제 플랫폼을 별도 확인. 검토 확정 항목만 기존 `ott_reviewed` 게시 경로로 반영 후 SQL로 재집계한다.
- 독립 verifier 판정, 배포, cloud/iOS 확인 미실행. API 계약/마이그레이션 변경 없음. LEARN-ID: 해당 없음(기존 DATA-27 근거 대조의 확장).
