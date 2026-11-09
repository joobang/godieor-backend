# ADR-013 · 검토 후보와 안정 작품·공개 사건 키

2026-11-09, 제품 연결을 위한 구현 선택. LEARN-0011.

공지 URL/제목/날짜는 작품이나 시즌의 안정 식별자가 아니다. 후보는 출처 근거와 변경 revision을 맡고, 별도 명시적 매핑이 작품 키·이벤트 키를 부여한다. 현재 검토본을 검증한 뒤 기존 CollectionService/Repository에 provider 원천으로 전달한다. 제목 자동 병합/알려진 시즌을 다른 시즌으로 덮어쓰기는 하지 않는다.

후보 writer lock과 기존 provider advisory lock을 유지하고 Client로 기존 identity를 비교한다. 추가 DB/migration 없이 기존 content_source/event_source를 사용한다. 단일 scope 원자성은 재사용하지만 여러 시장 전체의 DB 장애 원자성은 보장하지 않는다. 현재 한 공지/한 작품 검토, 수동 매핑/수동 실행이며 자동 전수 수집은 아니다.

[실행/한계](../reviewed-publish.md), [작업 기록](../tasks/DATA-02B-reviewed-publish.md). API 계약/DB 스키마/승인 acceptance 변경은 없다.
