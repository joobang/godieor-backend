# DATA-02B · 검토 후보의 안정 키 매핑과 제품 publish

- 요구사항 PROD-005/006/007/008/009, 사용자 지시: 쿼리 정리 후 다음 작업 진행.
- 담당 codex-publish-02b, 구현·작성자 실행 완료, 담당 해제. 기준 backend 0799404/dev.
- 범위: 현재 검토 revision과 명시적 안정 작품/이벤트 키 매핑→provider adapter→기존 수집 저장 흐름,
  자동 publish/새 로그인/배포/유료 서비스/계약 스키마 변경 없음.
- 실패: 오래된 내보내기 재사용, 같은 제목 자동 병합, 날짜·시즌 변화로 ID 변경, 시장/플랫폼 오인,
  DST 모호한 시각 추정, 검토 무효화와 publish 경합, 일부 입력 오류의 부분 공개.
- 완료: Nest Service/Repository/Adapter 경계 유지, 일회용 DB 저장·조회·반복·정정·거부 검사,
  실제 근거 4건의 명시적 로컬 반영은 실행 후 사실대로 기록. 자동 전수 확보/독립 통합 PASS 주장 금지.
- ADR/LEARN: ADR-013 / LEARN-0011. 승인 기준 변경은 제안만.

## 실제 변경과 검사

- BE-04 6aac1d3 이후 ReviewedOttModule/Service/MappingRepository/Adapter와 명시적 CLI를 추가. 스테이징 보조 에이전트는 /private/tmp에서만 작성했고 통합은 한 세션이 수행했다. 기존 CollectionService/Repository는 변경하지 않았다.
- `npm test` (Node24 PATH) build + 47개 통과. 구조/HTTP·후보·쿼리 33개 + publisher14개.
- `node scripts/check-refactor-db.cjs /private/tmp/godieor-be04-baseline`: 이전 21 API/커서/이력 회귀 + 임시 DB provider 저장·반복·날짜 정정·미정→확정 시즌 보완·국가/플랫폼/작품/알려진 시즌 변경 거부·stale mapping·뒤쪽 잘못된 입력 보존 통과. 컨테이너 제거 완료.
- 공식 4개 페이지 날짜 재확인 및 CJ HTML canonical 확인. `npm run publish:reviewed -- --file data/curated/ott-reviewed-mappings.json` 두 번 성공, 각 4건. 로컬 provider4+fixture7, provider 변경 이력 최초4 유지.
- 별도 임시 포트의 실제 Nest HTTP에서 상세4/Disney+ 11월 달력/health mixed 확인 후 인스턴스 종료. 기존3000 프로세스는 재시작하지 않았다.
- pg client concurrent-query deprecation 경고는 재현됐으나 검사 실패 없음. 시간대 null인 현재4건은 전부 date_only, 시간/미표기 시즌을 추정하지 않았다.
- 제품 스키마/API 계약/migration/acceptance 승인 상태 변경 없음. 독립 통합 PASS가 아니다. 현재 검토는 작성자 근거 확인이며 사용자 승인으로 바꾸지 않았다.
- 다음: iOS 공개 API client·월 달력/상세 연결과 verifier 통합 evidence v2/고정 SHA 검토. 자동 OTT 범위 확장은 공지 단일 작품 제한과 소스 이용 조건을 먼저 해결한다.

후속 독립 고정 코드 리뷰: 6aac1d3→222f67f096349975c99cbe4c16c60b72c4e8bdb5, Volta가 추가 지적 없음을 보고했다. 임시 사본 TypeScript build/39 scoped 검사 통과, 실제 PostgreSQL·잠금/롤백 검사는 미실행. 작성자 DB 실행과 구분한다. verifier/reviews/2026-11-09-reviewed-publish.md 참조.

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
