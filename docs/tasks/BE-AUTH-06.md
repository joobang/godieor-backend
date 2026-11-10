# BE-AUTH-06 · Google 실연결 준비 설정 정합성

- requirement ID: BE-AUTH / APP-AUTH; verifier acceptance draft/PENDING.
- 상태: 인계 대기 / 담당 해제 (codex-google-connect-01).
- 기준 HEAD: app `62934233a58a01ecd9ca545887acf9df6ac9258f`, backend `76cf0bbf0378282e012ab9f358d99b71a86fcce1`, verifier `5efbb16144e78da2e9273ab8b297f535b583df31`. 모두 `codex/int-01-secret-check`, clean.
- 작업 checkout: backend 설정 예시·생성기·로컬 개발 안내; app 공통 인계 원본과 backend/verifier 사본. 동시 수정 없음.
- 완료 조건: 서버가 실제 읽는 환경변수와 초기화 출력 일치, 등록 절차 문서화, 자체검사 및 인계.
- 예상 실패: 생성된 `GOOGLE_CLIENT_ID`를 서버가 읽지 않아 503 발생; 기존 `.env`가 자동 변경되지 않음; 잘못된 callback scheme/접근 불가 HTTPS로 기기 로그인 실패.
- 사용자 확정: Google 로그인·서버 동기화 방향. OAuth 등록과 HTTPS URL은 아직 미제공. 전용 Mac 계정 방식 폐기.
- ADR: 기존 app ADR-002 유지(설계 변경 없음). LEARN-ID 해당 없음(환경변수 정합성 수정).

## 구현·자체 검사

- `npm test` 기본 Node20.20.2/sandbox 실행: exit 1, `dist/src/app.module.js` unlink EPERM (환경 제약).
- `PATH=<기존 Node24.19.0 런타임>:$PATH npm test` 허용된 backend 쓰기/HTTP bind 환경: exit 0, **53/53 PASS**.
- `.env.example`, `scripts/setup-local.mjs` 생성 키를 `GOOGLE_IOS_CLIENT_ID`로 통일; 실제 `.env`는 변경하지 않음.
- `docs/local-development.md`에 Cloud iOS OAuth 등록, 앱 callback/서버 audience 일치, HTTPS 요구 및 미실행 단계 기록.

## 독립 검증 handoff

- app base `62934233a58a01ecd9ca545887acf9df6ac9258f`, backend base `76cf0bbf0378282e012ab9f358d99b71a86fcce1`; head는 커밋 후 Git 이력에서 확인.
- 계약 `0.1.0-draft.2` / `8dfc69a8c6a5f9feb91f2d0cf6d661eec16a1aacb8e980b7abe880cd0b1f3b1e`; migration digest `29ef8ef0d520f44b6a633e8f017144a3e2b2199189461a88ba99bc296c42f5b9` (변경 없음).
- verifier base `5efbb16144e78da2e9273ab8b297f535b583df31`; 범위 backend config/docs. Google 실로그인·실기기 HTTPS·기기간 동기화 및 독립 검증 미실행.

## 다음 개발 세션 인계

- 사용자 Google iOS OAuth Client ID와 reversed callback scheme, 기기에서 도달 가능한 HTTPS API 주소가 준비되면 일치시켜 실기기 통합 검증한다.
- 실로그인·독립 검증은 미실행. API 계약 및 migration 변경 없음.
