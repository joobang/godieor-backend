# GODIEOR Backend

NestJS + Prisma + PostgreSQL로 영화·OTT 드라마 시즌 최초 공개·게임 정식 출시·EPL 경기 일정을 제공한다.
현재 **로컬 공개 API·가상 수집과 검토한 OTT 공지의 수동 publish**를 구현했다. Google 계정 인증·세션·설정/찜 API는 초기 구현 후 자체 테스트를 완료했다. 실제 Google OAuth·단말과 DB 통합 검증, 자동 전수 수집은 아직 없다.

## DATA-70 실제 적재 · 2026-11-16

[공식 근거 검토 배치](docs/tasks/DATA-70-reviewed-data-batch.md) 신규23건을 로컬 PostgreSQL에 실제 반영했다. Netflix14/Disney+4/TVING2/Coupang3, 총70→93. 기존70 event 전체행·ID·이력 보존, 새23 목록/상세 API200 및 재게시 신규0 확인. 전체 자체검사276/276. 작성자 원문 검토 적재이며 일반 자동 승인·독립 PASS·폰/클라우드 검증과 구분한다.

## 최신 OTT 자동화 관측 · DATA-69 (2026-11-16)

[작업 기록](docs/tasks/DATA-69-new-premiere-evidence.md). 공식 수집·TMDB·조건부 신규 첫 공개 검토·기존 PostgreSQL 게시와 Node24 일간 실행을 연결했다. 전체 자체검사276개 및 가상 신규 근거→일회용DB 저장·재실행 검사가 통과했다. 실제 TMDB3,305작품/1,217후보·요청오류0, 기존 검토70 게시/신규0이다. 쿠팡 영화 제공처 미등재와 신규 첫날 근거/식별 보류가 남아 전체 자동 게시 완성이나 독립 PASS는 아니다. 아래 과거 예제 건수보다 상태 문서의 최신 관측이 우선한다.

## 새 계정·대화에서 이어받기

[현재 상태](docs/system/status.md) → [인계 절차](docs/system/handoff.md) → 해당 작업 카드 순으로 읽는다.
현재 상태 문서 원본은 app이다. 아래 실행 안내와 구분하며, 과거 실행 기록을 현재 프로세스 생존으로 해석하지 않는다.
웹 전달본은 app의 `python3 scripts/export-context.py`로 생성한다.

## 서버 구조

[기능 모듈·계층 책임](docs/backend-architecture.md): catalog/health는 Controller → Service → Repository, 수집은 Service → Repository/Adapter다.
[Prisma Client 우선·SQL 예외 규칙](docs/query-policy.md)을 따른다.
auth/users는 Google JWKS 토큰 검증·난수 세션·사용자별 설정/찜 관리 기능이며 후보 CLI도 별도 Nest 모듈·DI를 사용한다.

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
현재 로컬 DB에는 가상7건과 공식 공지를 작성자가 검토해 반영한 OTT4건이 함께 있다. dataOrigin으로 구분한다. API/DB는 전용 Compose 볼륨을 사용한다.

## Google 계정 기능 (실 OAuth 통합 검증 대기)

`GOOGLE_IOS_CLIENT_ID`를 등록된 Google iOS OAuth 클라이언트 ID로 설정해야 `/v1/auth/google`에서 Google ID token을 검증한다. 로그인은 30일 난수 서비스 bearer token을 반환하며 DB에는 해시만 저장한다. `/v1/me`, `/v1/me/settings`, `/v1/me/favorites`와 찜 PUT/DELETE는 인증이 필요하다. 설정은 expectedVersion, 찜 목록은 버전 고정 cursor로 충돌을 검출한다. 로그아웃은 `/v1/auth/session` DELETE로 해당 세션을 폐기한다. API 초안 0.1.0-draft.2와 DB migration은 변경하지 않았다. 자체 테스트 `npm test` 51개 통과; 실제 Google 로그인/DB 연동은 별도 검증 필요.

## OTT 공지 후보 단계

[후보 수집·검토 CLI](docs/ott-candidates.md)를 추가했다. 공개 RSS/공식 링크를 로컬 staging에서 검토하고 [명시적 고정 키 매핑으로 수동 publish](docs/reviewed-publish.md)한다.
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

### 공식 공개예정 배치 수집 · DATA-54

`node --env-file=.env scripts/collect-tving-upcoming.mjs <새보고서.json>`으로 공개 TVING 예정작 전체의 명시 날짜·TMDB 식별 근거를 미승인 후보로 수집한다. Disney+/Netflix공지/CJ/TVING 공식 파서는 기존 TMDB 수집기의 재확인 단계에 연결했다. [실행·staging 절차](docs/reviewed-publish.md), [작업·한계](docs/tasks/DATA-54-official-route-parsers.md). 신규제품게시0/정확일치26/52이며 후보수를 서비스 커버리지로 세지 않는다.

공식후보식별보강(DATA-55): 동일tvN프로그램의출연진과TMDB명시인물별칭을대조하며원천이름·인물ID를일대일로계산한다. [작성자검토배치/한계](docs/tasks/DATA-55-ott-identity-evidence.md). 로컬기간68행/정확26/52로전체참조누락은미해결이다.

OTT애니지원(DATA56): 애니영화·시리즈형태를명시해검토·새DB제약/APIdraft.5·앱배지까지연결했다. 기존애니4개분류보정/신규이벤트0,실제68행/정확26/52. [원본기록](docs/tasks/DATA-56-ott-animation-support.md), ADR021. 독립승인/실폰/클라우드는미완료다.
