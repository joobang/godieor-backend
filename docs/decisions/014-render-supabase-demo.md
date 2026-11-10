# ADR-014 · Render + Supabase 무료 데모 배포

- 날짜: 2026-11-10
- 상태: accepted (사용자 서비스 선택). 외부 리소스 생성 및 배포 검증은 별도 상태.
- 사용자 결정: 개인 개발/가족 테스트용 GODIEOR를 Render Free API + Supabase Free PostgreSQL/Storage로 시작. 초과 이용 시 유료 청구 없이 제한되기를 희망.

## 선택

NestJS는 Render Free 웹 서비스, PostgreSQL은 Supabase Free 프로젝트에서 운영한다. Storage는 이미지 파일 필요 시 Supabase에서 추가하며 최초 배포의 필수 의존성으로 두지 않는다. 현재 공개 poster URL 필드는 유지하며 무허가 이미지를 Storage에 복제하지 않는다.

Render Blueprint는 웹 서비스 하나만 생성하고 연결 문자열을 외부 비밀 환경 변수로 받는다. Prisma 7 migration과 pg adapter가 모두 접근할 수 있도록 TLS가 적용된 Supabase **session pooler 5432** 연결을 사용한다. transaction pooler는 초기 migration 경로에서 사용하지 않는다. 외부 DB 네트워크 연결이 불가능하면 배포 실패로 남긴다. Google audience 및 session-signing 비밀도 Render 환경 변수로 관리한다.

Render 결제수단을 등록하지 않은 Free 서비스는 월간 대역폭·빌드 제공량 초과 시 제한될 수 있다. 결제수단이 등록된 Render 계정에서는 무료 인스턴스라도 초과 과금이 가능하다. Supabase Free는 초과 사용에 과금하지 않지만 유예/제한 정책이 있고 즉시 정지가 보장되지는 않는다. DB/Storage 백업 및 부하/호출량 관리는 별도 과제다.

## 배포 게이트

Supabase 프로젝트·Render Blueprint 생성 → 연결 문자열 비밀 설정 → migration/health → 공식 근거가 있는 실데이터 적재 → iPhone 운영 HTTPS URL로 재설치 및 OAuth/찜 확인. API/DB 구현이 준비됐다는 사실만으로 운영 성공 또는 검증 PASS로 기록하지 않는다.

실행 절차: [데모 배포](../demo-deployment.md). 관련 작업: [OPS-01](../tasks/OPS-01-render-supabase.md). 이 변경은 API 계약·migration·acceptance를 수정하지 않는다.
