# DATA-51 · 티빙 공식 작품별 날짜 확인

- 요구사항 PROD-004/005/006/007/009, GD-004/005/006/007/009. acceptance draft/승인상태불변.
- 상태 구현·로컬게시·자체검사완료/독립검증인계대기, 담당codex-data51-01, 구현역할/순차작업. 원본backend/docs/tasks/DATA-51-tving-dates.md.
- base app1d9b3ad19e043788f4ddb5323138e4c3f59f7a03 / backend8bf03cbc194d44e4081d0b08f968f32db05100f3 / verifier21470dda7efef92b9df68326beb0e987ea1b4991.
- branch 세곳codex/data51-tving-dates. 기존checkout순차,동시구현없음. 기존개인app pbxproj/backend.env.example/package.json/미추적감사스크립트2·테스트2보존.
- 범위/완료조건: DATA-50티빙5개 공식작품/일정UI에서한국최초제공날짜·형태·시즌정밀도확인. 확인된일자만추가lineup/검토/고정키/로컬게시·SQL/API·반복게시검사. 부족한항목은이유/필요근거와함께보류. 방송첫날이나CJ기사게시일을복사하지않음.
- 예상실패: 가용성/방송일=OTT최초일추정,시즌1추정,동명다른작품연결,AppleTV브랜드관=AppleTV원서비스이벤트혼합,stale매핑강제수정,기존63이벤트변경,미정달력배치,비밀노출,작성자검사를독립승인으로표현.
- 공개사이트읽기만허용된범위로진행,로그인/재생/가입/설치없음. 실제환경값은로그에출력하지않음. ADR013/017기존근거/고정키원칙, LEARN-0011연결. 종료전실제명령/HEAD·digest/공통인계갱신.

## 공개 UI 확인 후 추가 변경 범위

문무 공식TVING작품P001791650에서11월14일공개확인. 기존게시후보source enum은CJ뉴스만허용해직접TVING작품URL을검토·출처로연결할수없었다. source=tving(수동/피드없음)을추가하고정확한www.tving.com/contents/P숫자경로만허용한다. API공개이벤트/계약/migration변경없이기존검토→게시경로를재사용한다. 같은호스트의login/player/live와외부호스트·임의query는거부검사. 기존source·키·revision불변을회귀검사한다. 시즌개수1은시즌번호1의근거로쓰지않고문무시즌은null로보존한다.


## 실제 변경·공식 UI 관측

TVING 공개 홈의작품링크→작품상세/검색/이번주콘텐츠UI에서5개모두직접읽었다. 사이트로그인·재생·찜·구독·가입은없었다. 문무는현재주간토14일행과P001791650상세에11월14일공개를표시했다. 연도는현재11월2026일정/CJ2026-11-13기사와동일작품·출연진연결로확인했다. 21:20은방영시각이고실제티빙시청시점차이안내가있어시각추정없이date_only로저장했다. 시즌1개는개수이므로번호null을보존했다.

- 뜨거운안녕P001793179/보스의노골적취향P001794080은첫회와배우/방송시간이보였으나첫TVING날짜미확인. 내새끼의연애3 P001793786은제목에서시즌3확인/날짜미확인. 브라더스P001791924는AppleTV브랜드시리즈/매튜·우디/명시적시즌1을동명영화와구분했지만첫TVING날짜는미확인. 나머지4개계속보류,방송일·AppleTV다른원서비스날짜를이식안함.
- 새수동source=tving은정확한HTTPS www.tving.com/contents/P숫자경로만허용. player/live/login/다른호스트/임의query거부. source_page_type추적없는검토한permalink사용. 자동RSS원천엔추가안함. source=tving을다른platform으로검토하면eligibility보류. 기존API계약/DBmigration/이전63개키불변. ADR018·합성회귀2개추가.
- 문무KR TVING11/14/시즌null/series를현재revision에검토,work/event-000064고정. 신규source후보1·prepare64전처리전후기존63정규화불변. sourceURL은실제날짜가있는공식작품URL로보존(CJ기사게시일대체없음). 기존Netflix문무미확인후보와별개다.
- 로컬63매핑→64매핑게시. 같은11~12월KR4OTT범위 **61→62(+1)**, 연중64,Netflix11월54유지. SQL과임시HTTP200/62행/신규ID·TVING·date_only·instantNULL·seasonNULL·출처permalink확인. 11/14달력일존재확인. 재게시후이벤트64/신규변경이력1,기존63개event전체row(id/updated_at포함)deepEqual불변. 임시API는finally종료했다.
- lineup확정원문후보1(기존CJ미정관측원본보존), staging174→175/재실행신규0. 이출처별후보수는고유작품수나제품이벤트수가아니다.

## 실제 명령·결과

node는 /private/tmp/godieor-data48/node-v24.22.3-darwin-arm64/bin/node. 비밀설정은무시된.env로만읽고출력안함. recipe/원입력/검사결과는evidence/data51.

| 실제 명령 | 종료 | 결과 |
|---|---|---|
| node node_modules/typescript/bin/tsc -p tsconfig.json |0/0|수동원천구현및타플랫폼차단수정후컴파일 |
| node --test tests/candidates.test.cjs tests/reviewed-publish.test.cjs |0/0|수정전후38/38. 정확한URL·피드미등록·원천platform·날짜/시즌보존회귀 |
| node --env-file=.env /private/tmp/godieor-data51/apply.cjs |0|review1/prepared64/기존63불변,이전state/매핑은tmp백업 |
| COLLECTION_SCHEDULE_ENABLED=false COLLECTION_INCLUDE_FIXTURE=false CATALOG_PROVIDER_ONLY=true node --env-file=.env /private/tmp/godieor-data51/verify.cjs before |0|SQL61/연중63/신규변경0 |
| node --env-file=.env dist/src/cli/publish-reviewed.js --file data/curated/ott-reviewed-mappings.json (2회) |0/0|64매핑게시성공 |
| 위3환경값으로 verify.cjs after/repeat (repeat는최종차단수정후추가실행) |0/0/0|SQL62/API200/신규TVINGdate-only·seasonnull·공식출처/기존63불변/신규변경1유지 |
| node scripts/stage-ott-lineup.mjs data/lineups/tving-kr-2026-11-munmu-premiere-confirmed.json work/ott-lineups (2회) |0/0|created1→0/stored175 |
| node /private/tmp/godieor-data51/test-tracked.cjs |0|git ls-files의추적CJS/ESM156/156,별도working-tree자체검사. 기존미추적검사제외 |
| fixed runner 최초 (retry argv에서out만/private/tmp/godieor-data51-fixed-run) |3|iOS성공,Prisma generate ECONNRESET로compile/tests/DB단계미도달. first-generate-error.log |
| fixed runner 재시도 (전체argv runner-command.json) |3|node-version=0, boundary-probe=0, ios-build=0, dependencies=0, generate=0, compile=0, backend-tests=0, migration=0, api-event-identity=0, api-time-semantics=0, api-api-filter-observations=0, database-smoke=0, secret-check=1; 전체ERROR |

API실행의기존pg동시query deprecation경고를재관측했으나검사는성공했다. 이번에해결했다고주장하지않음. 기존secret-check가official-sources.ts런타임환경변수참조를탐지한finding은판정변경없이유지. acceptance미승인/reviewPENDING/필수SKIPPED도유지된다. 자체/고정source검사와독립새컨텍스트리뷰·제품PASS는구분한다.

## 독립 검증 인계

- app base/head `1d9b3ad19e043788f4ddb5323138e4c3f59f7a03` / `1d9b3ad19e043788f4ddb5323138e4c3f59f7a03` (이후문서커밋제외).
- backend base/head `8bf03cbc194d44e4081d0b08f968f32db05100f3` / `6b97697a3db87c3ec40cf3d81c459da9e35daf9b` (이후카드/근거문서커밋제외).
- verifier `21470dda7efef92b9df68326beb0e987ea1b4991`, 실행시dirty=false.
- 계약 `0.1.0-draft.4` manifest SHA256 `96cc08536324f8b5a7c537783caa93a1ce33de533526032e01621282fb601122`, migration집합runner SHA256 `853337eadc11cd3c8c619c9e53d961cb7eead5fe0a79368c5d167324598bb697`. 변경없음.
- acceptance `0.1.0-draft` SHA256 `c4906283810c8b378800b67930028685a41b6a051923ea9f9415346b2d657063`,미승인불변.
- 범위local integration components/작성자실행. 실제DB게시결과와일회용합성runner를혼동하지않음. 전체ERROR/독립review미실행/OS격리미검증. 실폰최신표시·클라우드·liveGoogle/설정왕복미실행.

## 다음 개발 세션 인계·학습

- 현로컬62건/연중64매핑. 문무TVING일정게시완료;Netflix문무미확인과동일처리하지않는다. 남은4개TVING첫날과기존3개목표OTT미확인근거확보를계속한다. 같은가용성화면만다시읽어날짜를추정하지않는다.
- 공식원천source지원과날짜검토를분리했다. ADR018결정,LEARN-0011작성자관측연결. 지원코드·측정·실제게시·독립승인경계를유지하며성과/사용자이해도를추정하지않는다.
- status/handoff3사본·OTT전용인계·게시안내·학습갱신,기존개인dirty보존. 담당codex-data51-01해제. 최종커밋SHA는Git이력조회(자기SHA미기재).


## 중단 복구와 종료

직전 실행에서는 자동 승인 검토의 사용량 한도로 마지막 finalize 명령이 실행되지 않았다. 안전성 거절이 아니라 검토 실행 실패였으며 우회하지 않았다. 사용자의 마무리 요청 후 같은 명령을 다시 요청해 허용 실행(exit0)했고 기존 결과로 카드·근거를 저장했다. 제품 게시/테스트를 중복 실행하지 않았다. 이번 후속 작업은 근거 저장·공통 인계·선별 커밋·최종 사본/입력검사다. 최초 실패와 재시도 결과는 그대로 남겼다.

종료 검사: 공통 status/handoff 세 사본 바이트 동일, 최종 runner SHA·계약·migration digest와 카드 일치, 전체64개 현재review/매핑revision·고정키 유일성, SQL/API after-repeat62건/연중64/신규이력1/기존63불변 확인. 세 저장소 git diff --check exit0. 이번 문서 마무리 후 실제 검사한 코드HEAD와 문서 최종HEAD를 구분한다.
