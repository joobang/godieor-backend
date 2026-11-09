# ADR-009 · 전용 로컬 DB와 가상 제공처 파이프라인

2026-11-09 / BE-01~02. Node 24.19.0·Nest 12.4.0·Prisma 7.10.1·PostgreSQL 16.14 선택.
기존 지원되는 PostgreSQL 이미지를 digest로 고정해 추가 인프라 설치 없이 Compose의 전용 네트워크/볼륨/포트를 사용했다.
시스템 Node 20은 EOL인 반면 제공된 Node 24가 Prisma 요구사항을 만족해 이 실행에 사용했다. 시스템 전역 환경은 수정하지 않았다.
Prisma 8 RC는 선택하지 않았다. package-lock으로 의존성을 고정한다.

DB 제약 SQL을 migration으로 옮기고 실제 DB에서 Prisma 모델을 가져왔다. CHECK/부분 인덱스는 SQL 원본을 유지한다.
당장은 한 Nest 프로세스의 조회/일일 수집과 CLI가 같은 파이프라인을 사용한다. 별도 상시 서버/큐는 추가하지 않았다.
스케줄은 기본 OFF, 06:00 KST 제안. 분산된 worker가 필요해져도 adapter/normalize/publish 경계를 재사용할 수 있게 한다.
JSONB 비교와 팀 외부 ID 매핑의 예방 설계를 기록했다. 운영 장애 개선 사례나 독립 검증 성과로 과장하지 않는다.

근거: [Node LTS](https://nodejs.org/en/about/previous-releases), [Prisma 요구사항](https://www.prisma.io/docs/orm/v7/reference/system-requirements),
[Prisma PostgreSQL adapter](https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/postgresql), npm registry의 실제 고정 패키지 버전.
Prisma 모델 생성기 옵션은 [공식 generator 문서](https://www.prisma.io/docs/orm/v7/prisma-schema/overview/generators)를 참고했다.
학습 연결: verifier LEARN-0006. 미완료: Google/개인 쓰기·실제 제공처·독립 실행 경계/evidence v2.
