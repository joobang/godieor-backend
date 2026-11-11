## DATA-07 세계 게임 출시일 확대 (2026-11-11)

- backend `docs/tasks/DATA-07-global-game-releases.md`: IGDB WORLD에 북미·유럽·아시아·전세계 출시 지역 포함. KR/JP/AU/NZ/CN/BR 개별 지역 유지, 날짜별 페이징·요청 간격·대량 DB 게시 시간 조정.
- 작성자 `npm test` **63/63 통과**, 실제 `npm run collect:daily` 성공. 로컬 DB GAME 출처 이벤트 WORLD **4,761**, JP **75**, BR **4**, KR **3**, AU **3**, NZ **2**, CN **1**. GTA VI WORLD 2026-11-19 조회됨(플랫폼별 중복은 별도 이벤트). IGDB 시점 데이터 기준.
- 로컬 DB 적재 성공, **클라우드 DB 적재·실기기 UI·독립 검증·OTT 전수/이미지 수집 미실행**. iOS signing 미커밋 변경 보존, verifier 기준·계약·migration 불변.

## OPS-01 Render + Supabase 무료 배포 (2026-11-10)

사용자가 Render Free API + Supabase Free PostgreSQL/Storage를 확정했고 오늘 배포를 목표로 한다. backend `render.yaml`에서 Render 30일 만료 DB를 제거하고 `DATABASE_URL` secret을 입력받도록 변경. 연결 및 무료 과금 방지 절차는 backend `docs/demo-deployment.md`, 원본 작업 카드 `docs/tasks/OPS-01-render-supabase.md`, ADR-014. 실 Supabase/Render 생성·migration·공식 데이터 적재·폰 운영 URL 전환은 아직 미확인. iOS pbxproj 개인 설정은 유지.

# 계정·모델 사이에서 작업 이어받기

## APP-DEMO-01 인계 (2026-11-10)

사용자 우선순위는 UI 소규모 수정 → 검증된 실데이터 → 클라우드 데모 → 자동 배포. app ContentView의 두 찜 버튼을 하나의 하트로 합쳐 contentId가 있으면 작품 찜, 없으면 일정 찜으로 저장하고 캘린더 아래 개별 제공처/마지막 성공 정보를 숨겼다. backend `CATALOG_PROVIDER_ONLY`는 이벤트 조회(날짜/미정)와 freshness에서 fixture를 필터링한다. Render Blueprint/CI/운영 절차 초안 작성, 외부 리소스 미생성. 이 환경에서 iOS unsigned 빌드 성공·backend `tsc --noEmit` 성공, `npm test`는 Node20과 기존 dist 쓰기 EPERM으로 미통과. 공식 OTT 4건 실데이터는 과거 로컬 적재뿐이며 새 클라우드 DB에 아직 없다. 앱 프로젝트 기존 서명/HTTPS 설정 dirty 보존. 원본 카드 app `docs/ai/tasks/APP-DEMO-01.md`, backend 배포 절차 `docs/demo-deployment.md`. API 계약·migration·verifier acceptance 변경 없음, 승인/PASS 주장 금지. 다음은 Node24 전체 검증, 공식 데이터 재검토 후 새 DB 적재, Render/GitHub 연결과 실기기 HTTPS 빌드 및 사용자 확인이다.

## APP-AUTH-12 최신 인계 (2026-11-10)

사용자가 iPhone Google 로그인이 정상이라고 확인. APP-AUTH-12에서 계정 설정·찜의 원격 전체 조회 진행/성공 시각/실패 UI와 로컬 필터 저장 안내를 추가했다. 작성자 unsigned iOS Simulator Debug 빌드 성공. 실기기 신규 UI, 재실행 세션 복원, 설정/찜 다른 기기 왕복, 독립 검증은 미실행. 기존 Xcode signing/API override 미커밋 변경은 보존한다. 다음 세션은 app 카드와 Git 상태를 확인하고 iPhone 실험으로 진행한다. 전용 macOS 계정 방식은 폐기 상태 유지.

revision: `CONTEXT-2026-11-10-20`. 원본 app `docs/system/`, backend/verifier에는 동일 사본.

## APP-AUTH-08 인계 (2026-11-10)

사용자 제공 Google iOS OAuth 공개 Client ID를 app Xcode Debug/Release에 반영하고 callback URL scheme을 역순 ID로 등록. backend 로컬 .env도 같은 GOOGLE_IOS_CLIENT_ID로 설정(비밀 변수 내용 공개/커밋 금지). 앱 카드 `docs/ai/tasks/APP-AUTH-08.md`. 실제 HTTPS API URL 준비 후 iPhone Google 계정 로그인·설정/찜 동기화·세션 복원을 시험해야 하며 독립 검증/전체 PASS는 미실행. 전용 Mac 계정 폐기 유지.

## BE-AUTH-06 인계 (2026-11-10)

backend `docs/tasks/BE-AUTH-06.md`에서 초기 `.env` 생성 키를 실제 사용 키 `GOOGLE_IOS_CLIENT_ID`와 맞췄다. 기존 `.env`는 수동으로 수정한다. Google Cloud iOS OAuth Client ID/역순 callback scheme과 iPhone이 접근 가능한 HTTPS API URL이 사용자 준비 사항이다. backend 작성자 테스트 Node24 환경 53/53 통과; 기본 Node20 sandbox의 dist unlink EPERM 기록. Google 실제 로그인, 기기간 동기화, 독립 verifier 미실행. 전용 macOS 계정 폐기 유지, 계약 및 migration/acceptance 변경 없음.
공통 문서는 `SYNC-2026-11-10-02`이다. APP-01 통합 및 독립 검증 대기 상태를 반영했고 OTT 날짜 정책/API 스키마는 유지한다. 별도 맥락 저장소·DB·서버 없이 기존 문서를 사용한다.


## 2026-11-10 신규 계정 구현 인계

APP-BE-AUTH-01 카드에 Google/서비스세션/서버설정·찜 코드와 검증을 기록했다. backend 51 테스트 및 iOS unsigned build 자체 성공. 실 Google OAuth/실DB·기기간 왕복/독립 통합 검증은 아직 수행하지 않았다. 등록된 OAuth client/HTTPS 접근 준비가 필요하며 verifier verdict/acceptance는 건드리지 않는다. 원본 문서는 app/docs/system이고 backend/verifier 사본은 동일 revision. 전용 Mac 계정 방식은 계속 폐기 상태다.

APP-AUTH-02(app d8358ec)은 HTTPS 계정 API 주소 빌드 주입과 찜 cursor 충돌 재시도. APP-AUTH-03(app `docs/ai/tasks/APP-AUTH-03.md`)은 계정 전환 중 지연 응답 차단과 로그아웃 시 로컬 즉시 정리/기존 token으로 서버 폐기를 추가한다. 요청 시작 bearer token을 연속 API 호출에 고정한다. 기존 backend dist 테스트 44/45(1개 listen EPERM), iOS unsigned build는 별도 기록. 실기기 Google OAuth/실DB·계정격리/독립 검토는 여전히 대기이며 서버 로그아웃 폐기 실패는 잔여 위험이다.

BE-AUTH-04(backend `docs/tasks/BE-AUTH-04.md`)는 UsersService/Repository 경로의 계정 격리·설정 CAS·찜 멱등/커서 회귀 검사 2개를 추가하고 JWT 변조 테스트의 Base64URL 마지막 문자 비결정성을 수정했다. 허용된 HTTP 바인딩 환경에서 전체 backend 기존 dist 검사 53/53 통과, 일반 sandbox에서는 listen EPERM을 관찰했다. fake Prisma 기반 작성자 자체 검사이며 실제 DB/Google OAuth/HTTPS/독립 검증 결과로 확대하지 않는다. API 계약·migration 불변, 전용 Mac 계정 방식 폐기 유지.

## APP-AUTH-07 인계 (2026-11-10)

앱 `docs/ai/tasks/APP-AUTH-07.md`: 설정 PUT·찜 PUT/DELETE의 401에서 해당 요청 세션이 현재와 일치하면 Keychain/화면 상태 즉시 정리, 계정 필터는 APP-AUTH-06 경로로 초기화. 늦은 다른 세션의 401은 무시. iOS unsigned build 성공, 실제 Google/HTTPS 401 UI·두 기기·독립검증 미실행. API/migration/acceptance 변경 없음.

## APP-AUTH-06 인계 (2026-11-10)

앱 `docs/ai/tasks/APP-AUTH-06.md`: 계정 소유 필터 표식을 저장하고 로그아웃·401·계정 변경 시 기본값으로 복원한다. 재시작 중 이전 계정 필터는 Keychain 복원 전에 초기화하고 성공한 계정 설정만 재적용한다. iOS unsigned build 성공, CoreSimulator 서비스 경고 관찰. 실 Google/HTTPS·두 기기·독립 검증 미실행. 계약 및 migration 불변.

## APP-AUTH-05 인계 (2026-11-10)

앱 `docs/ai/tasks/APP-AUTH-05.md`: 여러 refresh 중 최신 시작 응답만 반영하고 설정 저장과 refresh 응답의 충돌을 revision으로 방지. 찜 쓰기 완료 후 pending 해제 → 서버 재조회 순서로 바꿔 APP-AUTH-04의 후속 재조회 누락을 수정. iOS unsigned build 성공, 실행 중 CoreSimulator runtime 경고 관찰. Google 실로그인/실기기 지연 응답/2기기 동기화/독립 검토 미실행, 계약 및 마이그레이션 변경 없음.

## APP-AUTH-04 인계 (2026-11-10)

앱 `docs/ai/tasks/APP-AUTH-04.md`에 화면 active 복귀 시 원격 설정/찜 refresh, 찜 같은 대상 중복 mutation guard 및 snapshot 경합 방어를 기록했다. iOS 서명 없는 빌드 성공. Google 실로그인·HTTPS 실제 기기/두 기기 왕복/외부 리뷰는 미완료. API/migration 불변.

## BE-AUTH-05 실제 DB 인계 (2026-11-10)

backend `docs/tasks/BE-AUTH-05.md` 원본에서 작성자 실행 결과 관리. 임시 PostgreSQL에서 실제 Prisma 계정/서비스세션 발급·폐기, 사용자별 설정 CAS 409, 찜 멱등/커서 계정·버전 경계 자체검사 통과. `npm test` 53/53, `test:db` exit0. 다만 고정 digest 이미지가 로컬에 없어서 `GODIEOR_TEST_POSTGRES_IMAGE=postgres:16-alpine`을 명시해 로컬 이미지로 실행했으며 고정 이미지 재검증 필요. 운영 DB 사용 없음, 임시 컨테이너 제거. 계약/migration 변경 없음. Google 실인증·HTTPS iOS·멀티기기 왕복·독립 검증 미실행, verifier draft/PENDING 그대로다.

## 2026-11-11 DATA-04 작업 인계

backend 6da3358 공식 제공처 일일 수집 코드 및 app OTT 분류 응답 표시 구현. 테스트 backend 62/62, 앱 unsigned build 종료 0(CoreSimulator 경고). 실제 인증/DB 반영 및 OTT 전수 수집 검증은 남았다. backend 추적 .env.example에 사용자 실키가 있어 미커밋이며, 무시된 .env의 제공처 키는 비어 있다. 키 이전 전 git add -A 금지. 개인 iOS pbxproj 변경 보존. 상세 기록 backend docs/tasks/DATA-04-daily-official.md와 app docs/ai/tasks/APP-DATA-04.md. 독립 verifier 판단은 변경 없음.

## 시작

1. 역할(설계/구현, 독립 검토)을 확인하고 작업 저장소 `AGENTS.md`를 읽는다.
2. 구현 세션은 `status.md`와 정책/작업 원본을 읽고 각 저장소의 HEAD·branch·dirty 상태를 확인한다.
   디스크 파일이 웹 전달본/기준 SHA와 다르면 차이를 확인하고 오래된 전달본의 상태를 그대로 적용하지 않는다.
3. 현재 작업 카드와 사용자 요청을 확인한다. 관련 없는 선행 작업을 다시 구현하거나 미정 정책을 승인하지 않는다.
4. 코드/문서 수정 전 작업 카드를 만들거나 이어받는다. 작업 ID, requirement ID(없으면 이유), 담당 세션의 식별명,
   상태, 기준 SHA, 작업 브랜치/worktree, 수정 범위, 완료 조건, 예상 실패 사례를 적는다.
   개인 이메일/토큰 대신 `codex-context-01` 같은 임의 세션 이름을 쓴다.

작업 카드 원본은 작업 저장소 `docs/tasks/` 또는 app의 기존 `docs/ai/tasks/`에 둔다.
상태 문서는 카드 위치를 연결한다. 같은 기록을 세 저장소에 복제하지 않는다.

## 계정 전환과 동시 수정

- 순차 전환: 이전 세션이 카드에 중단 위치·미커밋 파일·다음 행동·실행/미실행 검사를 남기고 담당을 해제한다.
  다음 세션은 Git 상태와 비교한 뒤 담당을 인계받는다. 기존 변경을 임의 reset/stash/덮어쓰기 하지 않는다.
- 동시 개발: 서로 다른 작업과 `codex/` 브랜치, 별도 worktree를 사용한다. 동일 checkout에서 동시에 수정하지 않는다.
  카드에 같은 파일/계약 변경이 겹치면 구현을 나누거나 순차 진행하고, 통합 시 변경과 검사를 다시 확인한다.
- 공통 `status.md`, 정책/계약은 한 세션이 통합한다. 다른 세션은 자기 카드에 변경 제안을 기록한다.
  카드의 담당 표시는 잠금 장치가 아니다. 작업 시작 전 실제 실행 중인 세션과 파일 변경을 확인한다.
- 다른 장치에서는 로컬 미커밋 파일이 전달되지 않는다. 사용자 요청 범위의 push/pull 또는 파일 전달 후 SHA를 확인한다.

## 종료·중단

1. 카드에 실제 변경, 사용자 확정/구현 제안, 실제 명령·결과, 미실행 검사·남은 문제를 기록한다.
2. 정책/ADR/학습 기록은 해당 원본을 갱신하고 연결한다. 가설·예방 설계·실제 실패를 구분한다.
3. `status.md`의 현재 상태·작업 목록·다음 행동을 갱신하고 status/handoff 사본을 함께 동기화한다.
   제품 정책을 바꾸면 기존 architecture/plan/policies도 동일 SYNC revision으로 갱신한다.
4. README·로드맵의 현재 상태 요약이 원본과 충돌하지 않는지 확인한다.
5. 검토 가능한 단위로 영문 타입 + 한글 설명의 커밋을 만든다(`docs: 인계 문서 갱신` 등). 자기 커밋 SHA를 같은 커밋 안에 넣으려 하지 말고,
   최종 SHA는 Git 이력과 커밋 후 생성하는 웹 전달본에서 확인한다. 담당을 해제하고 다음 행동을 남긴다.

## 커밋 메시지 형식

`type(scope): 한글 설명`으로 쓴다. scope는 선택이다. 타입은 `feat`, `fix`, `docs`, `chore`, `test`,
`refactor`, `build`, `ci`, `perf`, `revert` 등 영어로 쓰고 변경 설명은 한글로 적는다.
기능 추가는 `feat: 월간 달력 추가`, 문서 수정은 `docs: 커밋 규칙 보완`, 검사는 `test: 날짜 경계 검사 추가`처럼 쓴다.
기존 커밋은 재작성하지 않는다. 이 규칙은 commit 권한을 push·배포 권한으로 확대하지 않는다.

## ChatGPT 웹에 전달

세 저장소를 같은 상위 디렉터리에 둔 상태에서 app에서 실행한다. Python 3.9 이상, 외부 패키지 불필요.

```sh
python3 scripts/export-context.py
python3 scripts/export-context.py --check
```

생성물은 app `work/context/chatgpt-context.md`다(Git 제외). 커밋 후 생성하고 `--check`로 최신 여부를 확인한 뒤
ChatGPT 웹 대화/프로젝트에 업로드한다. 기본 형제 경로가 다르면 `--backend /경로 --verifier /경로`를 사용한다.
명시한 공개 문서 목록과 작업 카드 디렉터리(app `docs/ai/tasks/`, backend/verifier `docs/tasks/`),
backend ADR 디렉터리 `docs/decisions/`의 바로 아래 `.md` 파일만 합친다. 새 카드는 다음 생성에 자동 포함된다.
필수 파일 하나라도 없거나 공통 사본이 다르면 생성에 실패한다.
각 출처의 SHA-256과 세 저장소 HEAD·branch·dirty 상태, UTC 생성 시각을 포함한다.
제품 실행 여부·승인 여부를 검사하는 도구는 아니다. 키·대화 원문·.env·실행 로그는 수집하지 않는다.

웹에서 다음과 같이 요청한다.

> 첨부 문서의 생성 시각·커밋·dirty 상태를 확인하고 현재 상태부터 읽어라.
> 포함된 문서만 읽었다고 말하고 미포함 링크를 읽었다고 가정하지 마라.
> 사용자 확정·기술 제안·미정·작성자 실행·독립 검증을 구분해 논의해라.
> 코드가 없는 전달본만으로 구현 정확성이나 검증 PASS를 선언하지 마라.

웹 대화는 로컬 파일을 자동 갱신하지 않는다. 웹에서 합의한 변경은 관련 작업 카드에
날짜·제안/사용자 확정 여부·이유·적용할 원본 위치를 남겨 Codex에 전달한다.
Codex는 현재 파일/정책과 대조해 반영하고 새 전달본을 생성한다. 예전 파일을 함께 업로드했다면 최신본을 명확히 지정한다.
전체 대화 원문 보관은 필수가 아니다. 작업에 영향을 준 결정·반례·미해결 질문을 남긴다.

## 독립 검토 예외

독립 reviewer에게 구현용 웹 전달본·구현 대화·작성자 학습 해설을 주입하지 않는다.
기존 verifier 절차에 따라 요구사항/기준, 고정 app/backend SHA, 계약/migration digest,
변경 사실과 공식 근거를 제공한다. 현재 상태 문서는 검증 가능 범위/원본 위치 확인용이고 결과의 정답이 아니다.
구현 담당이 기록을 공유했다는 이유로 acceptance나 verdict를 승인할 수는 없다.


## 현재 실행·인계 정책 (2026-11-10)

전용macOS계정 방식은 사용자지시로폐기했다. godieorbuild로그인·su·비밀번호·ACL확장/복구를 다음필수작업으로 요구하지 않는다. OS계정자체는이작업에서삭제하지 않았다. 현재코드 verifier de0560f 및 docs/local-verification.md를 따른다.

기존계정에서 검토한고정source로 iOS서명없는빌드와 backend/임시DB 검사를수행한다. iOS local-reviewed와 backend sandboxed를구분, isolation_verified=false 유지. 증거binding/독립리뷰/실패·미실행표시/승인기준을 유지한다. 로컬실행성공과 전체제품PASS를구분한다.

새대화 요청:
> 세저장소 AGENTS와 app/docs/system/status.md·handoff.md, verifier/docs/tasks/INT-01-secret-check.md·docs/secret-check.md·docs/local-verification.md를읽고 Git상태를확인해라. 전용Mac계정방식은폐기됐다. 검사107개/고정run의iOS·backend·API·DB·literal비밀검사는성공했지만 필터/계정설정/제공처/UI흐름4개미완료로전체ERROR다. 가상UI로로컬설정복원은확인했으나 Google/계정서버코드는구현됐으나실Google/실단말왕복은미확인이다. 다음작업은최신APP-AUTH-09/10카드를읽고실제HTTPS기기연결부터확인해라. 이미구현한인증/동기화를중복구현하지마라. 기준승인/전체PASS를만들지마라.

## APP-AUTH-09 인계 (2026-11-10)

Mac 로컬 API(127.0.0.1:3000)를 같은 Wi-Fi 테스트 iPhone에 TLS로 노출하는 개발 도구를 app/scripts에 추가했다. 인증서 설치·실제 주소 설정 절차는 `docs/ai/local-iphone-auth.md`, 카드 `docs/ai/tasks/APP-AUTH-09.md`. 실기기 연결·Google 로그인·서버 동기화·독립 검증은 미실행. 전용 Mac 계정 방식 재개하지 않음.

## APP-AUTH-10 최신 인계

공개/계정API주소해석을 app9f04c67에서통일. Swift주소회귀와실제번들Info값검사·iOSunsigned빌드성공, 분리컨텍스트재검토완료. 실제Google/iPhone/HTTPSproxy는미실행. 다음세션은 APP-AUTH-10→09→local-iphone-auth 문서를읽고실제주소·backend가동을확인한다. 전용Mac계정방식재개/인증코드중복구현금지. 키/인증서신뢰·실폰조작은사용자범위와구분하고실행하지않은성공을선언하지않는다.

## APP-AUTH-11 최신 인계: 사용자 iPhone 단계

Mac실제HTTPS CA/hostname검증·health/options200·비인증/invalidtoken401 및unsigned iPhoneOS build성공. 원본 app/docs/ai/tasks/APP-AUTH-11.md. 공개CA와구체적인현재주소는app/work/iphone/에있고개인키를공유하지않는다. 서버는기존사용자프로세스를유지했다.

사용자가동일Wi-Fi iPhone에개발CA프로파일설치후일반→정보→인증서신뢰설정에서해당CA를직접신뢰하고Safari health를확인해야한다. Mac계정분리·GoogleClient재등록·기존서버재시작을자동선행작업으로만들지마라. 실제폰/정상Google로그인/기기간왕복은미확인. 원본IP/서버생존은재확인하고인증서경고를우회하지않는다.

## 사용자 폰 health 확인 후 재개

폰Safari health는사용자확인완료. CoreDevice읽기연결/개발자모드확인. 다음실행전Xcode의DEVELOPMENT_TEAM본인계정선택이필요하며아직미지정이다. 사용자Team설정후서명빌드·설치·Google로그인으로진행한다. 폰인증서설치나기존서버준비를다시첫단계로돌리지말고실행하지않은정상로그인/동기화성공을선언하지않는다.
## DATA-03 인계 (2026-11-10)

- backend `16fb65f`: `npm run publish:catalog -- --file <절대경로>`로 검토된 영화·게임·EPL Canonical JSON을 provider-origin으로 적재하는 경로 구현. 입력 전체 선검사, 중복 키 거부, 기존 작품/팀/시장 정체성 preflight 보호. 작업 카드 backend `docs/tasks/DATA-03-reviewed-catalog.md`.
- 작성자 `npm run build` 성공, 신규 5/5 및 기존 포함 58/58 테스트 통과. 첫 기본 sandbox build는 기존 dist 삭제 EPERM, 허용 실행에서 성공. 실제 공식 데이터/DB 재적재/API end-to-end/독립 검증은 미실행.
- 다음 단계는 공식 1차 출처 기반 영화·게임·EPL 레코드의 수동 근거 검토와 로컬 적재. Render+Supabase 배포는 아직 하지 않음. app iOS 프로젝트 signing/HTTPS 미커밋 설정 그대로 보존.
## DATA-05 공식 수집 로컬 검증 인계 (2026-11-11)

backend .env에 공식 제공처 키 4개가 설정됐고 추적 .env.example 키는 비어 있음. EPL 2027시즌 미공개 404 처리와 IGDB 한국 출시일 date 타임스탬프 파싱 수정. backend 자체 테스트 63/63 성공. 로컬 PostgreSQL에 기존 OTT 카테고리 마이그레이션 적용 후 KOBIS 1,902/EPL 380/IGDB 1건 적재, 같은 날 재실행 모두 skip. 클라우드 DB/OTT 자동 전수/독립 검증 미완료. backend docs/tasks/DATA-04-daily-official.md 참조. iOS 개인 signing 변경 보존.
# DATA-06 모바일 플랫폼 인계 (2026-11-11)

backend IGDB KR 출시일에서 iOS/Android 분류를 지원하고 game_device enum migration과 OpenAPI options/settings를 확장했다. iOS 동적 필터·상세 기기명 표시도 변경했다. 자체 backend 63/63, unsigned Simulator 빌드 성공. 로컬 DB migration 적용 및 IGDB 강제 재수집 성공(3건, iOS/Android 각 1건 확인). iPhone 설치/클라우드 migration·서버 배포·독립 검증은 미완료. app 개인 pbxproj 서명 설정은 건드리지 않았다. 원본 카드 backend `docs/tasks/DATA-06-mobile-platforms.md`, app `docs/ai/tasks/APP-DATA-06.md`. 후속은 migration 적용 후 IGDB 재수집, 모바일 필터/계정 저장 확인. OTT 전수·이미지 적재는 별도 미완료.

# DATA-08 게임 포스터 후속 인계 (2026-11-11)

- backend `docs/tasks/DATA-08-game-cover-metadata.md` 기준 IGDB 커버 이미지 ID → 기존 `content.poster_url` 경로 구현. 앱 API 계약/DB migration/verifier acceptance 변경 없음.
- 실제 IGDB 강제 재수집·DB poster 수 확인·API/폰 카드 표시 점검이 다음 행동. 로컬 API 3000 미기동, iOS 개인 signing 미커밋 파일 유지. OTT/영화 포스터와 운영 배포 미완료.

