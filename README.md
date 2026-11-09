# GODIEOR Backend

NestJS + Prisma + PostgreSQL로 영화·OTT 드라마 시즌 최초 공개·게임 정식 출시·EPL 경기 일정을 제공한다.
현재 **로컬 공개 API와 가상 제공처 파이프라인**을 구성했다. 제품용 실제 제공처 어댑터·Google/계정 쓰기·iOS 연결은 아직 없다. 공개 공지 후보 수집은 아래 별도 staging이다.

## 새 계정·대화에서 이어받기

[현재 상태](docs/system/status.md) → [인계 절차](docs/system/handoff.md) → 해당 작업 카드 순으로 읽는다.
현재 상태 문서 원본은 app이다. 아래 실행 안내와 구분하며, 과거 실행 기록을 현재 프로세스 생존으로 해석하지 않는다.
웹 전달본은 app의 `python3 scripts/export-context.py`로 생성한다.

## 서버 구조

[기능 모듈·계층 책임](docs/backend-architecture.md): catalog/health는 Controller → Service → Repository, 수집은 Service → Repository/Adapter다.
auth/users는 미구현 차단 서비스이며 후보 CLI도 별도 Nest 모듈·DI를 사용한다.

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

## OTT 공지 후보 단계

[후보 수집·검토 CLI](docs/ott-candidates.md)를 추가했다. 공개 RSS/공식 링크 후보는 로컬 staging이고 제품 일정으로 publish하지 않는다.
`npm run candidates -- collect` → `list` → 검토 JSON 입력 → `export` 순서다. 연·월·일 없는 후보는 보류한다.

## 설계·계약·기록

- [API·DB 계약과 가상 예시](contracts/README.md) / [실제 구현 범위](contracts/implementation.md)
- [계약 작성자 검토](docs/reviews/2026-11-09-contract-review.md)
- [수집 파이프라인](docs/pipeline.md)
- [실제 데이터 출처 적합성 판단](docs/data-source-assessment.md)
- [공통 아키텍처](docs/system/architecture.md) / [작업 계획](docs/system/plan.md) / [확정 정책](docs/system/policies.md)
- [기술 결정](docs/decisions/README.md) / [작업 기록](docs/tasks/BE-01-local-pipeline.md)

앱은 [godieor-app](https://github.com/joobang/godieor-app), 독립 기준·검토·학습 기록은 [godieor-verifier](https://github.com/joobang/godieor-verifier).
계약과 작성자의 실행 확인을 독립 검증 PASS로 표현하지 않는다. 기존 verifier v1은 backend 조합을 아직 실행 검증하지 못한다.
커밋은 `type: 한글 설명` 형식(영문 타입)으로 작성하고 push·배포는 별도 요청 범위다.
