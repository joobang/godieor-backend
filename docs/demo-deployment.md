# GODIEOR 빠른 데모 배포

현재 Render Blueprint(`render.yaml`)는 GitHub 연동 후 Backend CI 검사 성공 시 웹 API를 배포한다. `main`을 배포 대상으로 지정하고, `dev`는 CI만 실행한다. 웹 서버/DB 모두 무료 체험 플랜이다. **Render 무료 PostgreSQL은 30일 후 만료되므로 영구 계정 데이터에 사용하면 안 된다.** Render 대시보드에서 DB를 유료 플랜으로 전환하거나 백업/재구성 계획을 마련해야 한다.

1. GitHub에 backend 저장소를 올리고 Render New → Blueprint에서 연결한다. `main` 브랜치에 Blueprint를 적용한다. 리소스 생성은 외부 배포이므로 사용자 계정에서 직접 승인한다.
2. 서버 시작 명령이 `npx prisma migrate deploy` 후 API를 기동한다. 마이그레이션이 실패하면 서버 시작도 실패한다. 동시 인스턴스 배포와 파괴적 마이그레이션은 이 간단한 데모 방식의 범위 밖이다.
3. `GOOGLE_IOS_CLIENT_ID`에 기존 iOS OAuth 공개 클라이언트 ID를 설정한다. 운영 비밀은 Render 환경 변수에만 둔다. 기존 개인 서비스 세션은 DB에 저장된다.
4. 기존 공식 OTT 4건은 로컬 PostgreSQL에 검토 후 반영된 데이터다. **새 Render DB에는 자동으로 복사되지 않는다.** 공식 출처/후보 검토를 재현한 뒤 `docs/reviewed-publish.md` 절차로 적재한다. 현재 영화·게임·EPL의 실수집 커버리지는 아직 없다.
5. `/v1/health`와 월간 일정, Google 로그인 및 찜/설정 복원을 확인한다. `CATALOG_PROVIDER_ONLY=true`는 가상 이벤트/가상 수집상태를 목록에서 제외하며, 실제 이벤트 데이터가 없으면 달력도 비어 있다. 자동 fixture 수집은 꺼 둔다.
6. iOS Xcode에서 공개/계정 API URL을 동일한 `https://<render-subdomain>.onrender.com/v1`로 빌드 설정하고 **재설치**한다. 그 뒤 백엔드 API/DB 데이터 변경은 서버 배포 후 기존 앱에 반영된다. SwiftUI 화면·로컬 로직 변경은 다시 앱을 빌드·설치해야 한다.

Render GitHub 연동의 Auto-Deploy는 **After CI Checks Pass** 사용. GitHub Actions는 앱 코드를 원격으로 설치하거나 iOS 바이너리를 배포하지 않는다. 기존 개인 Xcode Signing 설정과 로컬 HTTPS 인증서 설치는 별개다. 외부 공개 전 비밀/개인정보/운영 계정 접근 권한을 확인해야 한다.
