# DATA-54 · 공식 루트 파서·프로그램 식별 보강

- PROD-005/006/007/009, GD-005/006/007/009. 담당 codex-primary-routes-01 해제, 인계 대기(이번 구현 자체검사 완료/전체누락 해소 미완료). 원본 backend/docs/tasks/DATA-54-official-route-parsers.md.
- base {'godieor-app': 'f5c9cc2ff5fed3334b441f7b4cc969321d42c58e', 'godieor-backend': '689da32a8dd6fdd722946193c193fefb09baab35', 'godieor-verifier': 'a058fd19e7aba4878fa5be5829d3124e9dc274f6'}. branch 세곳 codex/ott-primary-routes, 기존checkout 순차/동시 수정 없음.
- 기존 앱 pbxproj/backend.env.example/package.json/미추적 감사2·테스트2 보존. 비밀값 출력/일괄 stage 금지.
- 사용자 확정: OTT 신작·시즌 최초 공개 후보를 TMDB 독립 수집 후 TMDB/공식 루트로 교차검증하고 전체 배치 반영, StreamPick은 비교용. 회차 제외, 참고 미확인 일정의 제품 표시 도입 아님.
- 범위/완료: 공식 공지·Disney+작품·TVING프로그램 식별의 공통 파서 미지원/실패 원인을 재현·수정, 이전시즌/방송일/게시시각/redirect를 공개일로 오인하지 않음. 새로 검증된 전체 묶음의 후보→review/고정키→SQL/API 및 중복 검사. 기존 52행 참조·26일치·67게시/후보49 수치는 이전 관측이며 재측정과 구분.
- 예상 실패: contentInfo가 에피소드인데 프로그램 ID가 바뀌었다고 오판, 다른 작품 redirect를 승인, 공지의 게시일/달력의 다른 작품 날짜를 오인, 시즌 개수를 번호로 추정, 부제/다국어 이름을 제목만으로 병합, 미지원 형식을 성공 처리, 이미 게시된 항목 재확인만을 신규 게시로 표현.
- 계약/마이그레이션/독립 acceptance 변경 계획 없음. 원문 스냅샷 지문·필드·실행 명령/결과 기록, ADR-020/LEARN-0021 갱신 대상으로 연결.

## 공식 목록 기반 발견 경로 확장

공개 TVING 홈의 공개예정 band 전체9개를 독립 발견 경로로 연결한다. 기존검토는 원본프로그램ID로 재사용하고, 새작품은 정확한제목+서로다른출연진2명+TMDB시즌상세/첫회일자와공식한국플랫폼공개일을각각보존해배치검토후등록한다. 다른공식URL의기존TMDB/시즌/플랫폼/날짜는신규로중복등록하지않는다. 월만있는일정·공연·모호한ID는보류. TMDB원방영일과한국OTT공개일차이는틀렸다고자동덮어쓰지않고의미차이를검토기록으로남긴다.

## 구현 결과 · 종료 인계

상태: 인계 대기. 담당 codex-primary-routes-01 해제. 파서/공개예정 발견 경로의 이번 구현 단위는 자체검사 완료, 사용자 최우선 **참조 누락 전체 해소는 미완료**다. 새 제품게시0. 코드 head `45695865fd07362a330328b78c70f9e8bc699020`.

- TVING P프로그램/E콘텐츠 ID 구분, Disney+한국배너/Netflix한국공지/CJ공식기사 구조화 파서 추가. 같은 원문6개 base미지원4/조회실패2→일치5/명시일자없음1. 실제49개48일치/명시일자없음1. 뜨거운안녕 원문에 명시날짜가 없다는 사실로 과거SNS검토 날짜를 지우거나 새 검증으로 통과시키지 않았다.
- TMDB 재수집120행/누적123ID, created0/revised8/unchanged112. 기존69게시매핑 중44행을 신선한 공식/TMDB 근거와 결속(이전39). blocked0/신규고정키0. 같은 실제관측 replay0신규/0수정. 제공처 미등재로 discoveryComplete=false 유지.
- TVING공개예정 전체9개를 독립수집: 기존검토3/기존다른공식출처1/식별미확정3/공연1/날짜없음1. 신규심사제안0. 후보9개를 전부 premiereConfirmed=false로 staging176→185, 반복신규0/불변9/게시0. 제품게시 경로와 구분했다.
- 가금채 openText11/18만 TVING공개일로 저장. 내부 broad_dt11/16은 **방송일로 확인한 값이 아니다**. TMDB10/16과 날짜의미를 분리하고 번역배우명/펜타곤→YanAn추측연결은 하지 않았다. 기프트는12월만 명시돼 내부12/05를 날짜로 보충하지 않았다.
- SQL/API 11~12월KR4OTT67행/연중69이벤트,69개 전체행·ID·이력의 DATA53게시후 관측과 동일. 최신 StreamPick52행/정확26/미일치26, exit2 유지. 다른작품/후보를 추가해 일치로 계산하지 않았다.

## 실제 실행 명령·결과

Node24 실행파일 `/private/tmp/godieor-data48/node-v24.22.3-darwin-arm64/bin/node` 사용. 아래 node는 해당 파일을 가리킨다. 비밀은 `--env-file=.env`로 서버에만 주입, 출력/증거에 값 없음.

| 실제 명령/실행 | 종료 코드 | 결과/근거 |
|---|---|---|
| 같은HTML6개를 base689da32/현재 refreshOfficialBindings로 실행 | 0 | evidence/data54/parser-before-after.json. 새네트워크시각간 비교 아님 |
| 실제49개 refreshOfficialBindings 재조회 | 0 | official-refresh.json,48matched/1explicit_ott_date_not_found |
| `node --env-file=.env scripts/collect-tmdb-release-candidates.mjs work/tmdb-release-candidates data/curated/ott-official-tmdb-bindings-2026-11-13.json` | 2 | pipeline-live.log,120/123ID·44ready·errors0, Coupang영화 provider미등재 incomplete |
| `node scripts/prepare-tmdb-reviewed-batch.mjs work/tmdb-release-candidates/latest.json data/curated/ott-official-tmdb-bindings-2026-11-13.json /private/tmp/godieor-data54/revalidated-batch.json` | 0 | 44fresh/69existing/blocked0/newMappings0; DB쓰기없음 |
| `node --env-file=.env scripts/collect-tving-upcoming.mjs /private/tmp/godieor-data54/upcoming-verified.json` | 0 |9전부/errors0/newReviewProposals0. 중간탐색보고서가 아닌 최종보고서 보존 |
| `upcomingLineup`로 관측9개 JSON 변환 후 `node scripts/stage-ott-lineup.mjs data/lineups/tving-upcoming-observed-2026-11-16.json work/ott-lineups` 최초/반복 | 0/0 | stage.log/stage-repeat.log,9신규→0신규/9불변; 게시0 |
| `sh scripts/check-streampick-parity.sh /private/tmp/godieor-data54/parity` | 2 | parity-*.json,52참조/67제품/26정확 |
| 동일 actual latest보고서 `mergeCandidateState` 재처리 | 0 | replay.json,0created/0revised/120unchanged/123stored |
| `COLLECTION_SCHEDULE_ENABLED=false COLLECTION_INCLUDE_FIXTURE=false CATALOG_PROVIDER_ONLY=true node --env-file=.env /private/tmp/godieor-data54/verify-db.cjs repeat` | 0 | db-http-repeat.json,HTTP200/67행/기존69행·ID·이력 불변. additions4/updates4는DATA53역사 assertions, 이번추가0 |
| `node --test` + test-command.json 명시33파일 | 0 | server-tests.log,현재트리204/204. 기존개인미추적2테스트제외 |
| 코드4569586 `git archive` 소스에서 `node --test tests/official-ott-source.test.mjs tests/tving-upcoming.test.mjs tests/tmdb-release-candidates.test.mjs` | 0 | fixed-binding.json/fixed-tests.log,35/35. 고정전체204 아님 |

신규 도입중 합성 fixture2개 title누락으로 실패→필수title보완 후 관련35통과. 고정소스 최초 압축해제는 로컬Python tarfile filter인자 미지원으로 검사전 실패→아카이브경로검사 방식 재실행 후35통과. 실패를 검사성공 기록으로 바꾸지 않았다.

## 독립 검증 handoff

- app base/head `f5c9cc2ff5fed3334b441f7b4cc969321d42c58e` (이번 앱코드 변경없음; 종료 문서 커밋은 Git이력 참조).
- backend base `689da32a8dd6fdd722946193c193fefb09baab35` / 코드head `45695865fd07362a330328b78c70f9e8bc699020`; 문서head는 종료 Git이력 참조.
- verifier base `a058fd19e7aba4878fa5be5829d3124e9dc274f6`; 이번변경은 학습/공통문서뿐, 실행/기준/verdict 불변. 종료문서head는 Git이력 참조.
- API `0.1.0-draft.4` manifest SHA256 `96cc08536324f8b5a7c537783caa93a1ce33de533526032e01621282fb601122`.
- migration runner digest `853337eadc11cd3c8c619c9e53d961cb7eead5fe0a79368c5d167324598bb697`.
- acceptance `0.1.0-draft` SHA256 `c4906283810c8b378800b67930028685a41b6a051923ea9f9415346b2d657063`, draft/approved_by null 유지.
- 범위 backend-only 작성자CLI/현재트리자체검사/로컬SQL·API. 새독립review/runner·고정전체서버204·iOS빌드·실Google/폰·클라우드 미실행. 이전runnerERROR/4SKIPPED를 변경하지 않는다. 승인·전체제품PASS·OS격리 아님.

## 다음 작업·기록

최신 미일치26행의 원인행렬과공식증거를 유지한다. 새원천없이 같은페이지를 작품별로 반복하지 말고, 번역·별칭배우/출연진부재/정확제목미발견의 공통식별 경로와 목표OTT첫날 증거를 유형별보강해 준비된전체배치를 검토/게시한다. 스폰지밥20/몰몬교주부들6의시즌미등재,나인투식스Netflix제공처미확인,공식날짜충돌/범위검토도 미해결이다. StreamPick을 수집입력으로 쓰거나 미확인 날짜를 제품에 추가할 사용자승인은 없다.

ADR-020/LEARN-0021·backend README/reviewed-publish·공통6문서 갱신. 앱 원본의 동일revision DATA-54-2026-11-16을 backend/verifier에 복사했다. 앱개인pbxproj/backend.env.example/package.json/기존미추적감사2·테스트2 보존. 후속 독립리뷰는 구현대화/학습해설을 정답으로 주입하지 않는 별도컨텍스트로 원본근거·고정SHA·요구사항만 제공한다. 사용자학습평가 질문 해당없음(측정하지 않음).
