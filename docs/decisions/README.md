# Backend 기술 결정

[ADR-001](001-nestjs-postgresql.md): NestJS + PostgreSQL, TypeORM 제외는 사용자 확정이다.
[ADR-002](002-orm-options.md): ORM 후보 비교 이후 사용자가 Prisma를 선택했다. Drizzle 추천은 이전 제안 기록이다.
[ADR-003](003-runtime-topology.md): 로컬 실행부터 시작하고 최종 API/DB는 클라우드, 앱은 iPhone, verifier는 Mac으로 확정했다.
정확한 버전·클라우드 제공자는 [정책 P02](../system/policies.md)에 추가 결정이 필요하다.

[ADR-005](005-content-range-refresh.md): OTT 4곳·게임 정식 출시·2026년 이후·하루 1회 수집을 기록했다.

ADR에는 상태(proposed/accepted/superseded), 날짜, 실제 사용자 선택 근거, 문제/제약,
대안 비교, 선택 이유·포기한 이점, 검사/공식 출처, 재검토 조건을 기록한다.
사용자 선택 전에는 accepted나 승인자를 만들지 않는다.

초기 환경 제안의 원본은 app/docs/decisions/001-foundation.md이며 조사일은 2026-11-06이다.
선정·가입·배포 시 공식 조건을 재확인한다. 이 저장소의 상세 선택은 이후 backend ADR이 소유한다.

- [ADR-006: 통일한 찜 동작과 작품/일정 식별자 분리](006-unified-saved-items.md)

- [ADR-007: OTT 최초 공개일만 제공](007-ott-premieres-only.md)

- [ADR-008: API·DB 계약 초안](008-api-database-contract.md)

- [ADR-009: 로컬 런타임·파이프라인](009-local-runtime-pipeline.md)

- [ADR-010 · OTT 후보 staging과 정확한 날짜 검토](010-ott-candidate-staging.md)
