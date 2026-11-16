# DATA-53 · StreamPick 신작·시즌 첫 공개 대조와 누락 개선

- 요구사항 PROD-005/006/007/009, GD-005/006/007/009. 상태: 수집·검증 구현/자체검사 완료·인계 대기(전체 항목 일치 목표 미완료). 담당 codex-parity-02 종료 시 해제, 구현 역할.
- 사용자 확정 2026-11-13: OTT 개수를 최소 StreamPick 기준에 맞추는 작업 최우선. 추가 답변: 신작·시즌 첫 공개부터 일치, 회차 확장 제외. 단순 총수 충족 대신 참조 항목별 작품/시즌/4OTT/날짜 대조와 미일치 사유·기술 해결을 추적.
- branch codex/ott-streampick-parity, 기존checkout 순차/동시 작업 없음.
- base {'godieor-app': '000c6920451988becfc316152074e86d6c75815f', 'godieor-backend': 'a3ef02177d2135045880489c02c6da1bba2a3fb7', 'godieor-verifier': '9e865751c7bdfcf7f7b3c012198c47e0f090e2dc'}. 기존 앱 개인pbxproj/backend.env.example/package.json/미추적 감사2개·테스트2개 보존, 비밀 출력/일괄 stage 금지.
- 범위: 최신 공개 StreamPick 2026-11~12월 HTML 신작 전체 재추출, 로컬DB 읽기·양방향 항목 대조, 후보→review→게시/API 코드 점검. 공통 로직 결함은 묶어 수정하고 준비된 항목 전체를 1회 배치 처리, 반복 중복·기존행 불변 확인. 미확인 날짜·시즌을 추정하지 않는다.
- 예상 실패: 885/회차703과 신작15의 모수 혼동, 이전 저장본을 최신으로 표기, 타 OTT 가용성으로 해당OTT 첫날 생성, 제목만/시즌미상 매칭, 다른 신규 작품으로 총수만 채움, 접근 실패를 작품 부재로 판정, 기존 개인dirty 포함 커밋, 자체 검사로 독립 판정 변경.
- 완료 조건: 최신 동일 모수 비교표·참조별 coverage와 실제 DB/API 확인, 원인 분류/로직 검사 및 실행명령 보존. 미해결은 수량·재개 조건을 명시하고 전체 일치라고 주장하지 않음.
- 계약/마이그레이션/acceptance·독립판정 변경 계획 없음. ADR/학습·실행 증거·공통 사본은 종료 시 갱신.

## 2026-11-13 사용자 방향 보완 · 진행 범위 확장

사용자는 미확인 일정 표시 도입을 선택하지 않았다. 공식 데이터의 정확성을 질문하고, StreamPick이 TMDB로 목록을 구성하는 방식을 역추적하여 TMDB 기반 수집→TMDB 검증+OTT 공식 루트 교차 검증→배치 적재 로직을 만들도록 명확히 지시했다. 개별 작품의 공식 증거 부족을 이유로 보류하는 작업 반복이 목표가 아니다. 신작·시즌 첫 공개/회차 제외는 유지한다.

추가 구현: 독립적인 월별 TMDB discover→기존 시리즈의 해당월 시즌 탐색→시즌/첫 회 날짜·KR 시즌별 제공처 분리→공식 근거 결합→검토/기존 publish 경로 연결. StreamPick ID/날짜를 수집 입력으로 복제해 재현율을 올리지 않고 별도 참조 대조로만 측정한다. 이전 인기순5페이지/series first_air_date만으로 발견하던 한계를 처리한다. 공식 루트는 OTT 정식API가 아니며 원문 관측/파싱임을 명시한다. 실제 StreamPick 내부 소스 코드를 확보한 것이 아니라 공개 출처/응답으로 추론하는 범위다.

핵심 추가 가설: 시리즈 단위 watch/providers를 새 시즌 전체에 투영하여 다른 OTT의 새 시즌이 잘못 매핑된다. TMDB 공식 season watch/providers endpoint와 실제 비교하고 오류/부재를 구분한다. 영화 원개봉일과 한국 OTT 입점일도 별도 보존한다. 기존 데이터의 전수 정확성/독립PASS는 주장하지 않는다.

## 2026-11-16 재개

담당 codex-parity-02 인계, 기존 codex/ott-streampick-parity checkout 순차 사용. HEAD/dirty는 초기 base와 동일하고 DATA-53 미커밋 구현·실행 자료를 이어받았다. 기존 개인dirty 보존. 중단된 수집/검증 연결의 경계 검사·최신 대조·전체 검사·문서/커밋을 완료한다. 이전 11/13 관측을 11/16 최신 수치로 재사용하지 않는다.


## 구현·실행 결과 (11/13 초기 배치와 11/16 재개 구분)

- 초기 Python 참조 파서의 새 시즌 누락26행을 수정했다. StreamPick 참조와 TMDB 수집 입력은 분리했다. 최신 참조는52행(과거47행 아님), 고정 TMDB ID·시즌·국가·플랫폼·날짜로 영문/부제도 비교하므로 작품별 별칭을 계속 추가하지 않는다.
- 수집 본선: TMDB 월별 air_date/first_air_date/영화 날짜·KR 제공처 + 제공처 미등록 한국 예정작→작품 상세/해당월 시즌/첫회→시리즈 힌트와 시즌 제공처 분리→공식 검토ID 결속→Netflix KR 전체 페이지/TVING 명시 공개문구·작품ID 재확인→review/revision/고정 게시 키 검증. OTT 정식API라고 표현하지 않는다.
- 11/16 실제 독립 discover312작품, 공식ID 보완 후325작품, 현재 후보120행/이력 포함123ID. 후보120행 중 공식 원문 재확인39행을 기존69개 매핑과 결속, 새 고정키0/blocked0. 공식 재확인 검토 근거 전체에 대한 상태는 matched43/미지원파서4/조회실패2이며 candidate39와 다른 집계다.
- 후보 기준 참조52행 중49행의 ID·시즌·OTT·날짜 발견. 미발견2는 스폰지밥 시즌20/몰몬교주부들 시즌6의 TMDB 시즌 확인 문제. 나인투식스1행은 작품/날짜 후보를 찾았지만Netflix 제공처 미확인. 애니 후보도 큐에서 삭제하지 않고 scopeHold로 유지, 기존 제품 분류와 차이는 후속 검토한다.
- 실제 게시67행/전체69이벤트 유지, 참조와 제품 일치26/52로 전체 일치 목표는 미완료다. 공식/TMDB 검토를 거치지 않은 후보를 게시하지 않았다. 공식 루트 자동 재확인은 현재 Netflix/TVING 파서가 지원하며 Disney+/Coupang 및 다른 공지 형식은 미지원·실패를 명시한다.
- 11/13에 공식 새 시즌4개(TVING3/Disney+1) 신규·기존4개 미상 시즌 보완을 한 묶음 게시했다. 11/16에는 신규 제품 일정0, SQL/API/이력/기존ID 보존 재검사만 수행했다. 실제 사용자 장애·실폰 관찰 아님.

## 실제 검사 명령/결과

Node는 `/private/tmp/godieor-data48/node-v24.22.3-darwin-arm64/bin/node` 사용. .env는 backend 프로세스에만 주입하고 값/URL은 출력하지 않았다.

| 명령 | 종료 | 관찰/근거 |
|---|---|---|
| `node node_modules/typescript/bin/tsc -p tsconfig.json` | 0 | 현재 backend 컴파일 |
| `sh scripts/check-streampick-parity.sh /private/tmp/godieor-data53/check-20261116` | 2 | 최신참조52/DB67/제목·기존별칭일치25, 미달 유지 |
| `node --env-file=.env scripts/audit-ott-published.mjs <동일reference.json> data/reference/ott-parity-verified-aliases-2026-11-13.json --identity-bindings=data/curated/ott-official-tmdb-bindings-2026-11-13.json --require-parity` | 2 | TMDB 안정ID 결속 후26/52, 날짜충돌2/미게시24. 코드로 총수를 통과 판정에 쓰지 않음 |
| `node --env-file=.env scripts/collect-tmdb-release-candidates.mjs work/tmdb-release-candidates data/curated/ott-official-tmdb-bindings-2026-11-13.json` | 2 | errors0이나Coupang영화 provider ID 미등재로discoveryComplete=false. 현재120/저장123/공식재확인39, 참조입력 미사용 |
| `node scripts/prepare-tmdb-reviewed-batch.mjs work/tmdb-release-candidates/latest.json data/curated/ott-official-tmdb-bindings-2026-11-13.json <새output.json>` | 0 | 신선한교차검증39/기존69고정매핑/새키0/blocked0. DB 쓰기 아님 |
| 실제 latest/state에 `mergeCandidateState` 재처리 | 0 | created0/revised0/unchanged120/stored123. 두 번째 실API관측을 뜻하지 않음 |
| 추적 CJS+ESM + 신규 자체검사 `node --test <선택 파일 목록>` | 0 | 183/183, 기존 개인 미추적 감사테스트2개 제외. 정확한argv는evidence/2026-11-16/test-command.json |
| `python3 -m unittest discover -s scripts -p test_audit_streampick_calendar.py -v` | 0 | 9/9 |
| `COLLECTION_SCHEDULE_ENABLED=false COLLECTION_INCLUDE_FIXTURE=false CATALOG_PROVIDER_ONLY=true node --env-file=.env <verify-current.cjs> repeat` | 0 | SQL69/window67·HTTP200/67·원4개보완/새4개상세/기존61전체행·ID/반복이력불변 |

고정 소스의 최초 빌드는 Git 제외 Prisma Client가 없어 실패했다. 제품코드 오류/통과로 숨기지 않았다. `prisma generate --schema prisma/schema.prisma` 선행 조건을 추가한 동일 커밋의 재검사 결과는 종료 근거에 기록한다. 작업트리183통과와 고정 소스 결과는 구분한다. 고정 c6ce3af에서 Prisma generate exit0→tsc exit0→같은183/183통과를 최종 확인했으며 fixed-source-summary.json/fixed-server-tests.log에 보존했다. 기존 pg 동시 query deprecation 경고는 SQL/API 실행에서도 관측됐으며 수정 범위가 아니다.

## 독립 검증 handoff

- app base/head `000c6920451988becfc316152074e86d6c75815f` (이후 문서만). backend base `a3ef02177d2135045880489c02c6da1bba2a3fb7` / 구현·배치·실행근거 head `c6ce3af89833265d9729b81bbb5be89894ec9f97` (종료문서후속제외).
- verifier base `9e865751c7bdfcf7f7b3c012198c47e0f090e2dc`, 이후 공통문서/LEARN-0021 초안만 변경.
- 계약 `0.1.0-draft.4` manifest SHA256 `96cc08536324f8b5a7c537783caa93a1ce33de533526032e01621282fb601122`.
- migration runner digest `853337eadc11cd3c8c619c9e53d961cb7eead5fe0a79368c5d167324598bb697`.
- acceptance `0.1.0-draft` / `c4906283810c8b378800b67930028685a41b6a051923ea9f9415346b2d657063`, draft/approved_by null 유지.
- 작성자 backend-only 검사. 신규 독립runner/AI review/실폰/클라우드/OS격리 미실행. 이전runnerERROR/필수4 SKIPPED/미승인기준은 변경하지 않는다.
- ADR-020 / LEARN-0021. 실제 기술선택/원시실행근거는 backend 원본, 사용자 이해/측정 성과 주장 없음.

## 다음 세션 인계

- 최우선 유지: 참조로 수집 목록을 복제하지 않고 TMDB 기반 발견을 보완하며, 발견된 묶음의 공식 루트·안정ID·날짜 검증을 확장해 전체 배치로 연결한다. 작품별 임의 enum/예외 추가·하나씩 게시로 되돌아가지 않는다.
- 공식 자동 파서 미지원4/조회실패2 및 후보 미발견2/목표OTT미확인1을 원인별로 해결한다. 후보49/52와 실제제품26/52를 혼동하지 않는다. 제품 DB 전체 정확성을 보장하지 않는다.
- 중단됐던 미커밋 구현·배치·실행 근거는 검토 단위로 커밋했다. 기존 .env.example/package.json/미추적 감사도구·테스트2쌍/앱 pbxproj 보존. push/가입/배포 없음.
- 공통 status/handoff/plan/policies/OTT인계·백로그 사본을 함께 갱신하고 종료 후 context export/check 수행. 담당 해제, 최종 SHA는 Git 이력/전달본에서 확인.
