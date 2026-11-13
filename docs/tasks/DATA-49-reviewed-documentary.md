# DATA-49 · 다큐 시리즈 검토 및 로컬 게시

- 요구사항 PROD-004/005/006/007/009, GD-004/005/006/007/009. acceptance0.1.0-draft/c4906283810c8b378800b67930028685a41b6a051923ea9f9415346b2d657063. 기준/승인 변경 없음.
- 상태: 로컬 게시·자체검사 완료, 독립 검증 인계 대기. 담당codex-data49-01. 구현 역할, 순차 작업. 원본backend/docs/tasks/DATA-49-reviewed-documentary.md.
- base: app9c0e0ffe2edb6f9adb295b0b7e667bd3daeb35a2 / backendd24fe56e69e4d24a86be1582a213a102526efe25 / verifier1eaa7165a85920950c66c1f9dbe8e051dfb1c117.
- 세 저장소 branch codex/data49-reviewed-documentary. 별도 동시 작업 없음, 기존checkout에서 순차. 기존dirty: app개인signing pbxproj, backend.env.example/package.json 및 미추적감사스크립트2/테스트2. 읽거나커밋하지않고보존.
- 사용자확정: DATA-48의 OTT영화·시리즈·예능·다큐 범위. 다음작업진행 요청에 따라 로컬migration/검토/게시/SQL·API·멱등성검사. 유료가입/push/클라우드배포 범위아님.
- 범위/완료조건: 로컬DB주소 확인→새migration적용→캐런리드 공식한국날짜/정체성/시리즈형태와 현재후보revision 대조→명시적documentaryFormat=series 검토/고정키→게시→SQL/API/재게시 중복확인. 신규게시수와근거를기록. 근거부족/충돌이면후보보류.
- 예상실패: 해외일자/시각을한국날짜로변환, TMDB제공처없음을최초공개증명으로오인, 시즌1추정, stale매핑강제변경, 기존62개데이터손상, 개발DB를검사중초기화, 비밀노출, 이전runnerERROR를독립PASS로표현.
- 실제실행표/HEAD·digest·인계는아래기록. ADR013/017 재사용(새정책/계약설계없음), LEARN-0011/0015 연결. 사용자이해도/성과추정없음.


## 실제 구현·검사

공식 Tudum(2026-11-09 기사)을 오늘 다시 읽어 다큐 시리즈와11/23 premiere를 확인했다. 연결된 공식 title81777231은Documentary Series/Limited Series/Season1 trailer를 표시했다. 한국 상세 URL은웹도구cache miss였고, 한국신규목록은웹도구가첫페이지만노출해해당행을오늘재조회했다고주장하지않는다. KR일자는현재후보에보존된2026-11-12 공식한국목록 video81777232/11월23일관측을사용했고, DATA-47의공개브라우저원ID→시리즈ID연결과실TMDB tv340615 시즌1/첫회11/23을대조했다. KR watch provider 미등재는날짜근거로쓰지않았다. 회차수3과시즌번호1을혼동하지않았으며시즌1은공식예고편표시+기존TMDB근거다. 날짜만확인돼시각/시간대는null로보존했다.

- 입력 data/curated/netflix-kr-reviewed-documentary-2026-11-13.json. 현재후보revision에명시적documentaryFormat=series/시즌1을검토하고고정키work/event-000063을부여했다. 기존62개prepareReviewed 결과의deepEqual을확인한뒤추가. 실제이전거부DATA-47자료는역사기록으로보존한다.
- 로컬DB호스트검사/미완료migration없는상태/기존62개매핑확인후202611130001 적용. 개발DB reset/삭제없음. 이전migration3개보존.
- 동일KR/11~12월/4OTT/ott_reviewed 범위 **60→61(+1)**, Netflix11월53→54, 연중전체이벤트/고정매핑62→63. 신규1건category=documentary/시즌1/date_only/instantNULL. SQL·임시HTTP200/61건/상세분류·시즌·출처/11월23일달력존재확인. 임시API는finally종료, 기존사용자서버/폰설치변경없음.
- 재게시후전체이벤트63/신규변경이력1유지. SQL에서기존62개event전체row(id/updated_at포함)를게시전과deepEqual검사해변경없음확인.
- 새런타임코드/계약/migration파일/앱코드변경없음. 신규회귀테스트는만들지않고기존추적CJS+ESM전체154/154검사와실SQL/HTTP/반복게시검사실행. 기존미추적테스트5개제외, 고정snapshot검사로표현하지않는다.

Node24 실행파일: `/private/tmp/godieor-data48/node-v24.22.3-darwin-arm64/bin/node`. 아래각행의node는이파일을사용했다. 비밀은무시된.env에서읽고값을로그에출력하지않았다. 임시스크립트사본·실행입력·결과는evidence/data49.

| 실제 명령 | 종료 | 실제 결과 |
|---|---|---|
| node --env-file=.env /private/tmp/godieor-data49/local-preflight.cjs |0|로컬주소/기존62확인후node node_modules/prisma/build/index.js migrate deploy 실행성공. preflight.json과실행후migration목록보존 |
| node node_modules/typescript/bin/tsc -p tsconfig.json |0|현행소스컴파일성공 |
| node --env-file=.env /private/tmp/godieor-data49/apply-review.cjs |0|review1/prepared63/기존62정규화불변. 저장전후state백업은tmp에만 |
| COLLECTION_SCHEDULE_ENABLED=false COLLECTION_INCLUDE_FIXTURE=false CATALOG_PROVIDER_ONLY=true node --env-file=.env /private/tmp/godieor-data49/verify.cjs before |0|DB60/이벤트62/다큐변경0기준저장 |
| node --env-file=.env dist/src/cli/publish-reviewed.js --file data/curated/ott-reviewed-mappings.json (2회) |0/0|63매핑게시성공,재실행중복0 |
| 위3개환경값과 node --env-file=.env /private/tmp/godieor-data49/verify.cjs after 및 repeat |0/0|SQL61/HTTP200·61/분류·날짜·시즌·출처·달력확인,기존62불변/신규변경1유지 |
| node /private/tmp/godieor-data49/test-tracked.cjs |0|git ls-files tests의추적CJS+ESM실행154/154. 전체argv는test-command.json |

API실행에서기존pg동시query deprecation경고를재관측했으며두명령은성공했다. 새장애/수정성과로주장하지않으며원시migration로그는환경정보가있을수있어tmp만유지했다. 영구기록에는migration이름/파일digest/성공상태만남긴다.

## 독립 검증 인계

- app base/head `9c0e0ffe2edb6f9adb295b0b7e667bd3daeb35a2` / 동일(앱코드불변,후속문서커밋제외).
- backend base `d24fe56e69e4d24a86be1582a213a102526efe25` / 데이터head `a5810166aa976ee0838ad08922c1ffb24af66410` (카드/근거문서최종커밋제외).
- verifier base `1eaa7165a85920950c66c1f9dbe8e051dfb1c117`, 신규runner/독립review미실행. 이후학습·공통인계문서만갱신.
- 계약0.1.0-draft.4 manifest SHA256 `96cc08536324f8b5a7c537783caa93a1ce33de533526032e01621282fb601122`, migration집합 runner SHA256 `853337eadc11cd3c8c619c9e53d961cb7eead5fe0a79368c5d167324598bb697`. 파일실물재계산,이전DATA-48과동일.
- acceptance0.1.0-draft SHA256 c4906283810c8b378800b67930028685a41b6a051923ea9f9415346b2d657063, 미승인불변.
- 범위backend-only 작성자실DB·API검사. DATA-48 secret-check runtime환경참조1탐지FAIL/필수SKIPPED/전체ERROR를그대로인계한다. 이번데이터게시를그finding해결/새통합PASS로표현하지않는다. 실폰/클라우드/독립새컨텍스트리뷰/OS격리미실행.

## 다음 개발 세션 인계

- 현재로컬기능: 다큐migration적용과검토1게시완료. 다른장치에서는무시된후보state/.env/DB가자동전달되지않으므로공식lineup+curated review·매핑과migration으로재현해야한다.
- 다음: 다른OTT공식한국일정근거확대, PAW정체성/남은날짜차이검토. secret literal규칙탐지는독립소유자검토. 계정전환/개인설정왕복·실폰최신화·클라우드는별도미완료.
- status/handoff3개사본·OTT전용인계·게시안내·LEARN-0011작성자관측갱신. 기존개인dirty보존. push없음.
- 새ADR없음: ADR013고정키·017다큐형태결정을기존정책대로적용. LEARN-0011/0015관련,기존유형지원과실제게시의분리를실행증거로보완. 담당codex-data49-01해제. 최종SHA는Git이력에서조회(자기SHA미기재).

- 종료검사: 세 저장소 git diff --check exit0, 공통문서 바이트동일/전체63개매핑의현재review revision 일치/새review저장/HTTP after-repeat동일/신규변경1/JSON파싱 검사 exit0. 신규source fixture를구현출력으로생성한테스트없음.
