# GODIEOR Backend

영화·OTT 드라마·게임·EPL 일정을 수집·정규화하고 iOS 앱에 제공할 backend 저장소.
현재는 **정책 결정 전 문서 구성 단계**이며 서버·DB·API·실제 제공처 연동은 아직 구현하지 않았다.

## 세 저장소

| 저장소 | 책임 |
|---|---|
| [godieor-app](https://github.com/joobang/godieor-app) | SwiftUI iOS, 화면·API 소비·기기 설정, 제품/학습 문서 |
| godieor-backend | 일정 수집·정규화·DB·조회 API, 계정·세션, API 계약·migration |
| [godieor-verifier](https://github.com/joobang/godieor-verifier) | 독립 기준·검사·리뷰·결정적 판정·검증 이력 |

## 먼저 읽을 문서

- [공통 아키텍처](docs/system/architecture.md)
- [공통 작업 순서](docs/system/plan.md)
- [사용자가 정할 정책](docs/system/policies.md)
- [backend 작업 범위](docs/repository-plan.md)
- [데이터 제공처 조사](docs/data-sources.md)
- [기술 결정 관리](docs/decisions/README.md)

2026-11-09 사용자 선택으로 **NestJS + PostgreSQL + Prisma**, **TypeORM 제외**를 확정했다.
첫 목표는 Mac에서 NestJS·Prisma·PostgreSQL을 실행해 앱과 연결하는 것이다. 최종 API/DB는 클라우드에서 운영한다.
정확한 버전·로컬 DB 실행 도구·클라우드 제공자는 미정이며, 제공자 선정은 로컬 실행의 선행 조건이 아니다.
[실행 위치와 단계 ADR](docs/decisions/003-runtime-topology.md)을 참고한다.
[확정 범위 ADR](docs/decisions/001-nestjs-postgresql.md), [ORM 후보 비교](docs/decisions/002-orm-options.md)를 참고한다.
계정은 Google 연동 방향이며 [계정 설계 제안](docs/decisions/004-google-account.md)에 역할·미정 범위를 기록했다.
실행 명령·계정·유료 플랜·원격 DB/배포는 이 문서 구성 작업으로 생성하지 않는다.

학습 기록은 [app의 카탈로그](https://github.com/joobang/godieor-verifier/tree/dev/docs/learning)에 연결한다.
문서 revision과 현재 런타임 구현 상태를 구분한다. 기존 verifier v1은 backend 조합을 검증하지 않는다.
