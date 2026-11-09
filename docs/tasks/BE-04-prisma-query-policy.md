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
