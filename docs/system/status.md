# 현재 상태 · 새 개발 대화 시작점

문서 revision: CONTEXT-2026-11-10-08. 공통정책 SYNC-2026-11-10-01. 원본 app/docs/system, backend/verifier 동일사본. 확인일 2026-11-10 KST.

## 최신 사용자 확정 (최우선)

**전용 macOS 계정 godieorbuild 검증 방식은 폐기했다.** 계정전환·su·비밀번호·전용 Darwin T 진단을 다음작업으로 재개하지 않는다. 기존Mac계정에서 검토한 고정소스의 로컬검사를 수행한다. 이 변경은 OS계정 삭제나 기존HOME ACL 수정이 아니다. 제품 개발/서명/출시를 전용계정·P5격리 과제에 종속시키지 않는다.

## 세 저장소 구현 상태

| 저장소 | 구현·확인 | 미완료 |
|---|---|---|
| app | SwiftUI 공개API client·월간달력·일별목록·상세·지역/시간대/OTT/기기필터, 상세최신상태/개최국/날짜응답경합 수정, 작성자 날짜→목록→상세 UI 확인 | Google실제인증/찜/계정설정 동기화, 전체독립UI검사 |
| backend | Nest controller→service→repository, Prisma Client우선·SQL예외정책, PostgreSQL23모델·migration, fixture7+공식OTT공지4건 수동반영 파이프라인 | 영화·게임·EPL 실연동/OTT자동전수수집, Google/개인쓰기 |
| verifier | evidencev1앱전용/v2전체조합binding, rawGit snapshot/build분리, 임시DB와단계로그, backend제한실행·iOS기존계정unsigned빌드 | 7개필수검사 연결, 자동AI어댑터·전체제품통합run·승인 |

## 마지막 실제 실행

- 검증기 코드 b77b5a1328acc1410fcd34b008023ef01a96de4a, 브랜치 codex/local-verification. 코드변경후 공통문서HEAD는 Git/웹전달본으로 확인한다.
- 마지막 run /private/tmp/godieor-local-ad8f1b57. 입력 app4630795a7fd31b568497481d43cb3ef619f6c89f / backendbcf1f463498ae99d2e747aba97facf5e66977103. 당시verifier82cfdb7+dirty/state hash이며 최신SHA실행으로 재라벨하지 않는다.
- node버전/경계probe/**기존계정 iOS unsigned 빌드**/dependencies/Prisma generate/tsc/backend47tests/일회용DB migration/반복수집·달력상세smoke 모두exit0. 임시 godieor-vfy-* 컨테이너 잔존없음 확인. 기존제품DB를 변경한 검사가 아니다.
- verifier scripts/self-test.sh 84개통과. 별도컨텍스트 Meitner는 자기검사/모의7조합 확인, 추가재현결함없음 보고. 실제Xcode/DB실행은 작성자실행이다.
- 결과는 ERROR: event-identity/time-semantics/filter-intersection/settings-roundtrip/provider-contract/ios-user-flow/secret-check 7개는 미실행·미연결 SKIPPED. ios-build만 실제PASS, reviewPENDING, isolation_verified=false. 전체제품PASS/승인은 없다.
- 산출물사본 verifier/work/handoff/godieor-local-ad8f1b57 (Git제외), 상세원본 verifier/docs/tasks/VFY-local-verification.md, 실행정책 docs/local-verification.md, 리뷰 reviews/2026-11-10-local-verification.md, LEARN-0015.

## 현재 검증 방식

고정base/head·계약manifest·migration집합·acceptance·verifier상태 digest를 모든 결과에 묶는다. 원본snapshot/빌드사본 분리·로그hash·실패/미실행 기록은 유지한다. backend는 최소환경sandbox/일회용DB. iOS는 검증기소유 고정xcodebuild argv·generic Simulator·서명없음, 실행정책 local-reviewed다. Xcode project build phase는 실행되므로 검토한 자체프로젝트에 사용한다. 동계정실행을 OS격리로 주장하지 않는다.

P5 setsid후손수명정리/전체OS격리는 해결한것이 아니며 제품개발의 선행게이트에서 제외했다. 외부PR무인실행 환경은 별도범위다. 기준소유는 verifier/requirements/acceptance.yaml이며 draft, 승인자null을 유지한다. 변경을 제안할수는 있으나 승인하지 않는다.

## 이어받을 다음 작업

1. 전용계정 인증복구 대신 INT-01: 독립API 날짜/identity/필터 관찰점을 실제실행과 연결한다. 기존backend자체47개 전체통과를 모든GD필수검사PASS로 전용하지 않는다.
2. 제품개발: 극장영화 등 데이터출처 최소샘플/범위·근거 확인과 Google/개인쓰기 설계·구현. OTT는 연월일확인가능한 시즌최초공개만, 월/연도만 있는자료 제외. 자동전수coverage는 확인되지 않았다.
3. 새기능마다 자체검사·분리컨텍스트리뷰·고정SHA 인계. 현재 card 담당해제. 공통문서통합은 한세션만 한다.

## 고정 계약·환경·범위

API0.1.0-draft.2, app/docs/api/contract-reference.json·verifier/docs/contracts/reference.json을 참조한다. contractmanifest SHA256 8dfc69a8c6a5f9feb91f2d0cf6d661eec16a1aacb8e980b7abe880cd0b1f3b1e, 초기migration파일 SHA256 29ef8ef0d520f44b6a633e8f017144a3e2b2199189461a88ba99bc296c42f5b9. 기존계약pin의 package-lock과 현재backend lock차이는 기존에 기록된 상태이며 새계약으로 임의재고정하지 않는다. Node24.19.0/Nest12.4.0/Prisma7.10.1/Postgres16.14.

iOS/무료로컬우선, 한국/KST기본·국가/시간대선택, 기본영화+OTT, 게임/EPL설정추가, 2026년부터알려진미래, 하루1회갱신정책. 실제자동스케줄/전수수집과 정책은 구분한다. 작품별다른시장/플랫폼/시각 이벤트를 보존하고 date_only를UTC자정으로 만들지 않는다. 세부확정은 product/policies, 원본실행은 각작업카드가 소유한다.

과거전용계정 생성·ACL·인증실패·격리진단은 Git이력 및 VFY-03-dedicated-* 작업카드에 보존한다. 해당문서가 다음계정로그인을 요구하더라도 현재정책이 우선한다. 현재문서는 과거status4630795 등 이후 산재한 오래된요약을 정리한 것이다.

## 새 계정/모델 시작

AGENTS → 이파일 → handoff → 해당원본카드 순으로읽고 각저장소 HEAD/branch/dirty를 확인한다. 최신본읽기전 코드수정/인증반복을 하지 않는다. 웹전달은 scripts/export-context.py로생성하고 --check한다. 커밋은 영문type+한글설명, push/외부배포는 별도요청범위다.
