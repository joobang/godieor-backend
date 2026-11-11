# DATA-06 · 모바일 게임 플랫폼 수집·필터

- Requirement: PROD-002, PROD-005, PROD-009 (기존 verifier 기준 변경/승인 없음).
- 상태: 구현 및 로컬 DB 재수집 완료, 클라우드 배포·실기기·독립 검증 대기.
- 담당: codex-context-01 (종료 시 담당 해제).
- 기준: backend 8551ba3 / app 65d42c0 / verifier 기존 상태. 브랜치 codex/app-auth-phone-ready, app 사용자 개인 변경 `ios/GODIEOR.xcodeproj/project.pbxproj` 보존.
- 변경: IGDB의 한국 지역 일자확정 Android/iOS 릴리스 분류, 게임 기기 상수·API/OpenAPI·DDL·Prisma enum·마이그레이션, iOS 동적 필터 한국어 표시, 관련 회귀 검사.
- 예상 실패: 플랫폼 명칭 누락/혼합, 월만 확정된 일자를 날짜로 잘못 적재, 기존 설정값 오염, 서버 DB enum migration 누락.
- 완료 기준: 빌드·테스트 성공, 배포 전 DB migration 선적용 및 모바일 이벤트 재수집, 필터 선택 확인.

## 작성자 자체검사

- backend `npm test` 최초 일반 sandbox에서 기존 dist unlink EPERM으로 실패(Node20). 허용 실행 `npm test` 통과 63/63.
- app 서명 없는 iOS Simulator `xcodebuild ... CODE_SIGNING_ALLOWED=NO build` 통과(첫 변경).
- 로컬 PostgreSQL migration 적용 완료. IGDB daily 강제 재수집 성공(published=3). event_device 집계 ios=1, android=1, pc=2, xbox=1(기존 데이터 포함). 클라우드 migration·iPhone 수동 확인·독립 verifier 실행은 미실행.

## 독립 검증 및 인계

- 앱 base 65d42c0, backend base 8551ba3. head는 커밋 완료 후 Git 확인.
- OpenAPI Device enum·Settings devices maxItems 변경, `202611110001_mobile_game_devices` migration 추가. 계약/migration digest는 인계 시 계산.
- 기존 verdict/acceptance는 변경하지 않음. app 개인 signing 변경 스테이지하지 않음.
- 후속: 클라우드 DB에 migration 적용 후 수집. iPhone 필터 및 계정 설정 저장·복원 검증. OTT 확대와 포스터 수집은 별도 미완료 요청.
- ADR/LEARN: 기존 게임 플랫폼 분류 확장으로 신규 기록 해당 없음.
