# 로컬 실행

## 고정한 환경

- Node 24.19.0 (`.node-version`), NestJS 12.4.0, Prisma/adapter/client 7.10.1, TypeScript 5.9.3.
- PostgreSQL 16.14: 기존 로컬 이미지를 digest로 고정. 전용 Compose 프로젝트 `godieor-local`, 볼륨 `godieor-local_pgdata`.
- DB 127.0.0.1:55432, API 127.0.0.1:3000. 다른 프로젝트 컨테이너를 수정하지 않았다.
- 이번 실행에서는 Codex의 제공된 Node 24 런타임을 PATH 앞에 사용했다. 시스템 기본 Node는 변경하지 않았다.
- 새 터미널에서는 Node 24를 먼저 선택한다. Node 20 기본 환경에서는 engines 조건으로 설치가 거부될 수 있다.

## 최초 실행

```sh
node --version
npm ci
node scripts/setup-local.mjs
npm run db:up
npm run db:migrate
npm run build
npm run collect:fixture
npm start
```

setup-local은 기존 .env를 덮어쓰지 않는다. 로컬 DB 암호·커서 서명 키를 난수로 생성하고 .env(0600)에 저장한다.
.env는 Git 제외다. DATABASE_URL/비밀을 공개 문서·로그에 복사하지 않는다.
기존 볼륨을 유지한 채 .env를 새로 생성하면 DB 암호가 달라질 수 있다. 데이터를 지우지 말고 기존 설정을 복구/일치시킨다.

## 조회

- API: http://127.0.0.1:3000/v1/health
- 이번 달 예시: http://127.0.0.1:3000/v1/calendar?month=2026-11&categories=movie,ott
- 미정: http://127.0.0.1:3000/v1/events?schedule=undated

모든 현재 일정은 가상이다. API는 dataOrigin=fixture로 표시한다.
실제 iPhone 연결은 이후 API_HOST를 도달 가능한 인터페이스로 설정하고 Mac 주소를 사용한다. 지금은 루프백 바인딩이며 iOS 앱은 아직 연결하지 않았다.

## 수집·중단

```sh
npm run collect:fixture -- --mode=backfill
npm run collect:fixture -- --mode=daily
npm run collect:fixture -- --mode=daily --force
npm run db:stop
```

backfill은 전체 가상 자료를 반영한다. daily는 KST 같은 날 성공한 scope를 건너뛰고 --force일 때만 다시 수집한다.
API는 Ctrl+C로 종료한다. db:stop은 데이터를 지우지 않는다. 볼륨 삭제/DB reset은 실행하지 않았다.
COLLECTION_SCHEDULE_ENABLED=true이면 API 프로세스가 06:00 KST에 수집한다. 기본 OFF이며 API가 꺼지면 스케줄도 실행되지 않는다.
프로세스 중단 시 advisory lock은 연결 종료로 풀리고, 남은 running 표시는 다음 실행에서 새 run으로 갱신한다.

## 변경 규칙

계약 DDL은 설계 참조, prisma/migrations가 적용 원본이다. CHECK/부분 인덱스를 db push로 대체하지 않는다.
Prisma schema를 바꾸면 별도 migration을 생성·검토한다. 이미 적용한 migration을 수정하지 않는다.
처음에는 알려진 제공처 키만 병합하고, 제공처가 다른 작품의 자동 병합은 근거/정책 확정 후 추가한다.
Google 로그인·계정별 설정/찜 API와 iOS 클라이언트 구현은 존재하지만 실제 OAuth 등록 및 iPhone↔HTTPS 서버 통합 검증은 아직이다. mock 로그인으로 우회하지 않았다.

## Google 로그인 실기기 연결 준비 (BE-AUTH-06)

1. Google Cloud Console에서 프로젝트와 OAuth 동의 화면을 준비한다. 테스트 모드라면 사용할 Google 계정을 테스트 사용자로 등록하고 필요한 OAuth 동의 화면 항목을 완료한다.
2. **iOS** 유형 OAuth 클라이언트를 생성한다. 앱 Bundle ID는 `com.joobang.godieor`이며, 생성된 **OAuth Client ID**를 확인한다. iOS 클라이언트 ID를 역순으로 표현한 **reversed client ID**를 앱의 callback URL scheme에 사용한다. Google Cloud가 표시한 설정값과 실제 redirect URI(`<reversed-scheme>:/oauth2redirect`)가 일치하는지 확인한다.
3. 앱 `ios/GODIEOR.xcodeproj/project.pbxproj`의 Debug/Release `GODIEOR_GOOGLE_CLIENT_ID`와 `GODIEOR_GOOGLE_CALLBACK_SCHEME` placeholder를 발급된 값으로 설정한다. 이 값들은 OAuth 공개 식별자이며 client secret을 iOS에 넣지 않는다.
4. backend `.env`의 `GOOGLE_IOS_CLIENT_ID`를 **동일한 iOS OAuth Client ID**로 설정한다. 이전 생성기에 의해 `.env`에 `GOOGLE_CLIENT_ID`가 있다면 키 이름을 직접 변경한다. `setup-local.mjs`는 기존 `.env`를 덮어쓰지 않는다. 비밀번호·토큰·client secret을 공유 문서/채팅/소스에 기록하지 않는다.
5. iPhone에서 접근 가능한 **유효한 HTTPS** API 주소를 준비하고 앱 Debug/Release `GODIEOR_API_BASE_URL`을 `https://<host>/v1`로 지정한다. 기본 서버는 `API_HOST=127.0.0.1`로 로컬 Mac에서만 접근 가능하므로, 실기기는 안전하게 구성된 TLS 프록시/터널/서버가 필요하다. 호스트와 실제 배포 방식은 아직 결정되지 않았다.
6. 실제 Google 계정으로 로그인 → 세션 복원 → 설정 저장 및 다른 기기 반영 → 찜 추가/삭제 → 로그아웃/401을 확인한다. 현재 이 실기기 왕복과 독립 검증은 미실행이며 전체 제품 PASS를 의미하지 않는다.

사용자가 준비할 것은 Google Cloud의 **iOS OAuth Client ID**, reversed callback scheme, 접근 가능한 HTTPS API 주소/연결 방식 선택이다. 유료 Apple 개발자 멤버십이나 별도 macOS 계정은 이 로컬 unsigned 빌드 단계에 필요하지 않다.


## 구조 변경 후 검사 · BE-03

CLI 진입점은 src/cli/collect-fixture.ts와 src/cli/collect-candidates.ts이며 기존 npm 별칭은 유지한다.
`npm test`는 clean build와 후보/DI/HTTP 경계를 검사한다. `npm run test:db`는 별도 tmpfs PostgreSQL을 만들고 검사 후 삭제한다.
기존 DB나 KNU 컨테이너·볼륨을 변경하지 않는다. 기능 모듈·계층은 [서버 구조](backend-architecture.md)를 따른다.

## 검토 후보 제품 반영

[reviewed-publish.md](reviewed-publish.md)를 따라 명시적 매핑 파일로 실행한다. 2026-11-09 작성자 실행 후 로컬 DB에는 provider4+fixture7이 있다. health는 DB에 존재하는 원천에 따라 mixed/provider/fixture/empty를 구분한다. realProvidersConnected는 provider 행의 존재이며 실시간 외부 접속 점검이 아니다. 기존 프로세스는 새 코드 실행 전까지 예전 health를 응답할 수 있다.
