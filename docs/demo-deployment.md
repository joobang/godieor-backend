# GODIEOR 빠른 데모 배포

2026-11-10 사용자 확정 배포 구성은 **Render Free Web Service + Supabase Free PostgreSQL/Storage**다. `render.yaml`은 Render 웹 서비스만 생성하고 `DATABASE_URL`을 배포 시 비밀 환경 변수로 입력받는다. Render PostgreSQL은 생성하지 않는다. GitHub 연결 시 `main`의 CI 검사 성공 후 자동 배포하며 `dev`는 CI만 실행한다. Supabase Storage 버킷은 초기 데모에서는 아직 생성/사용하지 않으며, 포스터 URL은 출처 및 이용 조건을 확인해 별도로 연결한다.

**과금 방지 조건:** Render에 결제수단을 추가하지 않고 Free 웹 서비스를 선택한다. Render는 결제수단을 등록한 계정에서 무료 서비스라도 초과 네트워크/빌드 비용이 발생할 수 있다. Supabase는 Free 조직/프로젝트를 유지하고 유료 업그레이드를 하지 않는다. 사용량 초과 시 서비스 제한이 생길 수 있으며 **항상 즉시 정지되는 것은 아니다.** Render/Supabase 대시보드에서 실제 플랜·결제수단·사용량을 직접 확인한다.

1. Supabase에서 Free 조직에 새 프로젝트를 생성하고 DB 암호를 안전하게 보관한다. 프로젝트 → **Connect**에서 PostgreSQL 연결 URI를 얻는다. Render에서 IPv4가 필요할 수 있으므로 Supabase의 **Session pooler (port 5432)** 연결 문자열 사용을 우선한다. 연결 문자열의 비밀번호를 입력하고 TLS를 요구한다(`sslmode=require`). 트랜잭션 풀러(port 6543)는 Prisma migration용으로 사용하지 않는다. DB 호스트와 인증 정보는 Git에 기록하지 않는다.
2. GitHub에 backend 저장소를 올리고 Render New → Blueprint에서 연결한다. `main` 브랜치에 Blueprint를 적용하고 **Free 웹 서비스 하나만** 생성되는지 확인한다. `DATABASE_URL`은 위 세션 풀러 URI를 Render 환경 변수에 **Secret**으로 입력한다. 리소스 생성은 실제 외부 배포이므로 사용자 계정에서 확인한다.
3. 서버 시작 명령은 `npx prisma migrate deploy` 후 API를 기동한다. 마이그레이션이 실패하면 서버 시작도 실패한다. 동시 인스턴스 배포와 파괴적 마이그레이션은 이 간단한 데모 방식의 범위 밖이다. DB 접근 실패 시 Supabase 프로젝트 상태, URI/암호 URL 인코딩, 풀러 유형 및 IPv4/TLS 설정을 점검한다.
4. `GOOGLE_IOS_CLIENT_ID`에 기존 iOS OAuth 공개 클라이언트 ID를 설정한다. `CURSOR_SIGNING_KEY`는 Blueprint에서 생성한 비밀값을 사용한다. 운영 비밀은 Render 환경 변수에만 둔다. 개인 서비스 세션은 Supabase DB에 저장된다.
5. 기존 공식 OTT 4건은 로컬 PostgreSQL에 검토 후 반영된 데이터다. **새 Supabase DB에는 자동으로 복사되지 않는다.** 공식 출처/후보 검토를 재현한 뒤 `docs/reviewed-publish.md` 절차로 적재한다. 현재 영화·게임·EPL의 실수집 커버리지는 아직 없다.
6. `/v1/health`와 월간 일정, Google 로그인 및 찜/설정 복원을 확인한다. `CATALOG_PROVIDER_ONLY=true`는 가상 이벤트/가상 수집상태를 목록에서 제외하며, 실제 이벤트 데이터가 없으면 달력도 비어 있다. 자동 fixture 수집은 꺼 둔다.
7. iOS Xcode에서 공개/계정 API URL을 동일한 `https://<render-subdomain>.onrender.com/v1`로 빌드 설정하고 **재설치**한다. 그 뒤 백엔드 API/DB 데이터 변경은 서버 배포 후 기존 앱에 반영된다. SwiftUI 화면·로컬 로직 변경은 다시 앱을 빌드·설치해야 한다.

Render GitHub 연동의 Auto-Deploy는 **After CI Checks Pass** 사용. GitHub Actions는 앱 코드를 원격으로 설치하거나 iOS 바이너리를 배포하지 않는다. 기존 개인 Xcode Signing 설정과 로컬 HTTPS 인증서 설치는 별개다. 외부 공개 전 비밀/개인정보/운영 계정 접근 권한을 확인해야 한다.

## 2026-11-11 로컬 실데이터 현황

현재 로컬 DB에 수동 검토된 공식 OTT 일정은 7건이다([DATA-09](tasks/DATA-09-ott-reviewed-expansion.md)). 위 5번의 4건 수치는 과거 시점 기록이다. Supabase 신규 DB에는 해당 데이터가 아직 없으며 검토 후보를 재생성한 다음 게시해야 한다. Render 서비스 생성·운영 HTTPS 연결·앱 재설치는 미실행이다.
