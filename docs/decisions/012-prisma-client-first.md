# ADR-012 · Prisma Client 우선과 SQL 예외 관리

2026-11-09, 사용자 지시를 반영한 구현 결정. LEARN-0010 연결.

기존 단순 조회까지 raw SQL을 사용하는 방식은 생성 타입·관계 필터의 장점을 활용하지 못했다. 미정 목록, 이전 시간 이력, 연결 확인을 Client로 전환한다. 계산된 시간대 정렬과 window 집계는 바인딩 SQL로 유지하고 별도 query 파일 및 런타임 반환 검사를 둔다. 쿼리빌더를 추가 도입하지 않는다.

상세 규칙/예외는 [query-policy](../query-policy.md), 실행 근거는 [BE-04](../tasks/BE-04-prisma-query-policy.md)에 둔다. API 계약/Prisma 스키마/migration을 바꾸지 않았다. Client 이력 스캔은 100행씩 반복하므로 비용은 이력 수에 의존하며 성능 개선을 측정했다고 주장하지 않는다.
