# Prisma 쿼리 작성 규칙

사용자 지시(2026-11-09): Prisma Client를 기본으로 쓰고, 필요한 SQL만 근거를 남긴다. Controller → Service → Repository 경계를 지킨다.

## 기본

- CRUD·관계 조회·필터·정렬·집계·트랜잭션은 생성된 Prisma Client(`findMany`, `where`, `some`, `include`, `orderBy`, `$transaction`)로 작성한다. TypeORM QueryBuilder API를 따로 흉내 내지 않는다.
- 영속 IO는 Repository, 연결/잠금은 PrismaService 인프라에 둔다. 서비스/컨트롤러에서 직접 실행하지 않는다.
- SQL 도입 전에 Client 표현 가능 여부를 확인한다. 예외는 아래 목록에 위치·이유·입력 바인딩·출력 검사·회귀 범위를 추가한다. 성능을 이유로 들 때는 측정 근거가 필요하다.
- 고정 형태 SQL에는 TypedSQL을 우선 검토한다. 현재 동적 필터/정렬 조합은 `Prisma.sql`/`Prisma.join` 바인딩을 사용한다. SQL 문자열에 사용자 값을 이어 붙이지 않고 `*RawUnsafe`를 사용하지 않는다.
- `$queryRaw<T>`의 T는 수동 주장이다. 스키마에서 SQL 결과 타입이 자동 검증됐다고 설명하지 않는다. 현재 두 조회는 `<unknown>`으로 받아 Zod로 행·정렬 키·집계 bigint를 검사한다.
- 쿼리를 바꾸면 필터·페이지 경계·날짜만/instant 혼합·시간대·집계·변경 이력의 기존 의미를 보존한다. 계약/스키마 변경은 별도로 기록한다.

## 현재 SQL 예외 목록

| ID | 위치 | 이유 및 안전장치 | 검사 |
|---|---|---|---|
| SQL-CATALOG-01 | `src/catalog/queries/catalog.sql.ts` datedEventsSql | 날짜만은 지역 날짜 보존, instant는 요청 시간대 날짜로 계산하여 혼합 정렬·keyset 페이지. 현재 Client orderBy로 계산식 표현 불가. 바인딩 입력 + decodeEventKeys | 일회용 PostgreSQL, 기존 빌드 API/양방향 커서 비교 |
| SQL-CATALOG-02 | 같은 파일 calendarSql | 같은 계산 날짜별 전체 건수와 상위 2행을 window function으로 함께 조회. decodeCalendarKeys로 반환 검사 | 월간 API/일별 총계·미리보기 회귀 |
| SQL-LOCK-01 | `src/database/prisma.service.ts` withCollectorLock | PostgreSQL 세션 advisory lock은 Client CRUD 대상이 아니다. 전용 pg 연결·`$1` 바인딩, finally unlock/release, locked boolean 직접 확인 | 반복 수집·실패 보존·publisher 충돌 검사 |

미정 목록은 Client 관계 필터와 ID keyset을 사용한다. 이전 날짜 조회는 JSON-path 필터 후 100행씩 keyset으로 읽고 제목만 바뀐 이력을 건너뛴다. JSON object 키 순서 차이는 시간 변경으로 취급하지 않는다. 연결 확인도 catalog_state Client 조회를 사용한다.
`tests/query-policy.test.cjs`는 raw 실행 위치/unsafe 금지/출력 검사를 보조한다. 이 검사는 OS 격리나 모든 SQL 안전성의 증명이 아니다. 대량 이력 스캔의 비용을 측정하지 않았으며 필요 시 별도 측정 후 최적화한다.

공식 근거(설치 버전 7 기준): [Client 필터·정렬](https://www.prisma.io/docs/orm/v7/prisma-client/queries/filtering-and-sorting), [SQL·TypedSQL](https://www.prisma.io/docs/orm/v7/prisma-client/using-raw-sql), [JSON 필터](https://www.prisma.io/docs/orm/v7/prisma-client/special-fields-and-types/working-with-json-fields). 이 예외 목록과 경계는 프로젝트의 선택이다.
