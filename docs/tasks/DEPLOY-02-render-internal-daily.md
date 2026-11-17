# DEPLOY-02 Render 내부 NestJS 일일 배치

- 요구사항: 서버 프로세스가 직접 1일 1회 수집을 실행한다. GitHub Actions 정시 실행을 중단한다. Node.js 24 보안 패치 버전을 사용한다.
- 범위: backend Node 버전 및 NestJS 스케줄러, Render Free 환경 기본값. API 계약/DB/검증 기준에는 변경 없음.
- 위험 사례: Render Free 슬립으로 실행 누락, redeploy 중 로컬 OTT 상태 소실, 원천 API 오류 또는 중복 배치, 의존성 Node 버전 불일치.
- 구현: 제공처 08:30 KST, OTT 09:00 KST(영속 state 확인 후 명시 opt-in), Actions cron 제거, Node24.22.3 통일.
- 검증: 별도 실행 로그/테스트 결과 참조. 운영 배포·실제 서버 시각 트리거·DB 게시/독립 승인 미실시.
- 관련 LEARN-ID: LEARN-0006(운영 환경), LEARN-0021(OTT 최초 공개 검증).
- 실행 환경: Render Blueprint `render.yaml`의 web/Free. Node.js 실행 버전 24.22.3, NestJS 의존 버전 12.4.0. 실행 로그에 `daily_collection` 또는 `official_ott_daily` 기록 확인 필요.
- 사전 조건: Render 환경변수 및 Supabase PostgreSQL 연결, 서비스가 계속 실행되는 유료 인스턴스 또는 동일 수준의 깨우기/스케줄 보장. OTT는 별도 영속 상태 저장이 선행되어야 한다.
- 운영 전환: 실제 Render 서비스에서 health·환경·DB migration·수집 로그 검증 후 로컬 launchd/systemd 중복 스케줄 정리. 현재 자동 전환하지 않는다.
