# OPS-01 · Render + Supabase 무료 데모

- requirement ID: OPS-01/P02/P08 (acceptance 기존 draft; 승인 미변경)
- 상태: 인계 대기 (클라우드 계정 설정 및 실배포 미완료)
- 담당: codex-deploy-01, 코드 준비 후 담당 해제
- 기준: backend f343b424, branch codex/app-auth-phone-ready, clean; app 7f0b228, 동일 branch, pbxproj 개인 설정 dirty 보존.
- 작업 범위: Render 무료 Web만 생성하는 Blueprint, Supabase TLS session pooler DB 환경 설정/배포 문서, 정책 인계. 실패 사례: 잘못된 URL·비밀번호, pooler 연결 거절, 무료 플랜 초과, 빈 클라우드 DB, OAuth audience 불일치.
- 사용자 확정: Render Free + Supabase Free, 자동 청구 원치 않음, 오늘 실제 배포 목표.
- 완료 조건: 코드 준비와 자체 검사 + 실제 Cloud health·실데이터·실폰 검증은 결과대로 구분.

## 구현·검사

- `render.yaml`: Render 자체 DB 제거, 외부 `DATABASE_URL` secret 입력.
- `docs/demo-deployment.md`, ADR-014: 연결·무료 플랜·Cloud 리소스 설정 절차.
- `npm test` (Node 20.20.2): 실패(exit 1). 기존 `dist/src/app.module.js` unlink EPERM으로 clean-dist 단계에서 중단. 코드/테스트 자체 결과가 아님. Node 24 재실행 필요.
- Ruby YAML 구조 검사: Render DB 미생성/웹 Free/`DATABASE_URL` secret 확인 성공. `git diff --check` 성공.
- `node --test tests/*.test.cjs` (기존 dist, Node 20): 47개 중 46 통과, 1개 HTTP listen EPERM. 변경 코드 전체 재빌드 결과는 아님.

## 독립 검증·남은 작업

- API 계약·migration·verifier acceptance 불변. LEARN-ID 해당 없음(클라우드 배포 운영 문서 변경, 후속 실제 장애 발생 시 학습 연결).
- 외부 Render/Supabase 리소스 생성·클라우드 실데이터 publish·iOS 운영 주소 설치·Google 로그인/계정 왕복은 아직 미확인.
- 배포 계정 연결 뒤 DB URL은 코드·로그·Git이 아닌 Render secret에 입력한다.
- Base/head: app `7f0b228`/불변(서명 pbxproj dirty), backend `f343b42`/커밋 후 확인, verifier 별도 HEAD. 계약 SHA256 `c73ab7998625a6eaf32c9645c87c46c22651feb2fad9e4bc664630779d48e7da`, 초기 migration SHA256 `29ef8ef0d520f44b6a633e8f017144a3e2b2199189461a88ba99bc296c42f5b9`; 계약/마이그레이션 변경 없음.
