# ADR-002 · TypeORM 대안 비교

- 날짜: 2026-11-09 KST
- 상태: **Prisma 사용자 선택 확정**. 아래 후보 비교는 이전 제안 이력이다.
- 사용자 답변(2026-11-09): “프리즈마로 간다.”
- 확정 전제: NestJS + PostgreSQL, TypeORM 제외.
- 용도: 일정 정규화·필터 조회·중복 방지·변경 처리와 SQL/DB 학습·독립 검증.

## 후보

| 후보 | 공식 문서상 특징 | GODIEOR 관점의 판단 |
|---|---|---|
| Drizzle | TypeScript 테이블 스키마, SQL과 가까운 질의와 관계 조회, SQL migration 생성/적용 | SQL·인덱스·제약조건을 설명하고 migration diff를 독립 검토하기 좋은 후보 |
| Prisma | 타입이 있는 데이터 접근 API와 모델/계약·migration 도구. Nest 연동 가이드 제공 | 모델 중심의 개발 흐름을 원할 때 비교할 후보. 버전별 API/문법을 구분해야 함 |
| MikroORM | Entity Manager, Identity Map, Unit of Work 기반 엔티티 상태 관리 | 엔티티 수명주기·변경 추적·객체 관계 모델을 학습하고 싶을 때 비교할 후보 |

이전 구현 담당의 추천은 **Drizzle**이었다. 일정 API의 조합 필터·upsert·unique 제약·트랜잭션을
SQL과 연결해 학습하고, 생성한 migration SQL을 리뷰·일회용 DB 실행 검사에 연결하기 좋다는 설계 판단이다.
이는 공식 문서의 기능을 근거로 한 적합성 판단이며 성능 실험이나 시장 점유율 결과가 아니다.
SQL 설계·인덱스·트랜잭션 경계를 직접 이해하고 관리해야 한다는 학습 비용도 있다.

## 최종 선택

사용자는 후보 비교 후 Prisma를 선택했다. 최종 구성은 NestJS + PostgreSQL + Prisma다.
선택을 성능 실험으로 입증된 결론이나 특정 클라우드 가입 결정으로 서술하지 않는다.
Prisma ORM은 로컬/자가 운영 PostgreSQL에도 연결할 수 있다. Prisma 클라우드 DB는 필수 구성요소가 아니다.
공식 근거: https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/postgresql
정확한 Prisma 버전·driver·실행 환경은 다음 설정 작업에서 검증해 고정한다.

## 최신 문서와 버전 선택 주의점

2026-11-09 조회한 Nest Drizzle 가이드는 v1 rc 예제를 포함한다.
Prisma 현재 문서는 ORM 8 release candidate와 별도 v7 문서를 안내하며 API/계약 형식 차이가 있다.
따라서 ORM을 정한 뒤 실제 stable release·호환 driver·migration 도구 버전을 확인해 고정한다.
이 비교 단계에서 rc/latest 패키지를 임의로 설치하지 않는다.

npm 다운로드 API는 이번 조회에서 접근하지 못해 사용량 수치나 순위를 기록하지 않았다.
세 도구의 공식 문서는 기능 비교 근거이며, NestJS 생태계 점유율의 근거는 아니다.

## 선택 후 할 일

1. 사용자 ORM 선택을 P02와 이 ADR에 기록하고 공통 문서를 동기화한다.
2. 지원 버전·driver·Nest DI 연동을 확인한다.
3. 최소 테이블의 migration SQL을 검토하고 임시 PostgreSQL에 적용·저장·재조회한다.
4. 독립 검증에서 migration digest·DB 적용 상태·중복/트랜잭션 실패 사례를 확인한다.

## 공식 근거

- [NestJS Drizzle](https://docs.nestjs.com/data/drizzle)
- [Drizzle 개요](https://orm.drizzle.team/docs/overview)
- [Drizzle migrations](https://orm.drizzle.team/docs/migrations)
- [NestJS Prisma](https://docs.nestjs.com/recipes/prisma)
- [Prisma 현재 ORM 문서/릴리스 상태](https://www.prisma.io/docs/orm)
- [MikroORM Unit of Work](https://mikro-orm.io/docs/unit-of-work)
