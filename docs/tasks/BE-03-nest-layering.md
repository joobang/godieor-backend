# BE-03 · NestJS 기능 모듈과 Controller→Service→Repository 분리

- requirement: SYS-02 / BE-01~02 / PROD-001~010의 구조 개선. API/DB 계약 의미 변경 없음.
- 사용자 요청: NestJS 구조가 Controller→Service→Repository로 구성되지 않은 문제 지적·정리.
- 담당: codex-backend-03, 진행 중.
- 기준: app 2f31635/dev, backend 6b8f337/dev, verifier 3246e88/dev. 시작 모두 clean.
  backend의 현재 사용자 checkout은 dev이므로 main으로 되돌리지 않음. 같은 checkout 동시 수정 없음.
- 현재 문제: 루트 module.ts에 여러 컨트롤러/필터, Catalog의 조회 검증·서명·SQL·표시·트랜잭션 혼합,
  Pipeline의 수집 orchestration·DB 쓰기/스케줄 혼합, 후보 CLI가 Nest DI 밖에서 IO 직접 호출.
- 범위: 기능별 모듈/컨트롤러/서비스/레포지토리, 공통 config/DB/filter, 파이프라인·후보 CLI DI,
  기존 동작 회귀 검사·문서/학습 기록·별도 코드 리뷰. 기존 DB/migration/계약/승인 상태 변경 없음.
- 예상 실패: DI 등록 누락/순환 참조, route/오류/Cache-Control 변경, SQL 날짜/페이지/버전 트랜잭션 경계 변경,
  fixture 수집 lock/원자성 변경, CLI에 불필요한 DB 연결 강제, 후보 lock/revision 검토 재사용 회귀.
- 완료 조건: 컨트롤러는 HTTP 경계, 서비스는 유스케이스, repository만 Prisma/파일 IO;
  기능 모듈로 DI 구성, 빌드와 기존 후보 검사/HTTP 경계 검사·가상저장 흐름 회귀, 별도 검토.
- ADR/LEARN: 구조 선택과 실제 문제/수정 근거를 종료 때 연결.

## 실행·종료

- Nest 공식 controllers/providers/modules/Prisma 문서를 확인하고, HTTP·유스케이스·저장 책임을 기능 모듈로 분리했다.
- CatalogController→CatalogService→CatalogRepository, HealthController→HealthService→HealthRepository.
- CollectionService→CollectionRepository, scheduler 분리. 후보 CLI는 OttCandidatesModule→Service→Repository/OfficialFeedClient.
- 기존 루트 혼합 파일은 제거하고 DTO pipes/presenters/cursor/config/filter/DB 인프라를 각각 분리했다.
- `npm test`: 빌드 성공. 최초 AST 검사에서 adapter.fetch 위임까지 전역 IO로 오인해 검사식을 보완, 최종 28개 검사 통과.
- `node scripts/check-refactor-db.cjs /private/tmp/godieor-be03-baseline`: exit0.
  전용 tmpfs Postgres에 migration·전체 Nest DI·가상7건 저장/재조회·반복수집 ID/변경이력 보존,
  이전 빌드와 21개 API 응답 비교·커서 양방향 호환, 연기 ID/이전날짜·실패 시 마지막 성공 데이터 보존 확인.
  생성한 임시 컨테이너를 제거했고 기존 godieor/KNU 컨테이너·볼륨은 수정하지 않았다.
- DB 검사 중 pg query 동시 실행 deprecation 안내를 관찰했다. 검사 실패는 아니며 기존/신규 빌드 비교 환경에서도 발생했다.
- 코드 구조 커밋 후 별도 컨텍스트 리뷰를 요청할 예정. acceptance 승인/고정 snapshot 제품 통합 PASS는 아직 없음.

