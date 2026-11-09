# NestJS 백엔드 구조 · BE-03

코드 기준: 3863f027596f787d1c5939c7af74eca7fa0eb480. API/DB 계약 의미는 유지한 구조 변경이다.

```text
src/
  main.ts                       HTTP bootstrap
  app.module.ts                 기능 모듈 조립
  common/
    config/                     검증된 설정 DI, 공통 선택값
    filters/                    API 오류 응답
  database/                     Prisma lifecycle/연결·수집 lock 인프라
  catalog/                      공개 일정 조회
    catalog.controller.ts       라우팅·DTO pipe → service
    catalog.service.ts          조회 유스케이스·표시/버전 오류 처리
    catalog.repository.ts       SQL·Prisma·읽기 snapshot
    dto/                        쿼리·ID 검증 pipe
    presenters/                 날짜/시각·일정·최신성 응답 표현
    cursor.service.ts           필터 결합·서명/만료 검증
  health/                       controller → service → repository
  auth/                         controller → service (인증 미구현 차단)
  users/                        controller → service (개인 API 차단)
  collection/                   수집 service → repository
    collection.scheduler.ts     스케줄 → service
    adapters/                   fixture 원천 IO
    domain/                     Canonical 검증/정규화
  ott-candidates/               후보 수집 service → repository/client
    domain/                     날짜·후보·검토 규칙, RSS 해석
  cli/                          Nest context bootstrap·종료/exit code
```

## 책임과 의존 방향

HTTP Controller는 서비스만 호출하며 검증은 DTO pipe에서 수행한다. DB 연결/쿼리를 알지 않는다.
Service는 유스케이스를 조정하고 Repository/Client/Adapter를 DI로 받는다. Prisma·SQL·파일·전역 fetch를 직접 호출하지 않는다.
Repository가 SQL/Prisma 조회·저장 트랜잭션 또는 로컬 후보 파일 IO를 소유한다.
PrismaService는 연결 lifecycle과 공통 advisory lock 인프라다. 외부 원천은 Client/Adapter가 읽는다.

CatalogRepository는 같은 RepeatableRead snapshot에서 버전/행/수집 상태를 읽는다.
서비스는 repository의 버전 충돌을 기존 409 응답으로 변환하고 presenter/cursor를 이용해 기존 응답을 구성한다.
CollectionRepository는 scope publish 트랜잭션과 출처/작품/시즌/이벤트/변경 이력의 DB 갱신을 묶는다.
CollectionService는 scope·모드·정규화·중복 키·성공/실패 흐름을 맡고 scheduler는 실행 시점만 담당한다.

Auth/Users는 아직 로그인/개인 저장 기능을 구현하지 않았다. 기존 503/401/no-store를 유지하는 서비스 경계이며 빈 repository를 만들지 않는다.
후보 모듈에는 제품 DB/config 의존성이 없고 Nest application context만으로 동작한다.
AppModule과 두 CLI 모두 공통 singleton DI를 쓰며, 직접 서비스 안에서 repository/PrismaClient를 생성하지 않는다.

## 검사와 한계

```sh
npm test
npm run test:db
```

npm test는 clean build 후 후보 20개 검사 및 구조/HTTP 경계 검사를 합쳐 28개를 실행한다.
AST 검사는 현재 소스의 직접 IO 의존을 발견하는 보조 검사이며 OS 권한 격리를 강제하는 장치는 아니다.
test:db는 캐시에 있는 Compose 고정 이미지를 사용해 별도 tmpfs PostgreSQL을 생성·삭제한다.
운영 .env/DB/컨테이너를 사용하지 않는다. 로컬 Docker 접근 권한과 Node24가 필요하다.

이번에는 이전 빌드(backend 6b8f337의 당시 dist 사본)를 추가 인자로 주어 21개 API 응답과 양방향 커서 호환도 비교했다.
그 사본은 /private/tmp의 검사 산출물이며 저장소에 포함하지 않는다. 기본 test:db는 현재 구조의 저장/조회/연기·실패 보존을 재현한다.
제품 iOS 연결·실제 제공처·승인 acceptance의 통합 run은 별도 미완료다.

공식 근거: [Controllers](https://docs.nestjs.com/controllers), [Providers](https://docs.nestjs.com/providers),
[Modules](https://docs.nestjs.com/modules), [Prisma](https://docs.nestjs.com/recipes/prisma).
이 구체적인 모듈/Repository 구분은 GODIEOR의 구현 책임 선택이다.

## 쿼리 작성

Prisma Client 우선 규칙과 SQL 예외는 [query-policy.md](query-policy.md)를 따른다. BE-04에서 미정 목록·이전 날짜 이력·연결 확인을 Client로 전환했다. 계산 정렬/월별 window 집계만 바인딩 SQL과 런타임 검사를 유지한다.

## 검토 후보 제품 반영

ReviewedOttModule은 수동 publish CLI 전용이다. ReviewedPublishService → 후보/매핑 Repository → Adapter → 기존 CollectionService/Repository로 이어진다. API scheduler에 연결하지 않는다. [실행·잠금·한계](reviewed-publish.md)를 따른다. 자체 검사는 현재47개이며 이전 BE-03의28개 기록은 당시 실행 사실이다.
