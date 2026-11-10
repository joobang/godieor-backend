# BE-AUTH-04 · 계정별 설정/찜 저장소 회귀 검사

- requirement: BE-AUTH / BE-SAVED / APP-AUTH, verifier acceptance draft (변경·승인 없음).
- 상태: 작성자 구현·로컬 회귀 검사 완료, 독립 검증 대기. 담당 해제(codex-be-auth-04).
- 기준: app 7b19f47d17348bc9c14dfc92ba9f5eb9bc581eb8, backend dde2d36b00ba0de69f406e20649eda950f2284a3, verifier 4d14a7107f7a1e9689b3873313af9b78b28d0b1e, 모두 시작 시 clean, branch codex/int-01-secret-check.
- 범위: backend/tests/account-repository.test.cjs 신규; backend/tests/auth-sync.test.cjs 불안정 JWT 서명 변조 검사 수정. 계약·마이그레이션·제품코드 변경 없음.
- 목표: UsersService + 실제 UsersRepository 호출 경로에서 계정별 설정 격리, 409 CAS, 찜 멱등·계정 버전·커서 계정/버전 고정을 명시 검증.
- 예상 실패: Alice 저장이 Bob에게 노출, stale version 덮어쓰기, 중복 찜으로 version 증가, 타 계정 cursor 사용, 서명 변조 테스트 비결정성.

## 실행 결과

- `node --test tests/account-repository.test.cjs tests/auth-sync.test.cjs`: 6/6 PASS, exit 0 (기존 dist 기반).
- 기본 sandbox `node --test tests/*.test.cjs`: 47 중 45 성공 / 2 실패. HTTP test listen EPERM, 기존 JWT 테스트의 마지막 base64url 문자 치환이 실제 서명 바이트를 변경하지 않을 수 있어 가짜 음성 발생. JWT 테스트를 signature 첫 바이트 XOR로 변경.
- 허용된 로컬 실행 환경의 `node --test tests/*.test.cjs`: 53/53 PASS, exit 0. 로그 `/private/tmp/godieor-auth-04-fulltests-elevated.log`.
- 이 테스트는 실제 Repository를 fake Prisma 트랜잭션/저장소 위에서 실행한 작성자 자체 검사다. 실제 PostgreSQL·Prisma migration/Google OAuth·HTTPS iOS/기기 간 왕복, 동시성 DB 트랜잭션, 독립 verifier runner 미실행.
- 인증 credentials/실 DB 없이 가능한 범위만 확인. 서버 설정 키/개인 토큰 fixture·로그에 삽입하지 않음.

## 독립 검토 인계

- app base/head: 7b19f47d17348bc9c14dfc92ba9f5eb9bc581eb8 (변경 없음).
- backend base: dde2d36b00ba0de69f406e20649eda950f2284a3 / head: 이번 commit Git에서 확인.
- verifier base/head: 4d14a7107f7a1e9689b3873313af9b78b28d0b1e (공통 문서 복사만 별도 커밋).
- contract: 0.1.0-draft.2 / 8dfc69a8c6a5f9feb91f2d0cf6d661eec16a1aacb8e980b7abe880cd0b1f3b1e.
- migration digest: 29ef8ef0d520f44b6a633e8f017144a3e2b2199189461a88ba99bc296c42f5b9.
- verifier acceptance: draft/PENDING, 승인 변경 없음. 소유 위치 verifier/requirements/acceptance.yaml.
- 독립 검증은 app/backend 고정 SHA와 contract/migration digest로 수행. 테스트 자체의 성공은 전체 통합 PASS가 아님.
- 다음: 일회용 PostgreSQL에서 동일 시나리오와 Google 클라이언트/HTTPS iOS 실제 로그인 왕복, 세션 폐기·멀티디바이스·계정 경합 재현.
- ADR: 기존 app/docs/decisions/002-account-sync.md의 계정 격리/설정 CAS/찜 멱등 정책에 대한 회귀 검사이며 설계변경 없음.
- LEARN-ID: 해당 없음(새로운 제품·아키텍처 선택 없이 기존 정책 검사를 보강).
