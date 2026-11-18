# CI-04 · 기본 개발 브랜치 동기화

- 요구 PROD-009/010. backend main 9f218b9, dev 76ac3d6. 구현 worktree codex/dev-ci-sync. 담당 Codex.
- 사용자 요청: main과 dev 동기화, dev에서 분기한 PR의 검사 적용. 변경 전 원격 dev의 독자 커밋 없음.
- 경계: GitHub 예약은 기본 브랜치에 적용된다. 수집 보류를 유지하기 위해 예약 잡만 명시적으로 활성화하도록 한다. 수동 백필 및 기존 동시 실행 제한을 보존한다.
- 예상 실패: fast-forward가 아닌 덮어쓰기, 예약 수집 의도치 않은 시작, PR 검사 실행과 필수 적용 혼동. 검증은 PR과 양쪽 post-push Backend CI 및 보호 규칙 재조회로 구분한다.
- 관련 LEARN-0015. acceptance 및 verdict 변경 없음.

## 개발과 병합

1. 최신 `origin/dev`에서 작업 브랜치를 만든다.
2. GitHub PR의 base를 `dev`로 지정한다. `Backend CI / test`가 테스트, 일회용 PostgreSQL 마이그레이션과 HTTP API 검사를 실행한다.
3. 필수 검사가 통과하고 대상 브랜치가 최신일 때 병합한다. 릴리스는 별도 `dev → main` PR을 연다.
4. 통합 변경의 독립 검증 증거는 동일한 PR head에 연결한다. 독립 판정은 verifier가 관리한다.

## 적용 확인

- [PR #2](https://github.com/joobang/godieor-backend/pull/2)의 [Backend CI](https://github.com/joobang/godieor-backend/actions/runs/44246996316) 성공 후 main에 병합하고 dev를 fast-forward했다. `git ls-remote`에서 두 브랜치가 `d0d3648d23337099bf290ae64e3cdc11024a7d83`을 가리킴을 확인했다.
- [dev 보호 규칙](https://github.com/joobang/godieor-backend/settings/branch_protection_rules/86509995) 저장 후 PR 필수, GitHub Actions `test` 필수, 최신 base 요구, 관리자 포함 우회 금지를 재조회했다.
- 운영 수집을 보류하기 위해 예약 잡은 `COLLECTION_SCHEDULE_ACTIVE=true` 설정 시 실행한다. 수동 백필과 운영 DB 적재를 시작하지 않았다.
