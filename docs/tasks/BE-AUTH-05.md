# BE-AUTH-05 · 임시 PostgreSQL 계정 통합 자체검사

- requirement ID: BE-AUTH / BE-SAVED / APP-AUTH; acceptance draft/PENDING (승인 변경 없음).
- 상태: 진행 / 담당 codex-be-auth-05.
- 시작 HEAD(clean, codex/int-01-secret-check): app e8b4f5139e2664a79dc1dd48e130e67a6b116e1e; backend a40a109cb3a0a994be547cf4eaed696d6a1bd948; verifier a4ce1f19a36b3172127c9eb5607ed45692fb47d1.
- worktree: backend 기존 checkout, 현재 단일 작성 세션; 공통 문서 원본 app에서 순차 동기화.
- 범위: backend 일회용 tmpfs PostgreSQL migration 뒤 AuthRepository/AuthService 및 UsersService/Repository를 실제 Prisma로 실행하고 세션 폐기, 계정 격리, 설정 CAS 409, 찜 멱등/커서의 DB 왕복 검증. 실제 Google ID token 인증, iPhone HTTPS, 독립 verifier 판정은 제외.
- 예상 실패: 최초 로그인 시 초기 설정 누락, 타 계정 데이터 노출, stale version이 반영됨, 찜 중복 버전 증가, cursor가 타 계정에서도 통과, 폐기 세션 유효, 임시 컨테이너 미정리.
- 사용자 확정: 전용 Mac 계정 방식 폐기; 기존 개발 DB·볼륨 사용 금지. API 계약·migration 변경 없음.
- 계약: 0.1.0-draft.2 / 8dfc69a8c6a5f9feb91f2d0cf6d661eec16a1aacb8e980b7abe880cd0b1f3b1e; migration 29ef8ef0d520f44b6a633e8f017144a3e2b2199189461a88ba99bc296c42f5b9.

## 구현·자체 검사

검사 명령과 결과는 종료 시 기록.

## 인계

- 독립검증: verifier draft/PENDING, 승인자 변경 없음. app/backend 고정 SHA는 커밋 후 Git 이력 참조.
- ADR: 기존 app/docs/decisions/002-account-sync.md, 선택 변경 없음.
- LEARN-ID: 해당 없음(계정 동기화 정책에 대한 실행 검사 추가).

## 완료 기록 (2026-11-10 KST)

- 상태: 작성자 자체검사 완료, 독립 검증 대기. 담당 해제.
- 변경: `scripts/check-account-db.cjs` 신규, `scripts/check-refactor-db.cjs`에서 실제 PostgreSQL 검사 호출·명시적 오프라인 이미지 override 지원. 기존 계약·migration 및 제품 API 변경 없음.
- `node --check scripts/check-account-db.cjs` 및 `git diff --check`: exit 0.
- 기본 `npm run test:db`: exit 1. Docker 접근은 허용됐지만 compose에 고정한 이미지 digest가 로컬에 없어 `--pull=never` 실행 실패. 해당 컨테이너 생성되지 않음. 고정 digest pull 시도는 credential helper가 응답하지 않아 중단함(결과 검증 못함).
- `GODIEOR_TEST_POSTGRES_IMAGE=postgres:16-alpine npm run test:db` (Node 24.19.0 PATH 지정, 허용 Docker 환경): exit 0. 로컬 image ID sha256:aa6cb33cf4c19c765cefcf48d96176258800870a9a1e930ad126200f9d825139, **정책 고정 digest와 다름**. 새 임시 tmpfs PostgreSQL migration, Nest DI, 가상 수집, 계정 subject 재사용/서로 다른 세션, 사용자 A/B 설정격리·CAS 409, 찜 중복/삭제/버전·커서, 한 세션 폐기 후 다른 세션 유지, 기존 DB 스모크 모두 통과. 임시 컨테이너 제거 확인. pg client deprecation warning 1건 관찰, 실패 아님.
- `npm test` (Node24.19.0, 허용 HTTP bind 환경): 53/53 PASS, exit 0. 검사는 작성자 자체 테스트이며 실제 Google ID token 검증·iPhone HTTPS·기기간 설정 동기화는 미실행.
- 다음: 고정 PostgreSQL 이미지 재확보 및 해당 digest로 재실행, 기기용 HTTPS/Google OAuth Client 등록 후 실제 기기간 인증·세션·동기화 검증, 별도 컨텍스트 verifier 리뷰. verifier acceptance/verdict 변경 금지.
