# DATA-73 · 게임/EPL 2026 백필·최신 갱신·영화 날짜 철회 반영

- requirement PROD-005/006/007/008/009, GD-005/006/007/008/009 초안. 상태: 이번 구현·자체 검사·실제 적재 완료. 담당 codex-data73-01 해제. 전체 데이터 단계는 진행 중.
- app base e4ad0e715ac5995a99ab09a344aa93c79f369b14(개인 pbxproj dirty 보존), backend base dc88d806a7a22513991c99a0e99889cb764f07e0(clean), verifier base428b33f14af1f06d0ae8d4e7ed2152ca43fe75b5(clean).
- codex/provider-backfill-2026 단독 checkout. 시작 시 수집 프로세스 없음. 코드 빌드·검사 후 실제 백필→일일 재수집→종료를 확인했고 실행 도중 dist를 덮어쓰지 않았다. 동시 개발 세션 없음.
- 범위: 제공처별 backfill/daily/force CLI,2026 고정 시작점, IGDB/EPL 실제 백필·세 제공처 최신 갱신·DB/API 검증. 실제 발견한 KOBIS 날짜 철회도 일반 재확인 경로로 보완. 앱 코드/API/migration/독립 기준·verdict 불변.
- 예상 실패: daily만 실행해 과거 누락 방치, 연도 변경 시2026 소실, 없는 키/권한/잠금·페이지 오류를 성공으로 셈, 지역/기기/팀·시간 정밀도 혼동, 키 노출, 대량 저장 timeout, 기존ID/이력 손실과 중복, 목록에서 사라진 확정일 방치.
- ADR023/LEARN0006 연결. 날짜 철회는 공식 상세 근거를 확인한 실제 문제이며 가상 예제가 아니다.

## 실제 적재 결과

| 제공처 | 작업 전 | 작업 후 | 신규 이벤트 |
|---|---:|---:|---:|
| IGDB 게임 |4870|29914|25044|
| football-data EPL |380|760|380|
| KOBIS 영화 |1902|1909|7|
| 기존 검토 OTT |93|93|0|

신규 총25431은 실제 로컬 제품 DB 적재이며 가상 입력이나 과거 상태 재생이 아니다. fixture7은 실데이터 집계에서 제외했다. EPL의 추가380은2025/26 전체 시즌으로2025년186경기도 저장되며 API 시작2026년 이후와 구분한다. 현재 EPL은2026년374경기/2027년200경기,2025년186경기다.

게임 WORLD29519/KR22/JP327/AU10/NZ6/CN10/BR20, WORLD 최초 날짜2026-01-01/마지막2027-12-20. 실제 backfill8개 scope(경기1+게임7) 모두 성공. 이어 force daily9개 scope(영화1 추가) 성공, 게임/EPL 신규ID0으로 과거 백필도 보존했다. 이 재수집에서 게임 기존2개의 메타데이터 변경은 관측됐으므로 전체 event 행이 전부 불변이라고 표현하지 않는다.

기존7252 event ID/작품·팀·지역 binding을 보존했다. 최종 기존7207행·이력 불변,45행은 제목/메타데이터/날짜 철회 갱신이었고 이력은 감소하지 않았다. OTT93 및 fixture 전체행·이력 불변. 신규 총수만으로 원천의 전수 정확성을 주장하지 않는다.

## 구현과 날짜 철회

backfill을 게임2026-01-01/KOBIS2026년/EPL2025 시작 시즌으로 고정했다. daily 게임은 UTC 달력일 경계로 최근30일을 잡는다. CLI는 --mode backfill/daily --providers kobis,football_data_pl,igdb --force를 지원하며 잘못된 옵션/없는 제공처 키/잠금 충돌은 실패다. fixture를 실제 제공처로 선택하지 않는다.

뮤티니20268058은 목록에서 빠져 원래 날짜2026-11-18이 남아 있었다. 공식 동일-ID 상세 openDt 빈 값을 확인했다. optional adapter refreshMissing과 repository의 최신 canonical 조회를 연결해 날짜 있는 목록에서 사라진 기존 영화를 재확인한다. 동일ID/제목 유효성·날짜 형태·최대100재조회 경계를 먼저 검증한다. 명시 빈 값일 때만 unknown(연도/기간null)으로 바꾸며 제작연도나 취소 상태를 추정하지 않는다.

실제 뮤티니의 event ID a03209e7-0e31-42db-99fa-9a0976bf58f5 유지, local_date/instant NULL, history+1, API previousTime2026-11-18 보존, 미정 목록 포함/기존 날짜 목록 제외 확인. 영화 재수집 후 신규0·전체32683 event 행과 이력 불변을 확인했다(여기에는 fixture7 포함).

## 실제 실행한 검사

Node24.22.3 고정 경로 /Users/dojoohwan/.local/share/godieor/node-v24.22.3/bin/node 사용. 로그/공개 근거는 evidence/data73. 전체 before/after/after-backfill 원본 DB 스냅샷은 /private/tmp/godieor-data73에 보존하고 Git에는 집계·hash·표본·변경행·실행 도구를 남겼다.

| 실제 명령 | 종료 | 관찰 |
|---|---|---|
| PATH=<Node24bin> npm test |0|최종 Prisma생성/TS빌드·310/310. CLI 엄격타입 오류는 수정 후 재실행 |
| node --env-file=.env dist/src/cli/collect-daily.js --mode backfill --providers football_data_pl,igdb |0|8개 scope 성공, EPL760/게임새25044 실제 저장 |
| 같은 CLI --mode daily --providers kobis,football_data_pl,igdb --force |0|9개 scope 성공, 영화새7/게임·EPL 새ID0. 실제 메타데이터 변경과 신규를 분리 |
| 같은 CLI --mode daily --providers kobis --force |0|최종 상세 재확인 포함1909 게시, 미정 전환1. 반복 실행도0/추가 이력0 |
| env -u <실원천 키> COLLECTION_INCLUDE_FIXTURE=true node scripts/check-refactor-db.cjs |0|최종 고정digest 일회용PostgreSQL migration/DI/7개 가상event/API/반복ID/실패 보존/계정·찜·검토 게시 회귀. 컨테이너 제거 |
| node --env-file=.env /private/tmp/godieor-data73/verify.cjs (schedule/fixture=false,provider-only=true) |0|게임 실제35표본·신규 EPL380 전체를 공식API로 대조. KR/WORLD 게임+EPL2026~2027 월별24창30115 API ID가 DB와 일치. 관련47상세200 |
| node --env-file=.env /private/tmp/godieor-data73/verify-withdrawn.cjs |0|뮤티니 공식 날짜 철회/미정 목록/이전 날짜·ID/이력 확인 |
| before→after SQL/스냅샷 및 영화 반복 비교 |0|7252 기존ID 보존/7207 전체행·이력 불변,45 갱신. 최종 영화반복32683 event 전체행·이력 불변 |
| 원천별 집계·누락ID 직접 조회 |0|게임49 동일-ID 공식 재조회200/0행, 영화1은 상세의 명시 빈 날짜로 해결. 사용자 키 출력 없음 |

최초 일회용 DB 도구는 fixture 옵션이 빠져0≠7로 실패했다. fixture=true와 실원천 키 제거를 명시한 재실행 및 최종 코드 재실행이 모두 성공했다. 임시 비교의 불필요한 제곱 순회는 해당 비교 프로세스만 종료하고 Map으로 재실행했다. 기존 pg 동시 query deprecation warning은 관측했으며 이번 변화와 구분한다.

## 남은 범위·handoff

- IGDB 기존49 release ID가 이번 full backfill에 없고 개별 재조회도200/빈 배열이었다. 삭제/이전·대체ID 원인은 미확정이다. 임의 취소·삭제·재매핑하지 않았고 기존 observedAt/ID/찜 참조를 보존했다. 이를 최신 원천 재확인 성공으로 세지 않는다. 게임 월/분기/연도/TBD 수집 및 새 ID로 이동한 동일 이벤트 추적도 후속이다.
- 이번 백필/일일 실행은 실제 수동 실행이다. 영화/게임/EPL 별도 로컬 일간 운영 등록·다음 자동기동 관측은 아직 없으며 기존 API Cron은 활성 서비스 프로세스가 필요하다. GitHub Actions를 push하거나 클라우드 배포하지 않았다.
- OTT 새 시즌/나머지 제공처 일반 자동 검토, Netflix404·최신TMDB전체 실행·자동 신규 리뷰의 일간 재확인 범위는 미완료다. 데이터 단계 완료 후 배포→기본기능→디자인 순서 유지.
- app base/head 런타임 위e4ad0e7 동일, 이번 app 변경은 공통 문서만. backend 구현 head fa98eb51d2ea492f352bb18bdd69cc37d0abf3af, 종료 문서 head는 각 저장소 Git 이력에서 확인한다. verifier 위428b33f 기준·verdict 불변. 독립runner/리뷰·iOS·실폰·클라우드 미실행.
- API0.1.0-draft.5 manifest SHA256 0ffd7cbcdcb3c46b450e626ced90055e985308d728c279832aa00ec76b24e9c9, migration digest ec6966538bd599bf0dcee21ec0e0fb03a63b513ae01654d52b9e2badf5697fd7 불변.
- acceptance0.1.0-draft SHA256 c4906283810c8b378800b67930028685a41b6a051923ea9f9415346b2d657063 불변. 개인 pbxproj SHA256 f8ef38b1a44d31034be8137e7c149616c8d10b5fec23d23c50ad5445342b54ba 보존.
- status/handoff/plan·공통 사본/README·원천 범위·ADR023/LEARN0006 갱신, 종료 시 diff/공통 일치/보호 지문과 context 전달본 검사를 수행한다.

종료 검사: git diff --check 성공,5개 공통 문서 세 저장소 byte 일치,계약/기준·개인pbxproj 지문 유지. 실제 수집·DB 회귀 프로세스와 임시 컨테이너가 남지 않았음을 확인했다. 종료 문서 커밋 후 context 생성/--check한다.
