# ADR-001 · NestJS + PostgreSQL

- 날짜: 2026-11-09 KST
- 상태: **사용자 확정: framework/DB/TypeORM 제외 범위만**.
- 정책 연결: P02. 제품 acceptance 승인과는 별개다.
- 실제 사용자 답변: “2번 pg, nest로 가자. 그리고 typeorm 말고 다른거써보자.”

## 선택

API 서버는 NestJS, DB는 PostgreSQL로 구성한다. TypeORM은 사용하지 않는다.
이전 TypeScript+Workers/D1 제안은 현재 선택에서 대체됐다.
후속 사용자 선택으로 ORM은 Prisma로 확정했다. Node/Nest/Prisma/PostgreSQL의 정확한 버전, 로컬 DB 실행 도구, 무료 우선 호스팅은 아직 결정하지 않았다.

## 이유와 남은 비교

사용자가 PostgreSQL과 NestJS를 선택하고 TypeORM 이외 도구를 경험하고 싶다고 요청했다.
이를 성능 비교로 입증된 선택이나 아직 결정하지 않은 운영 경험으로 서술하지 않는다.
ORM의 후보와 후속 Prisma 선택은 [ADR-002](002-orm-options.md)에 기록한다.

## 영향

- 로컬 API/DB, 임시 검증 DB, migrations와 연결 설정을 NestJS/PostgreSQL 기준으로 설계한다.
- verifier의 DB 적용/조회 검사도 같은 DB 종류를 대상으로 설계한다.
- 기존 D1 무료 한도·Workers 실행 제약을 이 구성의 비용/제약으로 적용하지 않는다.
- 최종 API와 PostgreSQL의 위치는 클라우드로 확정했다. 제공자는 무료 조건을 따로 조사한 뒤 결정한다.
- 개발 첫 단계는 Mac의 NestJS/Prisma/PostgreSQL 실행이며 원격 제공자 선정을 기다리지 않는다. [ADR-003](003-runtime-topology.md) 참조.
- 현재는 문서 반영만 했으며 패키지 설치·DB 생성·migration 실행·배포는 하지 않았다.
