# DATA-04 · 공식 제공처 일일 수집 초안

- 요구사항: PROD-005~009, 사용자 확정 하루 1회 수집. 승인 기준 verifier 원본 유지.
- 담당: codex-context-01, 종료 후 해제. 기준 backend c051d98, app a4c08d5, verifier 3111879. 공통 브랜치 codex/app-auth-phone-ready.
- 범위: KOBIS 영화, football-data EPL, IGDB 게임 어댑터, 하루 1회 CLI/GitHub Actions, OTT 분류 모델/마이그레이션/API. 기존 배치와 수동 후보 기능 보존.
- 예상 실패: 잘못된 외부 필드·인증 오류, 날짜 정밀도 손실, 동일 일정 중복, 배포 환경의 비밀 누락, 정식 OTT 일정 부족.
- 결정: 외부 원천은 서버에서 조회하고 날짜만 있는 이벤트는 date_only로 보존. 현재 OTT 공지 후보와 수동 검토 게시 흐름을 유지. 새 ADR/LEARN-ID 없음(기존 수집 패턴의 확장).

## 실행 결과와 남은 조건

- `npm test` 성공, 62/62. 최초 일반 sandbox에서 기존 dist unlink EPERM으로 실패해 허용된 빌드 환경에서 재실행함.
- `git diff --check` 성공. 코드 커밋 `6da3358` (`feat: 공식 일정 일일 수집과 OTT 분류 지원`).
- 실제 제공처 인증 응답, 운영 DB 마이그레이션, 데이터 적재, GitHub Actions 스케줄 활성화, 외부 독립 검증은 **미실행**. OTT 자동 전수 수집 및 TVING Ads 연결도 미구현.
- `backend/.env.example`에 실제 API 키 4개가 들어 있어 Git 커밋에서 제외함. `backend/.env`의 해당 값들은 비어 있음. 사용자 환경에서 Git 추적 템플릿을 비우고 Git 제외된 `.env`에 키를 안전하게 이전한 다음에야 실제 API를 검증할 수 있음. 키 값은 기록하지 않음.
- 다음 작업은 로컬 비밀 분리, 각 공식 API 실제 응답 확인, 소량 DB 적재 및 재실행 멱등성 검사, OTT 공식 소스 확장, 이후 Render + Supabase 연결이다. GitHub Actions secrets/원격 push는 별도 배포 요청 시 진행한다.

## 독립 검증 인계

- app base a4c08d5, 변경 `ios/GODIEOR/PublicAPI.swift`의 OTT 카테고리 표기. 기존 `project.pbxproj` 개인 서명 수정은 별도 미커밋.
- backend base c051d98 → head 6da3358. OpenAPI 계약·Prisma 마이그레이션 변경 포함. verifier 3111879 clean, acceptance/verdict 변경 없음.
- 앱 unsigned simulator xcodebuild 종료 0, 단 CoreSimulatorService 연결 오류 로그가 출력되어 기기 런타임 테스트로 보지 않음. 실제 iPhone/DB/외부 인증 및 통합 검증 미실행.
