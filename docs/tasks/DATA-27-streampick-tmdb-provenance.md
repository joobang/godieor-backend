# DATA-27 · StreamPick 누락 11건의 TMDB 날짜와 한국 OTT 근거 분리

- Requirement: PROD-005/007/009, ADR-015. 기준 backend `ce4aa27`, app `097c59c`, verifier `62e137b`.
- 변경 범위: `scripts/verify-streampick-tmdb.mjs` 기존 실조회 결과를 입력으로 받아 `scripts/reconcile-streampick-gaps.mjs`에서 공식 한국 OTT 라인업과 제목·플랫폼·일자(및 확정 시 시즌)를 비교. 원본 TMDB/StreamPick 감사 파일은 `/private/tmp`에만 두며 DB 자동 게시는 하지 않음.
- 실패 예상: TMDB 글로벌 방영일을 한국 플랫폼 첫 공개일로 오인, 현재 제공처 정보로 과거 출시 입증, 시즌/원제 불일치, 첫 공개와 재입점 혼동, 공개 시점별 StreamPick 자료 차이.

## 실측 (2026-11-12)

- StreamPick 신작 15개 연결행과 기존 DB 9개 사이 제목·플랫폼·일자 일치 4, StreamPick-only 11 (DATA-26). **StreamPick 전체 885개 중 849개는 회차이며 신작 개수와 직접 비교 불가.**
- `verify-streampick-tmdb.mjs` 실 TMDB API 조회: 11/11이 영화 `release_date` 또는 TV 시즌 `air_date`·첫 회 `air_date`와 동일. 현시점 KR 제공처도 같이 잡힌 행 6/11. 이는 최초 한국 OTT 공개 확인이 아님.
- 라인업 근거 재분류 결과: TMDB 날짜·제공처만 5개, TMDB 날짜만 4개, **한국 OTT 공식 페이지에 같은 날짜가 있지만 최초 공개 판정은 미완료인 2개** (`유일무이 로맨스`, `스타일 워즈`). 두 개 모두 기존 `premiereConfirmed=false` 유지.
- `유일무이 로맨스`: CJ 뉴스룸 2026-11-10 게시 기사에서 TVING **11월 9일 공개** 확인. https://cjnews.cj.net/티빙-주간-추천작-박수영x김현진-신작-로맨스부터-톰/ (기존 JSON의 인코딩 URL 참조). 다만 최초 공개/재입점 여부는 별개.
- `스타일 워즈`: https://www.disneyplus.com/ko-kr 의 한국 페이지에 시즌1 **11월 11일 스트리밍** 표시. 현재 TMDB KR 제공처는 비어 있음. **제공처 없다는 이유로 공식 한국 공개 단서까지 버리면 누락**되므로 후보를 보존해야 함.
- `배스 X 마키나` 및 `오버액션 갱`은 한국 Netflix 공식 작품 페이지에서 2026년 작품·현재 한국 서비스 제공 확인(https://www.netflix.com/kr/title/81088875, https://www.netflix.com/kr/title/81993326). 작품 페이지에는 11월 3일/4일 **정확한 출시 날짜는 없음**. 따라서 TMDB 날짜로 자동 게시하면 안 됨.
- 기존 수집기 `scripts/ingest-tmdb-catalog.mjs`: KR 제공처 지정 후 인기순 기본 5페이지(최대 25)만 탐색하며 `first_air_date` / `release_date` 한 개만 캐시에 남김. 시즌 개시 및 에피소드 날짜, 해당 월 방송 일정은 게시 후보 생성에 사용하지 않음. 이 제약이 누락의 재현 가능한 원인이다.

## 실행 및 후속

- `node --test tests/streampick-gaps.test.mjs` → 3/3 통과.
- `node scripts/reconcile-streampick-gaps.mjs /private/tmp/streampick-tmdb-11-audit.json data/lineups /private/tmp/streampick-gaps-reconciled.json` → 11건 분류, 추가 게시 0.
- 다음: TMDB 월별 날짜+시즌 기반 검토 큐를 실제 수집 배치에 연결하되, provider 부재 시에도 후보는 보존하고 공식 근거 확인 전에는 게시하지 않는다. 공식 최초 공개 확인·이명/시즌/시장 검토 후 기존 reviewed 경로로 게시하고 15개 신작 기준 재집계. 회차 703개는 별도의 제품 지원 범위 결정이 필요.
- verifier 승인은 수행하지 않았으며 API/DB migration/배포 변경 없음. LEARN-ID 해당 없음(기존 감사의 근거 추적 보강).
