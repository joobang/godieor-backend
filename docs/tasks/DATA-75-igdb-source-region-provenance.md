# DATA-75 · IGDB 원본 지역값 보존 (2026-11-17)

- 요구: PROD-005/006/007/009, GD-005/006/007/009. 기반 backend `2c278ee`, app `7a51fd2`, verifier `8b5c479` (`codex/provider-daily-and-source-audit`).
- 범위: 신규 IGDB 원천의 정수 `release_region`을 `event_source.source_release_region`에 보존, 선택 49건 읽기 전용 원천 감사에서 기존에 저장한 숫자 지역으로 후보 좁히기. 공개 이벤트 ID/기존 찜/일정 날짜·게시 승인 상태 불변.
- 예상 실패: WORLD=1/2/7/8을 하나의 원본 지역으로 오해, 기존 NULL을 역추정, 재수집으로 이력만 증식, 지역만 같다고 다른 release ID를 자동 결합, 기존 event ID/찜을 삭제·병합.
- 방법: nullable DB migration+CHECK(1~10); IGDB 어댑터에서 정수 원문 지정; provider가 IGDB가 아니면 거부, 이미 확보한 source 지역이 다른 새 원문이면 거부. 이벤트 변경 이력 JSON과 원본 지역 메타데이터를 분리. 감사 후보는 저장 지역값이 있을 때 동일 region만 제시하며 자동 재매핑은 항상 금지.
- 기존 49개 원본은 숫자 지역값을 과거에 기록하지 않았으므로 NULL 유지. 이 변경으로 과거 데이터의 지역·날짜·중복 식별이 확정되지는 않는다. 선택 감사 및 정식 API/DB 게시를 새로 수행하지 않았다.
- 검증: Node24 `npm run build` 성공. `node --test tests/provider-sources.test.cjs tests/igdb-source-gap-audit.test.mjs` 13/13, 전체 `node --test tests/*.test.cjs tests/*.test.mjs` **332/332** 통과(HTTP 로컬 포트 접근 허용). `node scripts/check-refactor-db.cjs` 고정 digest 일회용 PostgreSQL migration, 가상 7건 저장·반복 및 계정·찜·이력 회귀 통과, 컨테이너 종료. 임시 DB fixture 포함 설정을 테스트 스크립트에 명시함. 초기 제한 sandbox 내 HTTP EPERM 및 임시 DB fixture 미포함으로 실패한 결과는 각각 권한 허용 재검사와 명시적 fixture 설정 후 해소.
- 계약 초안 0.1.0-draft.5의 DB 참조 SQL/manifest SHA256를 함께 갱신. OpenAPI의 외부 응답 구조는 불변이며 manifest는 초안·미승인이다. 독립 verifier 승인·통합 PASS를 주장하지 않는다.
- ADR024 / LEARN0006 연결. 후속: 과거 49건에 대한 공식 ID 증거와 현재 중복 공개 이벤트를 별도 검토, 안정적인 공개 ID·찜 보존을 전제로 검토/게시/alias 규칙을 설계·검증. 데이터 단계는 아직 진행 중이다.
