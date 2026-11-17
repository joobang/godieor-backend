# DATA-82 · 2026년 10월 이전 실 DB 참조 감사 (2026-11-17)

- 요구사항: PROD-005/006/007/009, GD-005/006/007/009. 사용자 확정 전 플랫폼·콘텐츠 2026-10-01 하한.
- 범위: 로컬 DB 카테고리별 과거 데이터·찜·변경 이력·원천 매핑 집계 및 반복 가능한 읽기 전용 감사 CLI. 삭제·운영 배포·API 계약·migration 변경 없음.
- 실패 사례: 과거 ID에 달린 찜/원천/이력을 삭제하거나, EPL의 instant 일정을 `local_date`만 검사해 과거 430건을 누락하거나, DB 용량 절감을 실제 삭제 없이 주장하는 경우.

## 실 DB 결과

`node --env-file=.env scripts/audit-product-cutoff.mjs`에서 읽기 전용 반복 읽기 트랜잭션으로 실측. 전체 이벤트 32,693건, 기준 이전 25,808건: 게임 23,714 / 영화 1,661 / OTT 3 / EPL 430. EPL은 `instant_at`에 기록되어 기존 `local_date` 단독 집계에 나타나지 않았다. 미정 영화 2건은 별도로 보존. 전체 DB 크기 72,956,951 bytes(약 70MiB). 현재 용량 여유는 있으나 Supabase 500MB 정책은 배포 환경에서 별도 검증 필요.

모든 과거 이벤트 25,808건에 `event_change` 및 `event_source` 참조가 있음. 과거 이벤트에 직접 붙은 `event_favorite` 0건, 관련 콘텐츠의 `content_favorite` 0건. 게임 과거 `event_device` 23,714건·OTT 과거 `event_service` 3건. 이 결과는 **참조 삭제가 안전하다는 뜻이 아님**: 원천 식별자/기록 및 다른 기간을 공유하는 작품의 공개 ID를 보존해야 한다.

## 검사·다음 단계

- `node --check scripts/audit-product-cutoff.mjs`: 성공.
- `node --env-file=.env scripts/audit-product-cutoff.mjs`: 성공, `databaseMutations=0`.
- 회귀: `node --test tests/product-cutoff-audit.test.mjs`로 read-only/rollback 확인.
- `npm test`: 전체 342/342 통과(빌드 및 검증, 종료 코드 0).
- 정리 계획: 먼저 소비 API의 과거 일정 제외·경계 테스트, 과거 이벤트의 ID·source·revision 의존성 감사, 삭제 후보 백업·복원 검증, 재적재/재등장 방지 정책이 필요. 이후 별도 승인된 정리 범위로 배치 크기와 DB 실효 용량을 측정한다. 이번에는 삭제 SQL을 실행하지 않음.
- 기존 세 저장소의 `LEARN-REPAIR-01` 관련 dirty 문서 변경은 동시 작업으로 간주해 보존. 공통 문서 동기화는 충돌 없이 반영 가능한 시점에 수행.
- 독립 verifier runner, 실제 클라우드 DB/API, 실 iPhone 검증 미실행. 데이터 적재 100% 미달.
- 코드/계약 바인딩: backend base 13aaeda, app 6f537e4, verifier 30ecca7. 계약·migration digest 변경 없음. LEARN-0006 관련; 신규 학습 문서 없이 이 카드에 감사 근거 보존.
