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
