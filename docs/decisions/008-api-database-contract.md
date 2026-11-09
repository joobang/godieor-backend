# ADR-008 · API·DB 계약 초안과 일관된 캘린더 조회

- 날짜: 2026-11-09 KST. 상태: 기술 제안, 미구현/미승인.
- 작업: SYS-02 / PROD-001~010. [계약 원본](../../contracts/README.md).
- 학습: LEARN-0005. 실제 성능/운영 장애 사례가 아닌 예방 설계다.

## 문제와 선택

월 달력의 건수/미리보기와 날짜 목록을 별도로 조회하면 수집 도중 서로 다른 버전이 섞일 수 있다.
전체 과거 snapshot 보관보다 전역 catalogRevision을 비교하고 변경 시 재조회하는 단순한 초안을 선택했다.
개인 일정은 favoritesVersion도 고정한다. 읽기 snapshot과 변경/버전 증가 트랜잭션은 구현 시 필요하다.

작품/시즌/이벤트를 분리해 시즌별 첫 공개, 기기/지역별 출시, 작품 없는 EPL 경기를 표현한다.
찜은 명시적 ContentFavorite/EventFavorite FK로 무결성을 보장하고 조회에서는 합집합으로 모은다.
시간은 instant/local date/unknown을 분리한다. 단일 UTC timestamp는 날짜만 있는 자료를 왜곡한다.

공개 API는 개인 설정을 암묵적으로 읽지 않는다. iOS가 활성 분야/임시 필터를 계산해 보낸다.
Google ID token 검증 후 서비스 opaque session을 발급하는 제안이며 장기 Google token을 API 세션으로 재사용하지 않는다.
설정 전체 교체는 expectedVersion으로 분실 갱신을 방지한다. 세션 30일은 구현 전 기술 설정 제안이다.

## 남은 위험과 검토

전역 revision이 자주 바뀌면 페이지 재조회가 많아질 수 있다. 관찰 근거가 생기면 snapshot/cursor 보존 방식을 재검토한다.
DDL의 단일 행 CHECK/복합 FK와 도메인 트랜잭션 검증을 구분한다. 최소 서비스/기기 연결 수는 현재 DDL만으로 강제하지 않는다.
Prisma 버전 고정 후 schema/migration 매핑과 실제 DB 검사가 필요하다. 초안 DDL을 적용하거나 테스트를 실행하지 않았다.
독립 리뷰/승인 acceptance/evidence v2 run은 후속 단계다. 문서 작성자를 독립 승인자로 기록하지 않는다.
