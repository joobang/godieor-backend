# ADR-011 · NestJS 기능 모듈과 계층 책임

상태: 사용자 구조 지적에 따른 수정, 2026-11-09. BE-03 / LEARN-0009.

문제: NestFactory/데코레이터를 사용했지만 module.ts에 여러 Controller/Filter를 정의하고,
Catalog와 Pipeline에 검증·표현·SQL·수집·트랜잭션을 몰아넣었다. 후보 CLI도 프레임워크 밖에서 파일/네트워크를 직접 조정했다.
사용자가 Controller→Service→Repository 책임 분리가 되지 않은 점을 지적했다. 단순 bootstrap이라는 이유로 확장 가능한 서버 구조를 갖췄다고 볼 수 없었다.

선택: catalog/health/auth/users/collection/ott-candidates 기능 모듈.
Controller→Service→Repository 흐름, 외부 IO는 Client/Adapter, 공통 설정/Prisma 인프라는 DI 모듈로 분리한다.
파일만 나누는 facade로 기존 혼합 클래스를 유지하지 않고 각 레이어에서 직접 책임을 옮긴다.
DTO pipe/Presenter/Cursor/Scheduler를 분리해 SQL과 HTTP/표시 정책이 한 클래스에 얽히지 않게 한다.
인증·개인 기능은 아직 미구현이므로 빈 repository를 만들어 완성된 것처럼 보이지 않는다.

대안: 원래 단일 클래스 유지(책임 혼합 지속), 파일 이동/이름만 변경(호출 경계 불명확),
아직 필요하지 않은 별도 마이크로서비스/모든 데이터 모델별 repository 확장(현재 기능에 불필요한 운영/추상화 추가).

확인: 빌드·28개 자체 검사, 별도 tmpfs DB에서 7건 저장/재수집·연기/실패 보존,
기존 빌드와 21개 API 응답/양방향 커서 호환 비교를 실행했다. 별도 코드 리뷰는 고정 6b8f337→3863f02 대상으로 수행했고 추가 지적 없음으로 보고받았다.
계약/Prisma schema/적용 migration은 수정하지 않는다. 실제 제공처/iOS/승인 통합 검증 완료를 의미하지 않는다.
