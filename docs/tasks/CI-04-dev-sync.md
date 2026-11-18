# CI-04 · 기본 개발 브랜치 동기화

- 요구 PROD-009/010. backend main 9f218b9, dev 76ac3d6. 구현 worktree codex/dev-ci-sync. 담당 Codex.
- 사용자 요청: main과 dev 동기화, dev에서 분기한 PR의 검사 적용. 변경 전 원격 dev의 독자 커밋 없음.
- 경계: GitHub 예약은 기본 브랜치에 적용된다. 수집 보류를 유지하기 위해 예약 잡만 명시적으로 활성화하도록 한다. 수동 백필 및 기존 동시 실행 제한을 보존한다.
- 예상 실패: fast-forward가 아닌 덮어쓰기, 예약 수집 의도치 않은 시작, PR 검사 실행과 필수 적용 혼동. 검증은 PR과 양쪽 post-push Backend CI 및 보호 규칙 재조회로 구분한다.
- 관련 LEARN-0015. acceptance 및 verdict 변경 없음.
