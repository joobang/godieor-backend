# DATA-76 · IGDB 공개 ID 보존형 검토 큐 (2026-11-17)

- 요구: PROD-005/006/007/009, GD-005/006/007/009. 기준 backend `dev` c7045e1, app `dev` 72b42e8, verifier `dev` ca6f492. 작업 브랜치 `codex/data-76-igdb-review-queue`.
- 사용자에 미치는 영향: 직접적인 공개 데이터 변경은 없음. DATA74 읽기 전용 감사 결과를 사람이 검토할 우선순위 큐로 변환한다.
- 예상 실패: 새 IGDB release ID를 옛 ID의 대체로 확정, WORLD 원천 숫자 지역 추정, 서로 다른 지역/날짜 공용 이벤트 병합, 찜이 가리키는 ID 소실, 부분일자를 캘린더에 배치.
- 입력 `docs/tasks/evidence/data74/igdb-source-gap-audit.json`은 과거 선택 49건의 **당시 관측**이다. 새 실시간 IGDB 조회 결과가 아니며 과거 NULL region은 그대로다.
- `scripts/triage-igdb-source-gaps.mjs`는 감사가 명시적으로 비게시·DB변경0·관계 조회완료인지 확인한 뒤 검토 큐를 만든다. 원본 event ID·후보 ID·다른 공개 event ID를 분리 보존한다. 모든 항목은 `hold_for_manual_review`이며 alias·병합·게시 해제 승인 권한을 갖지 않는다.
- 해당 감사에선 총49건 중 **다른 공개 event ID와 충돌 가능38**, **근거 부족11**. 이는 중복 확정38 또는 자동 삭제/통합 대상38을 뜻하지 않는다.
- 제품의 `event.status`는 `scheduled/postponed/cancelled`이고 별도 내부 게시 검토 상태가 없다. `cancelled`로 증거 미확정을 표현하면 실제 취소 오표시가 된다. 후속 DB/외부 API 노출정책을 설계할 때 source검증·내부 검토·일정 상태를 분리해야 한다.
- 안전한 후속 정책 제안: (1) 원본 release ID와 최초 숫자 region/플랫폼/날짜/공식 관계 대조, (2) 다른 공개 이벤트 ID 및 사용자 찜 참조량 읽기 전용 확인, (3) event 변경 없이 검토 상태와 표시 처리 시나리오 작성, (4) 승인된 alias가 필요하면 별도 이력·공용 ID 안정성·조회/찜 회귀와 DB 마이그레이션 검증 후 채택. 과거 지역 NULL은 추론 보충하지 않는다.
- 이번 작업: API 계약·Prisma schema·실제 DB·앱·verifier acceptance/verdict·외부 배포 변경 없음. 독립 runner/리뷰, 원본 49건 사람별 최종 판정, alias 확정은 아직 미실행.
- ADR024/LEARN0006과 연결. 후속 새 정책이 실제로 결정되면 해당 원본과 검증기 요청을 갱신한다.

## 자체 검사

- `node --test tests/igdb-source-triage.test.mjs tests/igdb-source-gap-audit.test.mjs`: 11/11 통과.
- 당시 감사 읽기 전용 변환: 49건, 중복 의심38/근거 부족11, DB변경0. 저장 보고서에는 감사 시점 및 입력 manifest digest를 보존한다.
- 전체 `node --test tests/*.test.cjs tests/*.test.mjs`: 221개 중 201성공·20실패. 현재 checkout에 `node_modules/`와 `dist/`가 없어 `MODULE_NOT_FOUND`·`ERR_MODULE_NOT_FOUND`로 실패. 이는 실제 전체 회귀 PASS가 아니며 의존성 설치/빌드 후 재검증이 필요하다.
- 보고서: `docs/tasks/evidence/data74/igdb-review-queue.json` (49행, 수동 보류, DB변경0). 신규 별도 공식 실시간 API 또는 DB 조회는 수행하지 않았다.
