# 현재 상태 · 새 개발 대화 시작점

문서 revision: CONTEXT-2026-11-10-23. 공통정책 SYNC-2026-11-10-02. 원본 app/docs/system, backend/verifier 동일사본. 확인일 2026-11-10 KST.

## APP-AUTH-11 Mac HTTPS 확인·iPhone 단계 대기 (2026-11-10, 최신)

- app문서기록bb6b60b, 원본 docs/ai/tasks/APP-AUTH-11.md. 기존loopback API와LAN HTTPSproxy가실행중임을확인했고재시작/중단하지않았다.
- CA체인·IPhostname 검증을유지한실제LAN TLS health/options200, 비인증settings/잘못된idToken401 확인. 정상Google로그인·계정쓰기·폰왕복검사는아니다.
- 실제현재HTTPS주소를buildoverride한 unsigned iPhoneOS generic build성공, 실제번들Info값확인. 서명/폰설치는미실행이며sourceURL placeholder는그대로다.
- 공개CA .cer·지문·현재주소/설치안내를 app/work/iphone/(Git제외)에준비. 개인키는복사하지않았고Mac/iPhone신뢰설정은변경하지않았다. 현재자체서명로컬방식은기기소유자가CA프로파일설치후별도TLS신뢰를켜야한다(Apple공식안내 local-iphone-auth.md).
- 담당해제·사용자폰단계대기. 다음은동일Wi-Fi iPhone Safari health접속확인→Xcode실기기서명설치→Google로그인·재실행·설정/찜왕복. 서비스생존/IP는다음세션재확인. 신규코드/독립리뷰/제품통합PASS는없다.

## APP-AUTH-10 공개·계정 API 주소 통일 (2026-11-10, 최신)

- app 코드9f04c67fac1b2f554e84e7ea186b87ff76cc6bfa. 공유APIEndpointConfiguration으로env→Info.plist의동일HTTPS설정을공개달력/상세와계정로그인/설정/찜에적용했다. 기존PublicAPI의bundle설정무시·iPhone localhostfallback을수정했다. Simulator공개loopback과계정HTTPS경계는보존했다.
- 순수Swift회귀검사·unsigned Simulator전체빌드(기본/테스트HTTPSoverride)성공. 실제생성Info.plist의reserved테스트주소를양쪽mode resolver로대조성공. 첫swiftc cacheEPERM은별도/private/tmp module cache로해결했다.
- 별도Lagrange리뷰의case비교회귀를수정하고Swift/diff재검토통과. 실제iPhone/Google로그인/계정왕복/HTTPSproxy연결은미실행, 제품PASS아님. API·migration·acceptance불변. source의backendURL은아직placeholder다.
- 원본 app/docs/ai/tasks/APP-AUTH-10.md, 운영절차 docs/ai/local-iphone-auth.md, LEARN-0018. 담당해제. 다음은기존APP-AUTH09도구로실제MacLAN→backendHTTPS접속확인후기기소유자CA신뢰/로그인/설정·찜왕복이다. 계정기능코드는이미구현돼중복구현하지않는다.

## APP-AUTH-09 로컬 iPhone HTTPS 접속 준비 (2026-11-10)

- `scripts/dev-https.sh`/`scripts/dev-https.py`로 Mac 개인 Wi-Fi IP에서 HTTPS → 127.0.0.1:3000 프록시를 실행하는 개발 절차 추가. 세부내용 `docs/ai/local-iphone-auth.md`, 작업 카드 `docs/ai/tasks/APP-AUTH-09.md`.
- 인증서 발급과 IP 바인딩, 로컬 Syntax/iOS unsigned build 자체검사는 별도 카드 기록. 실제 Mac 네트워크/기기 인증서 신뢰, backend 기동·Google 로그인·기기간 설정/찜 왕복은 미실행. 독립 PASS 아님. API·migration/acceptance 변경 없음.

## APP-AUTH-08 Google iOS OAuth 클라이언트 연결 (2026-11-10)

- 사용자가 제공한 iOS OAuth Client ID를 앱 Debug/Release Xcode 빌드 설정에 반영하고 reversed callback scheme을 등록했다. backend 기존 비밀 .env의 키를 GOOGLE_IOS_CLIENT_ID로 변경하여 같은 audience를 설정했다(.env는 Git 제외).
- 원본 카드 app `docs/ai/tasks/APP-AUTH-08.md`. HTTPS backend URL은 여전히 placeholder로 남아 있으며 실제 Google 로그인·실기기 설정/찜 왕복·독립 검증은 미실행이다. API 계약·migration/acceptance 변경 없음.

## BE-AUTH-06 Google 실연결 준비 (2026-11-10)

- backend `docs/tasks/BE-AUTH-06.md`: `.env.example`과 `scripts/setup-local.mjs`가 생성하던 `GOOGLE_CLIENT_ID`를 실제 JWT 검사 코드가 읽는 `GOOGLE_IOS_CLIENT_ID`로 수정했다. 기존 `.env`는 직접 키 변경이 필요하다.
- backend `docs/local-development.md`에 Google Cloud iOS OAuth 등록(Bundle ID `com.joobang.godieor`), reversed callback scheme, 동일한 backend audience, 실기기용 HTTPS API 준비를 기록했다.
- 작성자 backend `npm test` Node24/허용 환경 **53/53 통과**. 최초 Node20 일반 실행은 `dist` unlink EPERM으로 실패했다. 실제 OAuth 클라이언트, HTTPS 서버, iPhone 왕복과 독립 검증은 아직 미실행이다. API 계약·migration/acceptance 불변.

## 최신 사용자 확정 (최우선)

**전용 macOS 계정 godieorbuild 검증 방식은 폐기했다.** 계정전환·su·비밀번호·전용 Darwin T 진단을 다음작업으로 재개하지 않는다. 기존Mac계정에서 검토한 고정소스의 로컬검사를 수행한다. 이 변경은 OS계정 삭제나 기존HOME ACL 수정이 아니다. 제품 개발/서명/출시를 전용계정·P5격리 과제에 종속시키지 않는다.

## 세 저장소 구현 상태

| 저장소 | 구현·확인 | 미완료 |
|---|---|---|
| app | SwiftUI 공개API client·월간달력·일별목록·상세·지역/시간대/OTT/기기필터, 상세최신상태/개최국/날짜응답경합 수정, 작성자 날짜→목록→상세 UI 확인 | 실Google/실기기 인증·기기간 동기화/전체독립UI검사 |
| backend | Nest controller→service→repository, Prisma Client우선·SQL예외정책, PostgreSQL23모델·migration, fixture7+공식OTT공지4건 수동반영 파이프라인 | 영화·게임·EPL 실연동/OTT자동전수수집, 실Google OAuth와 개인쓰기 통합런 검증 |
| verifier | evidencev1앱전용/v2전체조합binding, rawGit snapshot/build분리, 임시DB와단계로그, backend제한실행·iOS기존계정unsigned빌드 | 4개필수검사 후속·제품구현, 자동AI어댑터·전체제품통합run·승인 |

## BE-AUTH / APP-AUTH 구현 (2026-11-10 추가)

- 작업 카드 `docs/ai/tasks/APP-BE-AUTH-01.md`. backend Google JWT 서명·audience·issuer·만료 검증, 30일 SHA-256 opaque service session 발급/단일 폐기, 사용자별 설정 CAS(version 409)·작품/일정 찜 멱등 변경·서명된 계정별 페이지 커서 구현. 동시 최초 Google 로그인 P2002 재시도. iOS Google ASWebAuthenticationSession 코드+PKCE+nonce 검증, Keychain 저장/복원, 설정 저장/불러오기, 찜 UI 추가. API 계약/migration 변경 없음.
- 작성자 자체 검사: backend `npm test` 51/51 성공(JWT/세션/커서/설정 4 신규 subtest 포함), iOS `xcodebuild ... -derivedDataPath /private/tmp/godieor-auth-derived CODE_SIGNING_ALLOWED=NO build` 성공. 최초 기본 DerivedData 빌드 시 쓰기 권한 오류는 별도 writable DerivedData에서 재실행 성공. Google 실제 Client ID·실서버·실DB 왕복 및 독립 runner 미실행. 기기 필터 로컬 복원과 계정 설정 sync는 별개.
- 전용 Mac 계정 재개하지 않음. 구현 자체검사만 완료, 전체제품 PASS/review 승인 아님.

## APP-AUTH-02/03 보완 (2026-11-10)

- APP-AUTH-02(app d8358ec): iOS 계정 API 주소를 Debug/Release 빌드 설정의 HTTPS 주소로 주입하고, 찜 목록 페이지 충돌(409)에는 전체 목록을 최대 한 번 재조회한다. 등록 OAuth Client ID·reversed scheme과 실제 HTTPS 서버 주소는 아직 준비되지 않았다.
- APP-AUTH-03(`docs/ai/tasks/APP-AUTH-03.md`, 이번 변경): 계정 전환 중 이전 세션의 늦은 응답이 사용자/설정/찜 상태를 덮어쓰지 않도록 generation과 요청 시작 token을 고정한다. 로그아웃 시 로컬 세션을 즉시 정리하고 이전 bearer token을 사용하여 서버 폐기를 시도한다. 폐기 실패 시 서버 세션은 만료 전까지 남을 수 있다.
- APP-AUTH-03 자체 iOS unsigned build와 diff 검사를 기록하며 실네트워크 지연 재현/Google 인증/실DB·독립검증은 아직 수행하지 않았다. backend 기존 dist 테스트 45개 중 44개 통과, HTTP 테스트 1개는 로컬 listen EPERM으로 실행 실패했다. verifier acceptance/verdict는 변경하지 않는다.

## APP-AUTH-07 쓰기 API 세션 만료 처리 (2026-11-10)

- `docs/ai/tasks/APP-AUTH-07.md`: 설정 저장 및 찜 변경 API 401 응답에서 로컬 세션·계정·찜 상태 즉시 정리, 기존 세션 일치 확인으로 늦은 이전 요청 격리. APP-AUTH-06 계정 필터 초기화와 연계.
- 작성자 iOS unsigned build 성공, CoreSimulator 서비스 경고 관찰. 실제 Google/HTTPS 401 UI·다중 기기·독립검증 미실행, 계약/마이그레이션 변경 없음.

## APP-AUTH-06 기기 필터의 계정 경계 (2026-11-10)

- 앱 `docs/ai/tasks/APP-AUTH-06.md`: 계정 필터 소유자 표식 추가. 로그아웃·401·계정 전환 시 기본 필터로 초기화하고 재시작에서 정상 계정 복구 후 원격 설정을 재적용한다. 비로그인 임시 필터는 유지한다.
- 작성자 iOS generic Simulator unsigned build 성공. CoreSimulator 서비스 경고 관찰. 실 Google/HTTPS·401 UI·두 기기·독립 검증 미실행. 계약·migration·verifier acceptance 불변.

## APP-AUTH-05 계정 refresh 순서/찜 쓰기 경합 수정 (2026-11-10)

- 앱 `docs/ai/tasks/APP-AUTH-05.md`: 겹치는 refresh 중 최신 시작 요청만 계정 상태를 반영하고 설정 저장 중 시작한 remote settings snapshot이 완료된 저장을 덮지 않도록 revision 분리. 찜 저장 후 재조회를 pending 해제 이후 예약하여 APP-AUTH-04 후속 재조회의 스냅샷 누락을 수정.
- 작성자 로컬 iOS generic Simulator unsigned build 성공. CoreSimulator runtime 서비스 경고는 발생했으나 컴파일 완료. 실 Google/HTTPS 기기·실제 지연 HTTP 경합·독립 runner 미실행. API/migration 및 verifier acceptance 불변.

## APP-AUTH-04 앱 복귀 동기화와 찜 중복 요청 방어 (2026-11-10)

- 앱 `docs/ai/tasks/APP-AUTH-04.md`: 화면 active 복귀 시 로그인 계정 설정/찜 재조회, 찜 대상별 진행 요청 중복 차단. 느린 요청 중 로그아웃·계정 전환 때 이전 응답은 적용되지 않고, 이전 요청의 종료가 새 세션 잠금을 지우지 않도록 UUID로 구분. 쓰기 중 시작한 찜 snapshot은 최신 UI를 덮지 않도록 revision 검사, 쓰기 성공 후 추가 재조회.
- 작성자 자체 iOS generic Simulator unsigned build 성공. 실기기 Google OAuth/HTTPS 서버, 두 기기에서 실제 동기화, 지연 HTTP 재현, 외부 독립 검증은 미실행. 서버 계약·migration 변경 없음.

## BE-AUTH-04 계정별 저장소 자체검사 (2026-11-10)

- backend 원본 카드 `docs/tasks/BE-AUTH-04.md`: 실제 UsersRepository/UsersService를 fake Prisma 트랜잭션에서 호출해 두 계정의 설정 격리·CAS 409, 찜 멱등·계정별 버전, 페이지 커서 계정/버전 경계를 검증하는 2개 회귀 검사 추가. 기존 JWT 테스트에서 Base64URL 마지막 글자만 수정하는 비결정적 변조 방식은 서명 바이트 직접 변경으로 교정.
- 작성자 로컬 전체 backend 테스트는 허용된 HTTP bind 환경에서 `node --test tests/*.test.cjs` **53/53 통과**(기존 dist). 일반 sandbox 실행은 47개 중 45개 통과/HTTP listen EPERM 및 수정 전 불안정 JWT assertion 2개 실패; 수정 후 허용 환경 결과를 별도 기록했다. 실제 PostgreSQL, OAuth/HTTPS 기기간 동기화, 독립 검증은 수행하지 않았다. 새 계약·migration 없음.

## BE-AUTH-05 실제 임시 PostgreSQL 자체검사 (2026-11-10)

- 원본 backend `docs/tasks/BE-AUTH-05.md`. 기존 `scripts/check-refactor-db.cjs` 임시DB/migration 시나리오에 실제 Prisma AuthRepository/UsersRepository 검사 추가. Google subject 계정 생성·동일 사용자 다중 세션, 서로 다른 계정 설정 격리·CAS 409, 찜 멱등/삭제·페이지 커서 사용자/버전 결합, 특정 세션 폐기 후 다른 세션 유지 확인.
- Node24.19.0, `GODIEOR_TEST_POSTGRES_IMAGE=postgres:16-alpine npm run test:db` exit0; 기존 스모크도 통과, tmpfs DB 컨테이너 정리. `npm test` 53/53 성공. 기본 고정 PostgreSQL digest 이미지는 로컬에 없으므로 별도 명시 이미지로 실행했고 이 차이를 작업 카드에 기록. 고정 digest 실환경 재실행은 미완료.
- 실제 Google OAuth ID token 검증/HTTPS iPhone/기기간 왕복과 독립 verifier 결과는 미실행. 기준 draft/PENDING 유지, 전체제품 PASS 아님. 전용 Mac 계정 검증 방식 폐기 유지.

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

1. APP-AUTH-07 인증 쓰기 401 세션 정리까지 구현. BE-AUTH/APP-AUTH 초기 구현 및 BE-AUTH-05 일회용 PostgreSQL 자체 검사는 기존 카드에 기록(로컬 이미지 digest 차이). Google iOS OAuth Client값은등록·반영됐고 APP-AUTH-10 주소통일까지완료. Mac실제HTTPS연결까지APP-AUTH-11에서확인. 다음은사용자iPhone CA신뢰/Safari health와실기기 인증·설정·찜왕복 및 독립검증. 로그아웃 서버 폐기 실패·계정 삭제/세션 관리 정책은 후속 확인 필요.
2. 제품개발: 극장영화 등 데이터출처 최소샘플/범위·근거 확인과 실Google OAuth와 개인쓰기 통합런 검증 설계·구현. OTT는 연월일확인가능한 시즌최초공개만, 월/연도만 있는자료 제외. 자동전수coverage는 확인되지 않았다.
3. 새기능마다 자체검사·분리컨텍스트리뷰·고정SHA 인계. 현재 card 담당해제. 공통문서통합은 한세션만 한다.

## 고정 계약·환경·범위

API0.1.0-draft.2, app/docs/api/contract-reference.json·verifier/docs/contracts/reference.json을 참조한다. contractmanifest SHA256 8dfc69a8c6a5f9feb91f2d0cf6d661eec16a1aacb8e980b7abe880cd0b1f3b1e, 초기migration파일 SHA256 29ef8ef0d520f44b6a633e8f017144a3e2b2199189461a88ba99bc296c42f5b9. 기존계약pin의 package-lock과 현재backend lock차이는 기존에 기록된 상태이며 새계약으로 임의재고정하지 않는다. Node24.19.0/Nest12.4.0/Prisma7.10.1/Postgres16.14.

iOS/무료로컬우선, 한국/KST기본·국가/시간대선택, 기본영화+OTT, 게임/EPL설정추가, 2026년부터알려진미래, 하루1회갱신정책. 실제자동스케줄/전수수집과 정책은 구분한다. 작품별다른시장/플랫폼/시각 이벤트를 보존하고 date_only를UTC자정으로 만들지 않는다. 세부확정은 product/policies, 원본실행은 각작업카드가 소유한다.

과거전용계정 생성·ACL·인증실패·격리진단은 Git이력 및 VFY-03-dedicated-* 작업카드에 보존한다. 해당문서가 다음계정로그인을 요구하더라도 현재정책이 우선한다. 현재문서는 과거status4630795 등 이후 산재한 오래된요약을 정리한 것이다.

## 새 계정/모델 시작

AGENTS → 이파일 → handoff → 해당원본카드 순으로읽고 각저장소 HEAD/branch/dirty를 확인한다. 최신본읽기전 코드수정/인증반복을 하지 않는다. 웹전달은 scripts/export-context.py로생성하고 --check한다. 커밋은 영문type+한글설명, push/외부배포는 별도요청범위다.
