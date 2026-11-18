# DATA-87 · Actions 백필 대상 선택

- 요구 PROD-009/GD-009, PROD-010/GD-010. 운영 수집 대상 선택과 실패 전파.
- backend base d234823, app ba492d3, verifier b9bf100. 담당 codex/backfill-target, 별도 worktree.
- 범위: 전체, KOBIS, EPL, IGDB 전체/시장별, OTT. 예약·일일 기존 동작 유지. 공유 DB 동시 실행 제한 유지.
- 예상 실패: 잘못된 입력이 전체를 실행, 선택하지 않은 OTT 복구/게시, 실패를 성공 처리, IGDB 시장 선택이 provider lock을 우회. 합성 검사로 계획·시장·워크플로 연결을 검증.
- 학습 LEARN-0022 재검토. 선택 실행은 운영 오류 진단과 별개이며 WORLD의 게시 제한 및 원자성은 기존과 동일.

## 결과 및 인계

- Actions의 단일 계획 단계가 provider 목록과 OTT 실행 여부를 결정한다. `backfill_target=all`은 기존 전체 실행이며 예약 및 수동 daily는 전체 일일 수집이다. 잘못된 조합은 초기 실패다.
- 별도 리뷰에서 CLI 초기화가 다른 제공처도 등록하는 문제를 발견했다. Nest의 동적 CLI 모듈이 초기 등록 전에 선택을 적용하고, IGDB 시장은 원래 제공처 잠금을 공유하도록 조치했다.
- Node24 `npm ci --offline`, 합성 URL로 `npm test` 360/360, YAML 파싱·bash 문법 및 실제 백필 셸 합성 실행 성공. WORLD만 인자로 전달, 전체 실행 중 EPL 실패 뒤 IGDB 계속 실행 및 최종 exit 1 확인. OTT 단독 계획에는 일반 제공처 없음.
- 고정 digest 일회용 PostgreSQL에 실제 마이그레이션 적용 후 제공처 네 키 그룹이 설정된 실제 Nest CLI를 합성 응답으로 실행했다. provider/collection_scope/collection_run 조회에서 각각 igdb, igdb:WORLD, 1개 실행 확인. 운영 DB에는 백필을 요청하지 않았다.
- 계약, migration, verifier 기준 변경 없음. CI-01과 DATA-86의 digest를 유지. 이번 범위는 backend 자체 검증이며 독립 판정을 대체하지 않는다. 학습 LEARN-0022 검토. 담당 해제.
- 사용자 승인 후 원격 적용. 수집 실패 재시도는 main → backfill → igdb-world. 이전 WORLD P2028의 병목 해결은 별도 작업. B안은 먼저 같은 push에서 원격 Backend CI 결과를 확인하고 그다음 필수 PR 체크 설정을 진행한다.
