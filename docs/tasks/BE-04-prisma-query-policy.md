# BE-04 · Prisma Client 우선 쿼리 정책과 기존 조회 정리

- 요구사항: SYS-02/BE-02C, 사용자 지시: Prisma Client 우선·필요 SQL만 근거를 기록하고 현재 코드도 수정.
- 담당 codex-query-04, 구현/자체 회귀 완료, 담당 해제. 기준 app eca26d8/dev, backend 0799404/dev, verifier aab266d/dev. 시작 clean.
- 범위: 불필요 raw 조회를 Client로 전환, 복잡한 SQL 분리/입출력 검증·예외 근거/자체 검사·문서.
- 실패 가설: 혼합 날짜 정렬/페이지/DST/월 건수/변경 이력 의미 변화, 수동 반환 타입을 자동 타입 보장으로 오인.
- 완료: Client 표현 가능한 조회 전환, SQL 예외 위치/이유/검사 명시, 동일 API·DB 회귀.
- API/스키마/migration/승인 acceptance 의미 변경 없음. 문서/코드 규칙을 반영했다.

## 실행 · 2026-11-09

- `npm test` (임시 Node24 PATH): build + 33개 검사 통과. 새 검사는 raw 허용 위치/unsafe 금지, Zod 실패, Client 관계/ID 필터, 100행 이력 경계, 잘못된 이전 시간 입력을 다룬다.
- `node scripts/check-refactor-db.cjs /private/tmp/godieor-be04-baseline`: 별도 tmpfs PostgreSQL migration, 가상 7건 반복 ID 보존, 기존 0799404 당시 dist와 21 API 응답·양방향 커서 동일, 105개 제목 이력 이후 실제 이전 날짜, 실패 시 기존 데이터 보존 확인. 생성 컨테이너 제거 완료.
- 기존 pg client concurrent query deprecation 경고가 있었고 검사 실패는 없었다. 경고 해결/성능 측정은 이 작업 범위에 포함하지 않았다.
- ADR-012 / LEARN-0010. 계약·migration·acceptance 승인 상태 변경 없음. 자체 검사는 독립 통합 PASS가 아니다.
- 후속: DATA-02B의 안정 키 기반 검토 후보 publisher 구현·실제 저장/조회 확인.

후속 독립 고정 코드 리뷰: 0799404→6aac1d3, 별도 컨텍스트 Lovelace가 추가 지적 없음을 보고했다. query-policy5개/noEmit 통과, HTTP는 listen EPERM, 실제 DB 실행 없음. 원문 범위 기록은 verifier/reviews/2026-11-09-prisma-queries.md다.

## 고정 입력 인계 (제품 승인 아님)

- app base/head: eca26d8130d063a3787ab6f58c90e419d6eccef1 / eca26d8130d063a3787ab6f58c90e419d6eccef1 (제품 앱 코드 변경 없음).
- backend base/head: 0799404e482861691ffe687d59f1a2e2d26b6435 / 222f67f096349975c99cbe4c16c60b72c4e8bdb5.
- verifier 기준: aab266d751bd1de28904a02de6442800623cc5e8, acceptance draft/미승인.
- 계약: 0.1.0-draft.2 / manifest SHA256 8dfc69a8c6a5f9feb91f2d0cf6d661eec16a1aacb8e980b7abe880cd0b1f3b1e. 계약 작성 pin6258118·policyRevision13은 그대로다.
- prisma/schema.prisma: SHA256 bfacbf63b16425f1b80e0db6d1a70f6dee727757cf754e2c414cbe80ad60b931.
- prisma/migrations/202611090001_initial/migration.sql: SHA256 29ef8ef0d520f44b6a633e8f017144a3e2b2199189461a88ba99bc296c42f5b9.
- prisma/migrations/migration_lock.toml: SHA256 1db17a8d051aa136110736752c5e1f8b7ed92b6ea8e803112fbbe2497047c210.
- migration 집합 digest는 기존 계약 참조의 runtimeFiles 각 파일 해시를 사용한다. 별도 aggregate를 새로 만들거나 재고정하지 않았다.
- 실제 검사: backend-only 작성자 DB/API 회귀 + 고정 코드 별도 리뷰. iOS/세 저장소 승인 통합 검사 미실행.
- 다음 review 입력은 고정 SHA 코드/요구사항/계약이다. 구현 카드·학습 기록·이 웹 전달본을 독립 리뷰의 정답으로 전달하지 않는다.

추가 고정 입력 확인: 계약 문서/manifest·Prisma 스키마·migration 해시는 기존 pin과 동일하다. package-lock.json은 이전6258118 pin(90946e3…)과 다르며, 이번 시작0799404와 현재222f67f는 모두 SHA256 c1ff417af46bd1328e890dadb094130837fbe8dd41b4ac8699ef6da54ca15246다. 이번 작업에서 의존성 lock을 바꾸거나 계약 pin을 재고정하지 않았다. 재현은 검토 대상 backend 전체 SHA의 lock을 사용해야 한다.
