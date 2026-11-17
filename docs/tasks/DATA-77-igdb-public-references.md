# DATA-77 · IGDB 공개 이벤트 참조 읽기 전용 확인 (2026-11-17)

- 요구 ID: PROD-005/006/007/009, GD-005/006/007/009. 기준 app `34239dc` (`dev`), backend `6485b0e` (`codex/data-76-igdb-review-queue`), verifier `6a93a14` (`dev`). 변경 범위는 backend 감사 스크립트·단위 테스트·작업/공통 인계 문서다.
- 실패 위험: 검토 큐의 신규 release ID를 기존 ID의 정당한 대체로 오인, 두 공개 이벤트와 그 찜을 합쳐 집계, 중간에 바뀐 DB 상태를 섞어 판정, 미확인 원천 지역을 추정, `event.status=cancelled`로 검토 상태를 위장하는 일.
- `scripts/audit-igdb-public-references.mjs`는 DATA-76 검토 큐를 검증하고 PostgreSQL `REPEATABLE READ READ ONLY` 트랜잭션에서 `event`·`event_source`·`event_favorite`를 SELECT로 조회한다. 각 원래 공개 event ID와 source binding, 다른 후보 공개 ID, 개별 찜 수, 날짜/마켓/지역 차이를 표시한다. 동일 공개 ID를 여러 행이 가리킬 때 상단 찜 요약은 중복 합산하지 않는다.
- 모든 행 결과는 `manual_review_required`, `aliasApproved=false`, `mergeApproved=false`, `unpublishApproved=false`다. DB 쓰기·공개 상태 변경·별칭 승인은 수행하지 않는다. 결과 JSON에는 원본 큐 SHA256을 보관하고 기존 파일 덮어쓰기를 거절한다.
- 실행 예시: `node --env-file=.env scripts/audit-igdb-public-references.mjs docs/tasks/evidence/data74/igdb-review-queue.json /tmp/igdb-public-reference-audit.json`. `DATABASE_URL`, `pg`, 실제 DB 연결 및 DATA-75 migration 적용이 필요하다. **이번 작업에는 실제 DB 조회 결과 파일이 없으며 49개 참조/찜의 현상 검증은 미완료다.** 기존 DATA-76의 49건(중복 가능38·근거 부족11)은 이전 관측 그대로다.

## 게시 검토 및 alias 정책 초안 — 아직 채택·적용 안 됨

1. `event.status`의 scheduled/postponed/cancelled는 실제 출시 상태에만 사용한다. 원천 확인 정도(`verified`, `unverified`, `conflicted`)와 내부 게시 검토(`hold`, `reviewed`, `approved`)는 별도 데이터 영역/이력으로 설계한다. 상태 명칭·DB schema는 계약 및 검증 기준 검토 뒤 확정한다.
2. 기존 공개 `event.id`·찜 참조는 불변으로 취급한다. 보류 시 API 달력 노출 여부·기존 상세 URL·찜 목록의 동작을 별도로 명세하고, 조용한 삭제/404 전환을 피한다. 별도 비공개 상태를 추가할 경우 공개 API와 클라이언트의 명시적인 표시 계약이 필요하다.
3. 서로 다른 원천 release의 동일성이 공식 게임 ID·플랫폼·숫자 region·정확한 날짜 및 원천 관계로 입증되고 수동 검토된 뒤에만 alias를 제안할 수 있다. 과거 NULL region은 동일 지역의 증거로 쓰지 않는다. 제안된 alias는 source binding 및 이전 ID로 상세/찜 접근을 유지할 수 있는지 마이그레이션·API·롤백 검증 후에만 승인한다.
4. 후보 ID 충돌/원천 부족 49건은 계속 보류한다. 지역/날짜/분류 재확인 → 실제 DB 참조 감사 → 변경안 + 참조 영향 보고서 → 별도 독립 검증 → 사용자 승인 순서로 처리한다. 자체 검사만으로 실제 게시 교정이나 통합 PASS를 선언하지 않는다.

## 자체 확인 및 인계

- `node --test tests/igdb-public-references.test.mjs tests/igdb-source-triage.test.mjs tests/igdb-source-gap-audit.test.mjs`: 16/16 통과(합성 참조·찜 중복·누락 binding·잘못된 큐·읽기 전용 롤백 포함).
- `node --check scripts/audit-igdb-public-references.mjs`, `git diff --check` 검사. 실제 DB·신규 IGDB API·통합 runner·폰/클라우드 미실행. `node_modules`/`dist` 부재로 전체 서버 회귀 및 라이브 DB 감사를 검증 완료로 보지 않는다.
- API 계약·Prisma schema·migration·게시 이벤트·event ID·찜·verifier acceptance/verdict 불변. ADR024/LEARN0006 연결; 신규 설계가 승인되면 관련 ADR/학습 기록 수정 필요.
- 공통 사본 revision `SYNC-2026-11-17-DATA-77`. 다음 작업은 DB 접속 가능한 환경에서 위 감사의 실측 결과와 실제 사용자 찜 영향 범위를 확인하고, 게시 정책/alias 계약의 구체적인 검증 설계를 만드는 것이다.
