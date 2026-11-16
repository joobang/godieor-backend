# DATA-55 · 공식 후보의 작품·출연진 식별 근거 보강

- 요구사항 PROD-005/006/007/009, GD-005/006/007/009, acceptance0.1.0-draft(미승인 유지).
- 상태 인계 대기, 담당 codex-identity-evidence-01 해제(이번 구현 자체검사 완료/전체누락 해소 미완료). 세 저장소 branch codex/ott-identity-evidence, 순차checkout/동시수정 없음. base {'godieor-app': '18cb0e2aeeeaefebf659191c027a81d97692f02d', 'godieor-backend': '4781931dc848e77cb46a6711167d6db77e7b42ab', 'godieor-verifier': 'e981ada3b2b0357998c554dd54dd0591de71cef4'}.
- 사용자 확정: OTT 참조 누락 최우선, TMDB독립발견+공식루트 대조, 신작·시즌첫공개만. 참고미확인 일정 표시 변경 아님.
- 범위: 최신 미일치26행을 확인하고, 공개 공식후보의 번역배우명/부제/배우부재 때문에 막힌 공통식별을 보강한다. 제목만으로 병합하거나 TMDB원방영일을 한국OTT일자로 이식하지 않는다. 근거가 준비된 전체배치만 기존review/revision/고정키로 연결한다.
- 예상실패: 제목부제 제거로 동명이작 합침, 배우별칭2개를2명으로 셈, 그룹명을 개인으로 오인, 보조공식페이지가 다른작품인데 배우를 이식, 검색잘림을 유일정답으로 판단, 날짜가다른시즌 자동선택, 신규후보/기존재검증을 제품일치증가로 표현.
- 완료조건: 합성반례/실제일괄후보 검사, 재실행멱등, 가능한검토배치 전체처리 후 SQL/API·참조재측정. 준비안된행은 원인/재개조건 보존. 개인pbxproj/backend.env.example/package.json/기존미추적4파일 보존.
- ADR020/LEARN0021 연결. 계약/migration/기준/verdict 변경없음. 실제명령/결과·종료상태·공통사본 갱신 예정.

## 최종 구현·실제 검사 결과

상태: 인계 대기, 담당 codex-identity-evidence-01 해제. 이번 식별 보강/검토 배치는 자체검사 완료이며 최우선 참조누락 전체해소는 미완료다. 코드 head `3a5a4dd62040cded2b184cf84d073ed4fc6ea8fc`.

- 공개tvN목록의정확제목프로그램링크,한국어·같은슬러그/단일프로그램ID·preview아닌출연진모듈을추출해TVING출연진부재를보강했다. tvN방송일/메타데이터는OTT공개일로사용하지않는다.
- TMDB명시person별칭만대조,원천이름과TMDB ID를각각한번만사용한다. 합성에서같은이름이2인물레코드에있으면2명으로세던경로를수정했다. 이름유사도·그룹→멤버추정없음. 조회30명상한/실패/ID불일치는미완료로보존. 한영문이름의X를한글짝출연진구분자로분리하지않는다.
- 실제9개검토중기존4/신규심사가능1/식별미확정2/공연1/월만표시1. 같은제목의TVING11/27명시·tvN출연진5인·TMDB340978명시시즌1첫날/첫회11/27일치로그냥사람친구를작성자교차검토했다. 준비된전체1개를기존review/revision/고정키에연결하고전체70개canonical사전검사/로컬게시했다. 원본 `data/curated/tving-identity-reviewed-2026-11-16.json`. 독립승인아님.
- 실제기간68행/연중70이벤트,이전69ID·전체행·이력불변. 전체배치재게시와재수집에서중복신규0. 새작품은참조목록밖이므로StreamPick52행중정확26행·미일치26·gateexit2그대로다.
- 독립TMDB현재120/누적124ID,공식50개중49재확인/1명시날짜없음,기존키45fresh(이전44). 실제관측재처리0신규/0수정. Coupang영화provider미등재로incomplete유지. 새공식연결과TMDB플랫폼후보ID추가가누적+1이며현재후보수/제품수와구분한다.

### 실제 실행 명령과 결과

node는 `/private/tmp/godieor-data48/node-v24.22.3-darwin-arm64/bin/node`(24.22.3),비밀은서버`--env-file=.env`만사용했다. 실행도구원본/보고서/로그는 `docs/tasks/evidence/data55/`.

| 명령/실행 | 종료 | 결과 |
|---|---|---|
| 공식tvN프로그램·목록curl | 최초기본sandbox6→허용실행0 | 기본DNS실패후네트워크허용에서실제원문다운로드. source-hashes는별도관측이며최종fetch와바이트동일주장아님 |
| `node --env-file=.env /private/tmp/godieor-data55/probe.mjs` |0| person별칭/제목검색. 톈시웨이/그룹·아불시대사검색은여전히미확정 |
| `node --env-file=.env scripts/collect-tving-upcoming.mjs /private/tmp/godieor-data55/upcoming-live.json` |0| 첫9개처리,보조파서null모듈실패로신규0. 해당행의보조실패를기록했으며errors0을전조회성공이라쓰지않음 |
| null반례수정후같은CLI `.../upcoming-final.json` |0|9개전체/errors0/신규검토제안1. 이후영문X반례도보완 |
| `node --test` + test-command.json 명시34파일 |0| 최종현재트리215/215. 중간214통과뒤영문X검사추가후215재실행. TS/계약변경없어기존같은소스dist사용,새TS빌드라고표현하지않음 |
| `node --env-file=.env /private/tmp/godieor-data55/verify.cjs before` |0| 로컬기존69행·ID·이력기준선저장 |
| `node --env-file=.env /private/tmp/godieor-data55/apply.cjs` |0|9전체검토중준비된1개review,전체70canonical사전검사/기존69불변,고정키work/event-000070 |
| `node --env-file=.env dist/src/cli/publish-reviewed.js --file data/curated/ott-reviewed-mappings.json` 최초/반복 |0/0| 전체70입력게시. published70은이번70건신규가아니며신규는1 |
| `COLLECTION_SCHEDULE_ENABLED=false COLLECTION_INCLUDE_FIXTURE=false CATALOG_PROVIDER_ONLY=true node --env-file=.env /private/tmp/godieor-data55/verify.cjs after` 및repeat |0/0|HTTP200/68행/신규date_only·instant없음·season1·출처/기존69전체불변/재게시이력불변. pg동시query향후비호환경고관측,별도해소미실행 |
| Node24경로PATH의 `sh scripts/check-streampick-parity.sh /private/tmp/godieor-data55/parity` |2| 새참조52/제품68/정확26,미일치26유지 |
| `node --env-file=.env scripts/collect-tmdb-release-candidates.mjs work/tmdb-release-candidates data/curated/ott-official-tmdb-bindings-2026-11-13.json` |2| created1/revised4/unchanged115/current120/stored124/ready45/errors0/incomplete |
| `node scripts/prepare-tmdb-reviewed-batch.mjs work/tmdb-release-candidates/latest.json data/curated/ott-official-tmdb-bindings-2026-11-13.json /private/tmp/godieor-data55/revalidated-batch.json` |0|45fresh/70existing/blocked0/newMappingsAssigned0,DB쓰기없음 |
| 같은실제latest/state를`mergeCandidateState` 재처리 |0| replay0created/0revised/120unchanged/124stored |
| `node --env-file=.env scripts/collect-tving-upcoming.mjs /private/tmp/godieor-data55/upcoming-after-review.json` |0|9전체재조회/기존5(다른공식출처1포함)/식별미확정2/공연1/월만1/newProposal0 |
| 코드3a5a4dd `git archive`에서 `node --test tests/ott-identity-evidence.test.mjs tests/tving-upcoming.test.mjs tests/official-ott-source.test.mjs tests/tmdb-release-candidates.test.mjs` |0| 커밋고정CLI46/46. fixed-binding/fixed-tests. 고정전체서버215아님 |

## 독립 검증 handoff

- app base/head `18cb0e2aeeeaefebf659191c027a81d97692f02d` (앱코드변경없음,종료문서head는Git이력참조).
- backend base `4781931dc848e77cb46a6711167d6db77e7b42ab`,코드head `3a5a4dd62040cded2b184cf84d073ed4fc6ea8fc`,종료문서head는Git이력참조.
- verifier base `e981ada3b2b0357998c554dd54dd0591de71cef4`,실행/기준/verdict변경없음,이번은학습/공통문서뿐. 종료문서head는Git이력참조.
- API `0.1.0-draft.4` manifestSHA256 `96cc08536324f8b5a7c537783caa93a1ce33de533526032e01621282fb601122`.
- migration runner digest `853337eadc11cd3c8c619c9e53d961cb7eead5fe0a79368c5d167324598bb697`.
- acceptance `0.1.0-draft` SHA256 `c4906283810c8b378800b67930028685a41b6a051923ea9f9415346b2d657063`,draft/approved_by null불변.
- 범위backend-only작성자검사/로컬DB·API. 새독립runner/review/고정전체서버215/iOS빌드/폰/실Google/클라우드미실행. 이전독립ERROR/4SKIPPED유지. 전체제품PASS/OS격리/독립승인주장없음. 새리뷰에는구현대화/학습해설을정답으로주입하지않는다.

## 다음 세션 인계

최신참조미일치26행을그대로유지한다. 목표OTT·해당시즌의정확한한국첫날부족을수집기보강/후보수로해결했다고계산하지않는다. 가금채는번역배우명·그룹명모호,아불시대사는정확제목검색미발견,기프트는월단위만표시라미정이다. 본작업으로부제미발견/번역이름전체가해결된것은아니다. 같은원천새근거없이개별작품적재반복을하지말고준비된유형별전체배치만후속처리한다. 미확인일정제품표시/기준변경에대한사용자추가결정은없다.

ADR020/LEARN0021·README/reviewed-publish·app원본공통상태/인계/계획/백로그/OTT전용인계갱신,세저장소사본동일revision DATA-55-2026-11-16. 기존개인dirty·미추적4파일보존. 실제장애/가상반례/예방설계를구분,사용자이해도/성과측정없어학습평가질문해당없음. 최종문서커밋은Git이력에서확인한다.
