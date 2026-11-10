# 현재 상태 · 새 개발 대화 시작점

문서 revision: CONTEXT-2026-11-10-11. 공통정책 SYNC-2026-11-10-02. 원본 app/docs/system, backend/verifier 동일사본. 확인일 2026-11-10 KST.

## 최신 사용자 확정 (최우선)

**전용 macOS 계정 godieorbuild 검증 방식은 폐기했다.** 계정전환·su·비밀번호·전용 Darwin T 진단을 다음작업으로 재개하지 않는다. 기존Mac계정에서 검토한 고정소스의 로컬검사를 수행한다. 이 변경은 OS계정 삭제나 기존HOME ACL 수정이 아니다. 제품 개발/서명/출시를 전용계정·P5격리 과제에 종속시키지 않는다.

## 세 저장소 구현 상태

| 저장소 | 구현·확인 | 미완료 |
|---|---|---|
| app | SwiftUI 공개API client·월간달력·일별목록·상세·지역/시간대/OTT/기기필터, 상세최신상태/개최국/날짜응답경합 수정, 작성자 날짜→목록→상세 UI 확인 | Google OAuth 실자격증명/실기기 인증·기기간 동기화/전체독립UI검사 |
| backend | Nest controller→service→repository, Prisma Client우선·SQL예외정책, PostgreSQL23모델·migration, fixture7+공식OTT공지4건 수동반영 파이프라인 | 영화·게임·EPL 실연동/OTT자동전수수집, 실Google OAuth와 개인쓰기 통합런 검증 |
| verifier | evidencev1앱전용/v2전체조합binding, rawGit snapshot/build분리, 임시DB와단계로그, backend제한실행·iOS기존계정unsigned빌드 | 4개필수검사 후속·제품구현, 자동AI어댑터·전체제품통합run·승인 |

## BE-AUTH / APP-AUTH 구현 (2026-11-10 추가)

- 작업 카드 `docs/ai/tasks/APP-BE-AUTH-01.md`. backend Google JWT 서명·audience·issuer·만료 검증, 30일 SHA-256 opaque service session 발급/단일 폐기, 사용자별 설정 CAS(version 409)·작품/일정 찜 멱등 변경·서명된 계정별 페이지 커서 구현. 동시 최초 Google 로그인 P2002 재시도. iOS Google ASWebAuthenticationSession 코드+PKCE+nonce 검증, Keychain 저장/복원, 설정 저장/불러오기, 찜 UI 추가. API 계약/migration 변경 없음.
- 작성자 자체 검사: backend `npm test` 51/51 성공(JWT/세션/커서/설정 4 신규 subtest 포함), iOS `xcodebuild ... -derivedDataPath /private/tmp/godieor-auth-derived CODE_SIGNING_ALLOWED=NO build` 성공. 최초 기본 DerivedData 빌드 시 쓰기 권한 오류는 별도 writable DerivedData에서 재실행 성공. Google 실제 Client ID·실서버·실DB 왕복 및 독립 runner 미실행. 기기 필터 로컬 복원과 계정 설정 sync는 별개.
- 전용 Mac 계정 재개하지 않음. 구현 자체검사만 완료, 전체제품 PASS/review 승인 아님.

## 마지막 실제 실행

- verifier 코드 de0560faed63673f0f17904a825f1973a0fd9b5d, 브랜치 codex/int-01-secret-check. 최종문서HEAD는Git/전달본으로확인. 원본 verifier/docs/tasks/INT-01-secret-check.md, 정책 docs/secret-check.md.
- 마지막run /private/tmp/godieor-secret-05d7308f. app594b080/backendc5722cb(전체SHA evidence), verifier867c5b6+당시dirty/state hash. 최신SHA실행으로재라벨하지않는다.
- node/경계probe/iOSunsigned/dependencies/generate/tsc/backend47tests/migration/identity92·time76·filter57assertions/database-smoke/secret-check 모두exit0. 임시DB정리확인. 기존제품DB사용없음.
- scanner는source/fixtures/완료logs/bundle182inventory항목(범위교차)에서finding0/error0. 명시literalcredential·labelledPII정책이며모든개인정보/인코딩비밀부재증명이아니다. 값·원래파일명은출력하지않고path_id로기록. 정책/예외/범위는 docs/secret-check.md.
- code자체107개통과. 별도Hubble은5개오류지적수정후107개/23receipt재현을직접확인, 추가재현문제없음보고. 전체Nest/DB/iOS/scanner실환경은작성자실행이며독립제품승인아님.
- evidence는 ios-build/event-identity/time-semantics/secret-check PASS(componentscope). filter-intersection/settings-roundtrip/provider-contract/ios-user-flow 4개SKIPPED로전체ERROR. reviewPENDING/isolation_verified=false. 전체제품PASS/승인없음.
- 별도CUA+가상계약stub에서11/6날짜→목록→상세/가상표시/date_only확인. US/UTC/netflixON변경후프로세스종료/재실행유지확인, 마지막KR/Seoul/netflixOFF복원. 이것은로컬AppStorage component관찰이며계정서버왕복/전체UI판정PASS가아니다. app코드변경없음, 독립자동UIrunner연결은후속.
- 산출물 verifier/work/handoff/godieor-secret-05d7308f 및 ui-local-20261110(Git제외). 테스트server/app종료. 리뷰 reviews/2026-11-10-secret-check.md, LEARN-0017. INT-01A실행/모형기록은해당카드/LEARN-0016에보존.

## 현재 검증 방식

고정base/head·계약manifest·migration집합·acceptance·verifier상태 digest를 모든 결과에 묶는다. 원본snapshot/빌드사본 분리·로그hash·실패/미실행 기록은 유지한다. backend는 최소환경sandbox/일회용DB. iOS는 검증기소유 고정xcodebuild argv·generic Simulator·서명없음, 실행정책 local-reviewed다. Xcode project build phase는 실행되므로 검토한 자체프로젝트에 사용한다. 동계정실행을 OS격리로 주장하지 않는다.

P5 setsid후손수명정리/전체OS격리는 해결한것이 아니며 제품개발의 선행게이트에서 제외했다. 외부PR무인실행 환경은 별도범위다. 기준소유는 verifier/requirements/acceptance.yaml이며 draft, 승인자null을 유지한다. 변경을 제안할수는 있으나 승인하지 않는다.

## 이어받을 다음 작업

1. BE-AUTH/APP-AUTH 기본 구현과 자체 검사 완료. 다음은 등록된 Google iOS OAuth Client, 단말용 HTTPS backend 및 일회용 DB를 이용한 실제 인증/동기화/충돌·계정격리 통합 검증과 독립 리뷰. 계정 삭제/세션 관리 정책은 미확정.
2. 제품개발: 극장영화 등 데이터출처 최소샘플/범위·근거 확인과 실Google OAuth와 개인쓰기 통합런 검증 설계·구현. OTT는 연월일확인가능한 시즌최초공개만, 월/연도만 있는자료 제외. 자동전수coverage는 확인되지 않았다.
3. 새기능마다 자체검사·분리컨텍스트리뷰·고정SHA 인계. 현재 card 담당해제. 공통문서통합은 한세션만 한다.

## 고정 계약·환경·범위

API0.1.0-draft.2, app/docs/api/contract-reference.json·verifier/docs/contracts/reference.json을 참조한다. contractmanifest SHA256 8dfc69a8c6a5f9feb91f2d0cf6d661eec16a1aacb8e980b7abe880cd0b1f3b1e, 초기migration파일 SHA256 29ef8ef0d520f44b6a633e8f017144a3e2b2199189461a88ba99bc296c42f5b9. 기존계약pin의 package-lock과 현재backend lock차이는 기존에 기록된 상태이며 새계약으로 임의재고정하지 않는다. Node24.19.0/Nest12.4.0/Prisma7.10.1/Postgres16.14.

iOS/무료로컬우선, 한국/KST기본·국가/시간대선택, 기본영화+OTT, 게임/EPL설정추가, 2026년부터알려진미래, 하루1회갱신정책. 실제자동스케줄/전수수집과 정책은 구분한다. 작품별다른시장/플랫폼/시각 이벤트를 보존하고 date_only를UTC자정으로 만들지 않는다. 세부확정은 product/policies, 원본실행은 각작업카드가 소유한다.

과거전용계정 생성·ACL·인증실패·격리진단은 Git이력 및 VFY-03-dedicated-* 작업카드에 보존한다. 해당문서가 다음계정로그인을 요구하더라도 현재정책이 우선한다. 현재문서는 과거status4630795 등 이후 산재한 오래된요약을 정리한 것이다.

## 새 계정/모델 시작

AGENTS → 이파일 → handoff → 해당원본카드 순으로읽고 각저장소 HEAD/branch/dirty를 확인한다. 최신본읽기전 코드수정/인증반복을 하지 않는다. 웹전달은 scripts/export-context.py로생성하고 --check한다. 커밋은 영문type+한글설명, push/외부배포는 별도요청범위다.
