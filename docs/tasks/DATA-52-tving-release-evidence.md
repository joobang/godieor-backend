# DATA-52 · 남은 티빙 4개 첫 공개일 근거 보강

- 요구사항 PROD-004/005/006/007/009, GD-004/005/006/007/009. acceptance draft/승인 상태 불변.
- 상태 로컬게시·자체검사완료/독립검증인계대기, 담당 codex-data52-01, 구현 역할/순차 작업. 원본 backend/docs/tasks/DATA-52-tving-release-evidence.md.
- base app a250e16b70fdcf181898ba05f27a53f1318736c1 / backend e7bd91474af3cc5f36920931d7a33b41596f02bf / verifier 3d52aab77bfb2ae6e6d1c01b9043423177ecb88a.
- branch 세곳 codex/data52-tving-release-evidence. 기존checkout 순차/동시작업없음. app개인pbxproj/backend.env.example/package.json/미추적감사스크립트2·테스트2보존. 민감값수동조회/로그/커밋금지.
- 범위/완료조건: 뜨거운안녕·보스의노골적취향·내새끼의연애3·브라더스의정확한한국TVING첫날을공식출처로확인. 충분한경우기존source=tving검토/고정키/로컬게시/SQL·API·반복게시확인. 미확인은필요근거와함께보류. 제품정책/계약/승인상태변경없음.
- 예상실패: 미러된공식SNS문구를직접원문관측으로오인,방송일과OTT일자혼동,브랜드관과원서비스날짜혼합,시즌개수를번호로추정,기존64행손상/중복게시,이전전체ERROR를독립PASS로표현.
- ADR013/018 기존근거·고정키·수동TVING경로, LEARN-0011연결. 실제명령/결과·SHA·digest·공통인계는종료전갱신.


## 실제 근거와 변경

- 뜨거운안녕: 미러검색에서발견한공식permalink를웹open했으나cache miss. 공개브라우저첫탐색도timeout됐지만생성된동일탭을다시읽자로그인없이인증tving.official의실제캡션이보였다. TVING 11월11일독점공개를명시했고공식작품P001793179/강훈·조현철·김정진태그와동일작품을확인했다. DOM의공개time datetime=2026-11-11T12:01:08.000Z는연도문맥검증에만썼다. 게시일·게시시각을공개instant로복사하지않았다. 다른게시물하나도읽었으나대탈출공지여서대상4개근거에사용하지않았다. 로그인/좋아요/팔로우/가입/수동재생없이읽기만수행했다.
- source=tving/공식작품permalink와현재revision을기존경로로등록하고work/event-000065고정키를추가. 문구가확인된2026-11-11/date_only/시즌null로검토했다. 시즌1개표기는시즌번호근거가아니다. 전체65개prepareReviewed결과에서기존64개정규화deepEqual불변확인. API출처는공식작품링크이고,정확한날짜근거SNS URL은curatedreview/관측파일에별도로보존한다. SNS host/query허용범위나게시규칙을확대하지않았다.
- 보스의노골적취향은발견자료방송11/11·가용성첫관측11/13을구분,내새끼의연애3는제3자11/05·방송11/11을구분해계속보류했다. 브라더스는기존AppleTV브랜드관작품/시즌1근거만유지. 세작품에새공식TVING첫날을확인하지못했으며제공없음을뜻하지않는다. 이전DATA-51원문은덮어쓰지않는다.
- 같은11~12월KR4OTT/ott_reviewed 실제로컬DB **62→63(+1)**, 연중이벤트/매핑64→65. 신규TVING11/11·series·date_only·instantNULL·seasonNULL. SQL/임시HTTP200·63행/상세출처·날짜·시즌null과11/11달력일확인. 재게시후65/신규변경이력1유지,기존64개event전체row불변. 임시API는finally종료했다.
- source별lineup확정관측1개추가(staging175→176,재실행신규0). 기존CJ미정원문은관측이력으로보존한다. staging은고유작품수/실제게시이벤트수와다르다.
- 앱/런타임코드/계약/마이그레이션/승인기준변경없음. 신규fixture미러테스트를만들지않고기존추적CJS+ESM156/156실행. 전체fixed runner/iOS재빌드/독립review는이번에미실행이며DATA-51결과와구분한다. 기존pg동시query deprecation경고를재관측했으나SQL/API검사는성공했다.

## 실제 명령·결과

node는 /private/tmp/godieor-data48/node-v24.22.3-darwin-arm64/bin/node. 각행에서이파일실행. 민감값은무시된.env로로드하고출력하지않았다. 실제recipe/결과는evidence/data52.

| 명령 | 종료 | 관측 |
|---|---|---|
| node --env-file=.env /private/tmp/godieor-data52/apply.cjs |0|review1/prepared65/기존64정규화불변;이전state/매핑tmp백업 |
| COLLECTION_SCHEDULE_ENABLED=false COLLECTION_INCLUDE_FIXTURE=false CATALOG_PROVIDER_ONLY=true node --env-file=.env /private/tmp/godieor-data52/verify.cjs before |0|SQL62/전체64/신규이력0기준 |
| node --env-file=.env dist/src/cli/publish-reviewed.js --file data/curated/ott-reviewed-mappings.json (2회) |0/0|전체65게시;새이벤트1 |
| 위3환경값으로 verify.cjs after/repeat |0/0|SQL/API63/공식작품출처/date_only/seasonnull,기존64불변/신규이력1유지 |
| node /private/tmp/godieor-data52/test-tracked.cjs |0|추적CJS+ESM156/156,기존미추적검사제외. argv는test-command.json |
| node scripts/stage-ott-lineup.mjs data/lineups/tving-kr-2026-11-happy-anding-premiere-confirmed.json work/ott-lineups (2회) |0/0|created1→0/stored176 |

## 독립 검증 인계

- app base/head a250e16b70fdcf181898ba05f27a53f1318736c1/동일(후속문서커밋제외).
- backend base e7bd91474af3cc5f36920931d7a33b41596f02bf / 데이터head db66c4eb0a8f6a0435de972003633f75a80b3bcd(후속근거/카드제외).
- verifier base3d52aab77bfb2ae6e6d1c01b9043423177ecb88a. 이후공통문서/학습만수정. 신규runner/verdict/독립review없음.
- 계약0.1.0-draft.4 manifest SHA256 `96cc08536324f8b5a7c537783caa93a1ce33de533526032e01621282fb601122` / migration집합runner SHA256 `853337eadc11cd3c8c619c9e53d961cb7eead5fe0a79368c5d167324598bb697`, 파일재계산/불변.
- acceptance0.1.0-draft SHA256 c4906283810c8b378800b67930028685a41b6a051923ea9f9415346b2d657063/미승인불변.
- 범위backend-only 작성자실DB/API·working-tree검사. DATA-51 secret-rule런타임환경변수참조탐지FAIL/필수SKIPPED/전체ERROR는미해결그대로다. 실폰최신표시·클라우드·OS격리·독립리뷰미실행. 이번게시를전체제품PASS로표현하지않는다.

## 다음 개발 세션 인계·학습

- 현재실제기간63건/연중65매핑. 뜨거운안녕일자확보완료. 남은보스의노골적취향/내새끼의연애3/브라더스의TVING첫날은새공식일자근거가필요하다. 기존전지적집착시점·문무Netflix·나인투식스Netflix3개미확인도분리유지.
- 새ADR없음: ADR013/018수동원천·근거·고정키원칙적용. LEARN-0011에미러발견/공식직접관측/게시시각과공개일분리를실제관측으로연결했다. 사용자이해도·성과추정없음.
- status/handoff3사본·OTT전용인계·게시안내·학습갱신. 기존개인dirty보존. 담당codex-data52-01해제. 최종SHA는Git이력조회(자기SHA미기재).

종료검사: 공통사본바이트동일/65고정키유일·현재review revision일치/신규review원본저장/SQL·API after-repeat63·신규이력1·기존64불변/JSON파싱·계약지문불변 확인 exit0. 세 저장소 git diff --check exit0. 전체SQL게시전행은tmp에두고영구근거에는hash/수량요약을남겼다.
