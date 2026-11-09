# GODIEOR backend 개발 규칙

- GODIEOR는 iOS 앱·backend·독립 검증의 세 저장소로 구성된다. KNU/wd-harness를 수정하거나 확장하지 않는다.
- 먼저 `docs/system/architecture.md`, `plan.md`, `policies.md`를 읽는다.
  공통 문서 원본은 app의 `docs/system/`이며 같은 revision의 사본을 함께 갱신한다.
- 현재 backend는 문서 구성 단계다. NestJS + PostgreSQL + Prisma, TypeORM 제외는 사용자 확정이다.
  최종 API/DB는 클라우드, 첫 개발은 Mac 로컬 실행으로 확정했다. 정확한 버전·제공자는 pending이다.
  로컬 설정과 운영 설정을 구분하며, 클라우드 가입·배포를 로컬 개발의 선행 조건으로 만들지 않는다.
- V1 계정은 Google 연동 방향이다. 서비스 계정/세션을 담당하며 동기화 데이터 범위는 별도 정책이다.
- 책임은 외부 제공처 인증·수집·정규화·중복/변경 처리, API, DB migration, 자체 검사다.
  iOS 화면·기기 설정·사용자 표시 형식은 app 책임이다.
- API 계약 초안 원본은 `contracts/openapi.yaml`, DB 참조 DDL은 `contracts/database.sql`이다. 런타임/migration은 아직 없다. 제품 정책에서 계약을 작성하고 앱 소비·독립 검토를 거친다.
  구현 출력을 정답으로 삼거나 앱이 아직 지원하지 않는 계약 변경을 조용히 배포하지 않는다.
- 제품 요구사항은 app/docs/product.md, 승인 검증 기준은 verifier/requirements/acceptance.yaml을 참조한다.
  구현 담당은 검증 기준 변경을 제안할 수 있고 승인 상태·승인자를 작성할 수는 없다.
- 콘텐츠/공개 이벤트, 실제 instant/지역 날짜만/미정을 구분한다. 제목만으로 병합하지 않는다.
  한국 서비스 대상과 경기 장소·원본 시간대를 혼동하지 않는다.
- 실제 데이터·가상 fixture·미정·지연을 명시하고 제공처 접근/이용 조건을 확인한 뒤 연결한다.
- API 키는 backend 로컬/원격 비밀 설정에만 둔다. 앱 번들·소스·fixture·명령 인자·공개 로그에 넣지 않는다.
- 검사에는 일회용 DB를 사용하고 migration 적용·저장 후 재조회까지 확인한다.
- 독립 handoff에는 app/backend base/head SHA, 계약·migration digest, verifier/기준 버전, 실제 검사 결과를 기록한다.
- 독립 reviewer는 구현 대화를 상속하지 않는다. 별도 저장소가 OS 권한 격리를 보장하지 않는다.
- 중요한 선택은 이 저장소 ADR에 남기고, 통합 학습 카탈로그는 verifier/docs/learning 원본의 LEARN-ID로 연결한다.
  중앙 카탈로그 쓰기 권한이 없으면 근거·초안을 작업 기록에 남겨 동기화 대상으로 제안한다.
- 실제 사건·예방 설계·가설·확정 사실을 구분한다. 사용자의 이해도나 성과 수치를 임의로 작성하지 않는다.
- 사용자 지시에 따라 검토 가능한 작업 단위가 되면 적절히 commit한다.
  push·유료 가입·배포는 별도 사용자 요청 범위에서 수행한다.

- 2026-11-09 사용자 지시: 앞으로 커밋 메시지는 한글로 작성한다.
