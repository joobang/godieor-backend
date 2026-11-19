# DATA-88 · IGDB WORLD 원격 게시 트랜잭션 분할 (2026-11-19)

- 요구사항: GD-005/006/007/009의 원천 ID·이력 보존 및 일일 수집 복구. 변경 범위는 backend의 scope 게시 트랜잭션과 관련 회귀 테스트다.
- 관측: GitHub Actions run `44275128560`, job `134701203124`에서 IGDB WORLD 4,845건 fetch 47,599ms 후 publish 902,072ms, `DB_TRANSACTION_FAILED`/`P2028`로 실패했다. 당시 `COLLECTION_PUBLISH_TIMEOUT_MS=900000`으로 설정되어 있었다.
- 원인: 기존 구현은 시장 전체를 단일 Prisma interactive transaction으로 직렬 게시한다. Supabase 원격 DB의 왕복 요청이 누적되어 900초 한도를 넘었다.
- 수정: 최대 100건씩 독립 트랜잭션에 저장하고 마지막 배치의 트랜잭션에서만 scope/run 성공 상태를 기록한다. 각 배치마다 catalog revision을 올린다. 중간 실패 시 완료 상태를 기록하지 않고 기존 `failRun`이 오류를 기록한다. 이후 강제 재실행은 동일 `event_source` 키와 `event` ID를 갱신하고 실질 내용 변경 시에만 `event_change`를 추가한다.
- 트레이드오프: 이전 전체 시장 원자성은 배치 단위 원자성으로 변경된다. 중간 실패 전 배치는 게시된 상태로 남으며 다음 재시도에서 마저 반영한다. 실패 시 중간 데이터가 외부 조회에 노출될 수 있다. 대규모 시장 단일 트랜잭션에서 생기는 시간 초과를 방지하는 데 우선순위를 뒀다.
- 예상 실패 사례: 중간 배치 오류, 마지막 배치 오류, 0건, 100건 경계, 재시도 중복과 원천 ID 이탈. 독립 제품 검증 승인 및 API/스키마 변경은 포함하지 않는다.
- 실행: Node 24.22.3 `npm run build` 성공, `node --test tests/collection-diagnostics.test.cjs` 4/4 성공. 전체 `node --test tests/*.test.cjs tests/*.test.mjs`는 로컬 포트 바인딩 허용 환경에서 361/361 성공. 기본 샌드박스에서는 HTTP 테스트 1건이 `listen EPERM 127.0.0.1`로 실패하여 재실행했다.
