# DATA-56 · OTT 애니 정식 지원·기존 분류 전수 보정

- 요구사항 PROD-005/006/007/009, GD-005/006/007/009. 상태 인계 대기, 담당 codex-route-discovery-01 해제(이번 구현 자체검사 완료/전체누락 해소 미완료).
- base {'godieor-app': 'a09bf1258a38de60f1578d1b7fa4a778f5d8550d', 'godieor-backend': '2554856dbd213105f41cb394d7731e55ebf5ce29', 'godieor-verifier': 'c2c5b659a02966d592fba8e5138754800d4529f8'}. 세곳 codex/ott-official-route-discovery, 기존checkout순차·동시수정없음. 개인pbxproj/backend.env.example/package.json/기존미추적감사2·테스트2보존.
- 사용자확정: OTT참조누락최우선,TMDB독립발견→TMDB/공식경로교차검증,신작·시즌첫공개/회차제외. StreamPick은측정용이며수집입력복제없음.
- 범위: 기존검토binding에없는새TMDB후보가공식검증경로를발견하지못하는구조를점검하고,공개homepage·시즌목록등안전한공식URL연결로전체배치검토기회를확대한다. 실제미일치26행/DB68행은기준관측이며최신재측정과구분.
- 예상실패: TMDB홈페이지URL을검토승인으로간주,외부redirect/사설주소요청,시리즈옛시즌홈페이지를새시즌증거로재사용,정확한날짜없는가용성을첫공개로취급,경로미발견을제공없음으로확정,참조행을수집seed로이식.
- 완료조건: 발견경로/검증경로분리·실제후보전체실행·유형별실패보존·관련검사/고정소스검사·가능한전체검토배치와DB/API·참조게이트재확인. 새근거없으면근거미달을정확히기록.
- ADR020/LEARN0021연결. API/마이그레이션/acceptance/verdict변경계획없음. 작업결과·공통사본·실행명령/실패를종료전갱신.

## 사용자 응답에 따른 범위 갱신 · 2026-11-16

사용자가 ‘애니도 포함해 OTT 전체 대조’를 선택했다. 작업제목/branch는OTT애니영화·시리즈정식지원으로갱신한다. 최초공식경로진단은읽기전용관측으로보존(114작품중홈페이지35/OTT공식19,셰틀랜드공식기존페이지는시즌1/명시공개일없음)하며독립발견구조제안은후속으로남긴다. 이번은검토형태·정규화·새DB제약/API초안·앱배지·기존잘못된분류배치보정·실제SQL/API/고정소스검사까지처리한다. 참조애니5행은정확한OTT/시즌날짜근거가없으면게시하지않는다. 예상추가실패: 애니영화시즌추정,기존DBID변경,그냥범위hold만해제하고잘못된분류유지,과거migration수정/미승인acceptance변경.

## 최종 결과 · 사용자 확정 범위 반영

상태 인계 대기, 담당 codex-route-discovery-01 해제. 작업명은OTT애니영화·시리즈지원/기존분류전수보정으로갱신했고현재세branch는codex/ott-animation-support다. 이구현단위는자체검사완료,사용자최우선전체참조누락해소는미완료다.

- animationFormat=movie|series명시,영화형시즌금지/다큐형태필드혼용금지. 내부movie|drama와외부ottCategory=animation을분리했다. 새migration202611160001/API초안draft.5/앱‘OTT · 애니’표시를같이연결했다. 과거migration/기준/verdict불변.
- 먼저fresh공식연결의3개를보정한뒤기존70개전체대조에서배스X마키나1개를추가발견해최종4개를보정했다. 단일DB트랜잭션/한번의게시라고쓰지않는다. 원본 `data/curated/ott-animation-reclassified-2026-11-16.json`. 스텝스(movie)·풀나이트(series1)·두지의멍멍하우스(series1)·배스X마키나(series1)의분류보정이며일정신규0이다. 배스의기존공식애니근거와TMDBgenre16을대조했고공식NetflixKR목록에서도11/03을재조회했다.
- SQL/API기간68행/연중70이벤트,전체ID·날짜·시즌·플랫폼불변/다른66event전체행·변경이력불변,반복게시이력증가0. 실제앱폰화면관측아님.
- 실제참조52행/정확26/미일치26·gateexit2유지. **애니는전체참조6행이며그중미일치5행**이다. 초기질문의5를전체애니수로사용하지않도록바로잡았으며애니포함승인은전체에적용한다. 애니미일치5행에정확한한국OTT/시즌날짜근거가없으면게시하지않는다. 전체52행표는evidence/data56/case-matrix.md.
- 현재독립TMDB후보120행/누적124ID/48fresh(이전45),신규0·120revision. 새형태힌트필드추가로일반후보의null필드까지revision에영향을준것을포함,120작품의일정변경/제품증가를뜻하지않는다. 실제동일관측replay0신규/0수정. Coupang영화provider미등재incomplete유지.

## 실제 실행·실패와 검사

Node `/private/tmp/godieor-data48/node-v24.22.3-darwin-arm64/bin/node`(24.22.3). 비밀값은backend.env에서만주입,명령/소스/fixture/증거에값없음. 실행도구원본·로그·결과는evidence/data56/.

| 실제 명령/실행 | 종료 | 결과 |
|---|---|---|
| `node --env-file=.env /private/tmp/godieor-data56/probe-homepages.mjs` + 공식셰틀랜드페이지curl |0| 응답전읽기전용진단114작품/homepage35/OTT공식19. 기존셰틀랜드시즌1/공개문구없음. 경로수집기구현/새시즌일자확인아님 |
| `node node_modules/typescript/bin/tsc` |0| 애니검토/정규화/APIoptions 새빌드. build.log로컬원본 |
| `node --test tests/reviewed-publish.test.cjs tests/contract-integrity.test.cjs tests/tmdb-release-candidates.test.mjs` |0| 관련37/37. 형태·시즌/비OTT·다른매체/공식근거없는애니게시불가 반례 |
| `node --test` + test-command.json 명시34파일 |0| 현재트리218/218. 기존개인미추적감사2/테스트2제외 |
| `python3 /private/tmp/godieor-data56/ddl-parity.py` |0| 일회용고정PostgreSQL참조DDL/전체migration분류경계18/18. 전체DDL동일성주장아님. 컨테이너정리 |
| Node24경로PATH/`node --env-file=.env node_modules/prisma/build/index.js migrate deploy` |0| 실제로컬DB에새migration202611160001적용. 기존migration파일불변 |
| `node --env-file=.env /private/tmp/godieor-data56/verify.cjs before` |0| 기존70이벤트전체행/ID/이력기준선저장 |
| `node --env-file=.env /private/tmp/godieor-data56/reclassify.cjs` |0| 첫3개분류보정/전체70canonical사전검사·나머지67불변 |
| `node --env-file=.env /private/tmp/godieor-data56/reclassify-rest.cjs` |0| 기존70전체검토→추가1보정·총4,기존review/키/일정불변 |
| `node --env-file=.env dist/src/cli/publish-reviewed.js --file data/curated/ott-reviewed-mappings.json` 각보정/반복 |0| 전체70입력,신규이벤트0. publish*.log. 최초3보정뒤추가1보정후최종반복구분 |
| `COLLECTION_SCHEDULE_ENABLED=false COLLECTION_INCLUDE_FIXTURE=false CATALOG_PROVIDER_ONLY=true node --env-file=.env /private/tmp/godieor-data56/verify.cjs after`/repeat |최초1/1→최종0/0| 검사도구의잘못된/options404와상세.event래퍼누락을수정후정상계약으로재확인. 제품API를바꾼것아님. 최종HTTP200/68행/4애니/다른66전체행·이력불변/전체ID·일정불변/반복이력불변. pg동시query향후비호환경고미해소 |
| `collectNetflixKrSchedule()`의배스항목조회 |0| 공식KR배스X마키나11/03,bas-official-refresh.json. 게시시각을OTT날짜로사용하지않음 |
| Node24경로PATH `sh scripts/check-streampick-parity.sh /private/tmp/godieor-data56/parity` |2| 새참조52/제품68/정확26. 최종분류보정전후날짜/ID/건수불변이라대조판정동일 |
| `node --env-file=.env scripts/collect-tmdb-release-candidates.mjs work/tmdb-release-candidates data/curated/ott-official-tmdb-bindings-2026-11-13.json` |2|120현재/124누적/48ready/errors0,provider미등재incomplete |
| `node scripts/prepare-tmdb-reviewed-batch.mjs work/tmdb-release-candidates/latest.json data/curated/ott-official-tmdb-bindings-2026-11-13.json /private/tmp/godieor-data56/revalidated-batch.json` |0|48fresh/70existing/blocked0/newMappingsAssigned0·DB쓰기없음. 최종4번째형태보정은별도SQL/API확인,이보고서는기존3개보정이후실행한시점관측 |
| 같은actuallatest/state로`mergeCandidateState` 재처리 |0|0created/0revised/120unchanged/124stored |
| backend4675128 git archive→Prisma generate(합성미사용DB주소)→tsc→전체명시테스트 |0/0/0| 고정source218/218,기존의존성링크/실비밀복사없음. fixed-binding/logs참조 |
| `xcrun swiftc -module-cache-path /private/tmp/godieor-data56/swift-cache -parse-as-library ios/GODIEOR/PublicAPI.swift tests/AnimationChecks.swift -o /private/tmp/godieor-data56/animation-check` 및바이너리실행 |0/0| 독립저작가상애니JSON해석/표시/날짜만보존. swift-check.log. 실폰관측아님 |
| app8b5e17d git archive의`xcodebuild ... CODE_SIGNING_ALLOWED=NO build` |0| 고정unsignediOSSimulator빌드성공. 개인pbxproj제외. ios-binding.json전체argv/ios-build.log |
| 소비자app/verifier계약·runtime파일각각git show고정backendSHA 해시대조 |0| 두참조모두커밋소스와일치. contract-binding-check.json. 독립승인상태변경없음 |

## 고정 SHA·계약·독립 인계

- app base `a09bf1258a38de60f1578d1b7fa4a778f5d8550d` / 코드·소비자계약head `8b5e17d549ff91011be4ebe8653e5d149c1033cd` (실제고정iOS검사head). 이후문서만후속수정.
- backend base `2554856dbd213105f41cb394d7731e55ebf5ce29` / 코드·계약head `46751285a88f96ac88ea719a4e5daff791d96a5a` (실제고정서버218head,분류아티팩트는그시점3개). 이후전수대조4번째분류아티팩트/문서후속수정,실제SQL/API는최종4개확인. 종료head는Git이력참조.
- verifier base `c2c5b659a02966d592fba8e5138754800d4529f8` / 이번은소비자reference/학습·공통문서변경,실행기·기준·verdict불변. 종료head는Git이력참조.
- API `0.1.0-draft.5` manifestSHA256 `0ffd7cbcdcb3c46b450e626ced90055e985308d728c279832aa00ec76b24e9c9`.
- migration runner digest `ec6966538bd599bf0dcee21ec0e0fb03a63b513ae01654d52b9e2badf5697fd7` (snapshot.migration_manifest JSON 알고리즘).
- acceptance `0.1.0-draft` SHA256 `c4906283810c8b378800b67930028685a41b6a051923ea9f9415346b2d657063`,draft/approved_by null유지. 제품범위에따른검증기준확대는검증소유자의후속검토이며구현자가승인상태를변경하지않았다.
- 범위: 작성자backend/iOS/localDB·API component검사. 새통합runner/독립review·실폰UI·실Google·클라우드미실행. 이전ERROR/4SKIPPED불변. OS격리/전체제품PASS/데이터완전성보장아님. 독립리뷰는구현대화/학습해설을정답으로전달하지않는별도컨텍스트.

## 다음 세션 인계·학습

전체52행표의미일치26을OTT·시즌·날짜근거유형별로처리한다. 애니5행도대상이며범위문제는해결됐지만시즌20/6미발견·정확한목표OTT일자근거부족은해결되지않았다. 공식homepage독립발견은읽기전용진단까지만했고사용자범위확정후애니지원으로작업중심을변경했다. 같은가용성페이지를반복해날짜를추측하거나참조행을수집seed로복제하지않는다.

원본 ADR021/ADR020·LEARN0011/0021/README/reviewed-publish·제품원본·소비자계약참조·공통6사본갱신,revision DATA-56-2026-11-16. 최초질문수치/로컬검사도구실패·추가전수보정·형태힌트의120revision을구분기록했다. 개인pbxproj/.env.example/package.json/미추적4파일보존. 실제사용자장애·가상반례·예방설계를구분하고사용자이해도/성과측정없어학습평가질문해당없음. 최종문서커밋은Git이력에서확인한다.

최종4번째분류보정아티팩트커밋 `f67efc6bd3acb315131716cbf4dc5227928031ee`. 이커밋은코드/계약/마이그레이션변경없으며실제고정검사코드는4675128/app8b5e17d로위에서구분했다. 기존70개SQL전후ID·분류·eventhash·이력건수결속은evidence/data56/db-event-bindings.json에추가보존했다.
