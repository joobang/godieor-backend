# GODIEOR Backend

NestJS + Prisma + PostgreSQL로 영화·OTT 드라마 시즌 최초 공개·게임 정식 출시·EPL 경기 일정을 제공한다.
현재 **로컬 공개 API와 가상 제공처 파이프라인**을 구성했다. 실제 제공처·Google/계정 쓰기·iOS 연결은 아직 없다.

## 시작

Node 24를 선택하고 다음 순서로 실행한다.

```sh
npm ci
node scripts/setup-local.mjs
npm run db:up
npm run db:migrate
npm run build
npm run collect:fixture
npm start
```

[실행/중단·환경 설정](docs/local-development.md). 현재 DB 127.0.0.1:55432, API 127.0.0.1:3000/v1.
모든 현재 일정은 가상이며 dataOrigin=fixture다. API/DB는 전용 Compose 볼륨을 사용한다.

## 설계·계약·기록

- [API·DB 계약과 가상 예시](contracts/README.md) / [실제 구현 범위](contracts/implementation.md)
- [계약 작성자 검토](docs/reviews/2026-11-09-contract-review.md)
- [수집 파이프라인](docs/pipeline.md)
- [실제 데이터 출처 적합성 판단](docs/data-source-assessment.md)
- [공통 아키텍처](docs/system/architecture.md) / [작업 계획](docs/system/plan.md) / [확정 정책](docs/system/policies.md)
- [기술 결정](docs/decisions/README.md) / [작업 기록](docs/tasks/BE-01-local-pipeline.md)

앱은 [godieor-app](https://github.com/joobang/godieor-app), 독립 기준·검토·학습 기록은 [godieor-verifier](https://github.com/joobang/godieor-verifier).
계약과 작성자의 실행 확인을 독립 검증 PASS로 표현하지 않는다. 기존 verifier v1은 backend 조합을 아직 실행 검증하지 못한다.
커밋 메시지는 한글로 작성하고 push·배포는 별도 요청 범위다.
