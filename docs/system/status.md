# 현재 상태 · 새 개발 대화의 시작점

문서 revision: `CONTEXT-2026-11-09-07`. 원본은 app의 이 파일이며 backend/verifier에는 동일 사본을 둔다.
확인일: 2026-11-09 KST. 이 문서는 현재 상태의 요약이다. 정책 원본은 product/policies,
계약 원본은 backend/contracts, 실행 사실은 각 작업 기록, 승인 기준은 verifier/requirements다.
충돌 시 날짜만 보고 정책을 덮어쓰지 말고 원본·Git 변경을 확인한다. 아래 과거 실행은 현재 프로세스 생존을 보장하지 않는다.

## 처음 읽는 순서

1. 작업 저장소의 `AGENTS.md`와 이 문서.
2. `docs/system/handoff.md`: 시작·종료·동시 작업·웹 전달 절차.
3. app의 `docs/product.md`, 공통 `docs/system/policies.md`, `architecture.md`.
4. 아래 작업 목록에서 맡을 작업과 관련 계약/ADR/실행 기록만 추가로 읽는다.

형제 저장소는 `godieor-app`, `godieor-backend`, `godieor-verifier`다. 디스크에 없거나 권한이 없으면
읽지 못한 자료와 영향을 명시한다. 독립 reviewer는 구현 작업 카드/학습 해설을 먼저 읽지 않고 handoff의 별도 절차를 따른다.

## 확인한 구현 상태

| 저장소 | 구현·실행 기록 | 아직 없는 것 | 근거 |
|---|---|---|---|
| app | SwiftUI iOS 시작 화면, 공개 API client, 월간 달력·일별 목록·상세 조회, 국가/시간대/OTT/게임기기 로컬 필터, 시뮬레이터 빌드·실제 backend 연동 화면 확인 | Google 로그인·계정 동기화, 독립 통합 검증 및 UI 자동 조작 | `docs/ai/tasks/APP-01-public-calendar.md`, `docs/ai/tasks/APP-01-options-filters.md`, `docs/ai/tasks/APP-01-integration.md` |
| backend | NestJS 공개 조회 API, Prisma 23 모델·초기 SQL migration, 로컬 PostgreSQL, fixture 파이프라인. 작성자가 빌드·가상 7건 수집·API 조회 실행. RSS 후보/검토 CLI, 기능별 Nest 계층 분리, BE-04 Client 우선, DATA-02B 검토 후보 수동 publish | 자동 전수 제공처 수집, Google/개인 쓰기, iOS 연결, 독립 통합 검증 | `docs/tasks/BE-01-local-pipeline.md`, `docs/tasks/DATA-02-ott-candidates.md`, `docs/reviewed-publish.md` (계약 작성 시점 범위는 `contracts/implementation.md`) |
| verifier | acceptance 초안, app-only evidence v1 집계기, bootstrap 자기 검사·리뷰 기록 | evidence v2, 자동 snapshot/runner/AI 어댑터, 실제 OS 격리, 승인 기준에 의한 통합 run | `README.md`, `docs/bootstrap-validation.md` |

현재 로컬 DB는 가상7건 + 공식 공지의 작성자 검토를 명시적으로 수동 반영한 OTT4건이다. 미검토 후보는 staging에 남긴다. 모든 실데이터/전수 수집이 완료된 것은 아니다. acceptance는 draft이며 세 저장소 통합 PASS는 없다.
Node 24.19.0 / Nest 12.4.0 / Prisma 7.10.1 / PostgreSQL 16.14가 로컬 구현에 고정돼 있다.
실행·중단·포트·환경 복구 원본은 backend의 `docs/local-development.md`다. 이번에는 별도 DB 검사와 로컬4건 저장/재수집, 새 임시 포트의 실제 Nest HTTP 달력/상세/health 조회를 확인하고 종료했다. 기존3000 프로세스는 재시작하지 않았다.

## 버전 확인

제품 구현을 마지막 확인한 기준 커밋은 다음과 같다. 이번 문서 변경 이후의 HEAD를 뜻하지 않는다.

- app: `4dbb8d1ee792f5d63f6fe948d77752ee069b9d7d` (APP-01 독립 리뷰 수정; 브랜치 codex/app-01-review-fixes).
- backend: `85ea4f3398d949e4f59313232306c3325956b7a6`.
- verifier: `109f918799d6c818ae30ba5af4a5cedb112573e8`.
- API: `0.1.0-draft.2`, 작성자 검토 기록 있음 / 독립 검토 대기.
- package-lock은 이전 계약pin6258118과 다르며 이번 시작0799404/현재222f67f에서는 동일하다. 재현에는 고정 backend SHA의 lock을 사용한다. 계약 문서/Prisma/migration 해시는 기존pin과 동일하다.
- 계약·migration digest: app `docs/api/contract-reference.json`, verifier `docs/contracts/reference.json`.
- 공통 문서: `SYNC-2026-11-09-18`. OTT 날짜 기준을 유지하고 APP-01 통합 및 독립 검증 대기를 반영했다.
  계약 참조의 `policyRevision=SYNC-2026-11-09-13`은 계약 작성 기준으로 보존하며, 이번 문서 변경으로 재고정하지 않는다.
  API 스키마·migration·acceptance 승인 상태는 변경하지 않았다. 최신 입력 정책은 제품 연결 때 계약 고정본과 대조한다.

작업 직전 각 저장소에서 `git status --short`, `git branch --show-current`, `git rev-parse HEAD`를 실행한다.
현재 checkout이 기준과 다른 경우 diff와 후속 기록을 읽는다. 웹 전달 파일은 생성 시점의 전체 HEAD·branch·dirty 상태·문서 SHA-256을 따로 기록한다.

## 이어받을 작업

| 작업 | 상태·담당 | 다음 행동 / 완료 조건 | 기록 |
|---|---|---|---|
| CTX-02 | 커밋 규칙 보완·다음 작업 판단 완료. 세션 종료 시 담당 해제 | 커밋은 영문 타입 + 한글 설명 사용. 새 개발은 아래 우선순위 참고 | app `docs/ai/tasks/CTX-02-commit-convention.md` |
| CTX-01 | 문서·생성 도구 구현 완료, 사용자 계정 전환 실험 대기. 현재 구현 세션 종료 시 담당 해제 | 새 계정이 이 문서만 시작점으로 상태·미완료·다음 일을 설명하는지 사용자가 확인 | app `docs/ai/tasks/CTX-01-context-handoff.md` |
| BE-04 | Client 우선 쿼리 전환·33개 자체 검사·21API/커서·105개 이력 DB 회귀, 고정 코드 리뷰 추가 지적 없음 보고, 담당 해제 | SQL 예외 목록을 유지하며 새 query는 Client 표현부터 검토 | backend `docs/query-policy.md`, `docs/tasks/BE-04-prisma-query-policy.md` |
| DATA-02B | 고정 키 매핑·수동 publisher 구현, 전체47개 자체 검사·임시 DB 회귀·로컬4건 반영/조회 확인, 담당 해제 | APP-01 연결·검증기 통합/evidence v2. 자동 수집/다중 작품 공지는 후속 | backend `docs/reviewed-publish.md`, `docs/tasks/DATA-02B-reviewed-publish.md` |
| BE-03 | 기능별 Nest 계층 분리·28개 자체 검사·별도 DB/API 호환 확인. 고정 코드 리뷰에서 추가 지적 없음 보고, 담당 해제 | 후속 BE-04/DATA-02B 완료, 계층/쿼리 규칙 유지 | backend `docs/tasks/BE-03-nest-layering.md`, `docs/backend-architecture.md` |
| DATA-02A | 공식 RSS 후보 CLI·검토 입력/보류·내보내기 구현 및 작성자 실행, 담당 해제 | 후속 DATA-02B로 고정 키 매핑/수동 publish 구현. 독립 통합 검증은 별도 | backend `docs/tasks/DATA-02-ott-candidates.md`, `docs/ott-candidates.md` |
| DATA-01 / OTT 근거 | 공식 공개 페이지·3개 RSS 실제 접근 확인 완료, 작성자 조사. 어댑터/인증 API·전수 coverage 미확인. 담당 해제 | 공지 후보 수집/검토를 DATA-02A로 진행. 전수 coverage/허용 조건은 계속 확인 필요 | backend `docs/research/2026-11-09-ott-feasibility.md`, `docs/tasks/DATA-01-ott-feasibility.md` |
| 계약 독립 검토 / VFY-01~04 | 대기, 담당 없음 | 기준 초안·고정 SHA/계약 조합으로 독립 검토 및 evidence v2/runner 설계. 구현 완료로 취급하지 않음 | 공통 `plan.md`, verifier `requirements/proposals/` |
| APP-01 | 구현 및 작성자 통합 점검 완료, 담당 해제. 독립 검증 대기 | 상세 요청 400 원인(`country` 불허)을 수정하고 iOS 빌드/백엔드 상세 HTTP 200 확인. 다음은 verifier의 고정 SHA 독립 검증, iOS 날짜 탭 UI 조작 검사 | app `docs/ai/tasks/APP-01-integration.md` |
| APP-01G | 문서 동기화·인계 완료 | 세 저장소 공통 사본 동기화·고정 SHA 인계, UI 날짜 탭→상세 미실행 범위 기록 | app `docs/ai/tasks/APP-01-finalize.md` |
| BE-AUTH / 개인 쓰기 | 미착수, 담당 없음 | 세션·계정 삭제/동기화 충돌 세부 설계 후 Google 실제 인증·사용자 격리 구현 | backend 계약, 공통 P03 |

BE-03 이후 사용자 지시로 Prisma Client 우선 규칙을 문서화/코드 반영하고 다음 작업인 DATA-02B를 진행했다. 날짜 정책/계약 스키마는 유지했다.
계정 전환 실험 결과는 아직 전달받지 못했다. 이를 후속 모든 작업의 필수 선행 조건으로 두지는 않는다.

조사 결과: Netflix/Coupang/CJ의 공개 공지에 날짜 근거가 있고 RSS를 실제 XML 파싱했다.
단, RSS는 최신 일부이며 과거 채우기/전수 일정을 보장하지 않는다. Disney+는 이전 조사에서 검색 색인과 본문 차이가 있었으며 이번에는 공식 작품 페이지의 연월일을 재확인했다.
미검토 검색 요약·플랫폼 가용성·TV 방송일로 한국 OTT 최초 공개일을 생성하지 않는다.

실제 실행: 공지 RSS 77개 후보 수집(드라마 77작품이라는 뜻 아님), 공식 링크 수동 추가와 작성자 검토 후 80개 공지 중 4개 후보 내보내기.
이는 작성자의 근거 확인이며 사용자 검토/독립 검증 PASS가 아니다. 월/연도만 있는 검토는 보류하고 시각/시즌은 null을 허용한다.
빌드 성공, 날짜·출처·변경/부분 실패·동시 쓰기의 자체 검사 17개 통과. 운영 DB는 사용하지 않았고 후속 BE-03은 별도 임시 PostgreSQL에서 검사했다.
BE-03 결과: build/28개 자체 검사, 기존 빌드와 21개 API 응답·양방향 커서 호환, 수집 반복/연기/실패 보존 확인.
별도 reviewer는 고정 6b8f337→3863f02에서 대역 비교 후 추가 지적 없음을 보고했다. 실제 DB 실행/승인 통합 PASS로 확대하지 않는다.

BE-04 / DATA-02B 결과: 전체47개 자체 검사, 별도 임시 DB 반복/정정/identity 거부, 기존21API/커서 호환 확인. 공식 근거4건 수동 publish 두 번 후 provider4+fixture7 및 provider 최초 변경이력4 유지. 시간대 null인4건은 date_only다. 새 임시 포트 API 조회 후 종료했다.
고정 코드 별도 리뷰: BE-04 Lovelace(5개/noEmit, HTTP sandbox 제한), DATA-02B Volta(임시 build/39개 scoped)가 각각 추가 지적 없음을 보고했다. 두 reviewer는 실제 PostgreSQL을 실행하지 않았다. verifier/reviews의 개별 기록 참조.
APP-01 업데이트(2026-11-09): 실제 로컬 backend API와 iPhone 17 Pro Simulator에서 달력 표시·필터 응답 확인. 상세 API에 앱이 허용되지 않은 `country`를 보낸 HTTP 400을 확인해 앱에서 제거했고 재요청 HTTP 200, iOS 빌드 성공. 날짜 선택→상세 전체 UI 조작 및 독립 검증은 미확인이다. 세부 기록은 `docs/ai/tasks/APP-01-integration.md`와 `APP-01-finalize.md`에 있다.
다음 작업: APP-01 고정 SHA 독립 검증과 VFY evidence v2/runner 확장. 극장 영화 최소 샘플과 자동 OTT 범위 보강은 후속이다.
한 공지에 여러 작품·서로 다른 공지에 같은 작품, 정정 시 기존 이벤트 ID 보존을 다뤄야 한다.
키를 준비한 다른 출처 최소 응답 확인, 계약 독립 검토/evidence v2·runner 확장은 병행 가능하다.
LEARN-0008 후보 단계, LEARN-0009 서버 계층, LEARN-0010 Prisma 쿼리, LEARN-0011 검토 후보 제품 반영에 실제 선택/검사/한계를 기록했다.

## 현재 우려와 미정 사항

- 사용자 우려: OTT 날짜를 제대로 확보할 수 있는가? 네 플랫폼을 포괄하는 무료 공식 공개일 API를 확보하지 못했다.
  TMDB의 플랫폼 가용성/일반 방영일을 특정 국가·플랫폼의 시즌 최초 공개일로 대입하지 않는다.
  공지 기반 일부 날짜 확보는 확인했지만 완전 자동·전수 수집/허용 조건은 입증되지 않았다.
- 실제 출처 API 인증 호출은 미실행이다. 무료 이용 조건·과거/미래 범위·누락률은 실제 자료로 판단해야 한다.
- 클라우드 제공자, 실제 재시도/보관 정책, 세션 상세, 승인 acceptance, AI 실행 격리는 미정/미완료다.
- 최종 목표는 본인 iPhone + 클라우드 API/DB, Mac verifier이며 지금은 로컬 우선이다.
- 커밋은 영문 타입 + 한글 설명(`docs: 커밋 규칙 보완` 등). push·외부 배포·유료 가입은 해당 사용자 요청 범위에서 수행한다.

## 다음 세션에 그대로 사용할 요청

> 이 저장소의 AGENTS.md와 docs/system/status.md, docs/system/handoff.md를 읽어라.
> 변경하기 전에 현재 구현·가상/실제 데이터·미검증 부분·현재 커밋·권장 다음 작업을 짧게 설명해라.
> 읽지 못한 저장소/자료를 명시하고, 현재 사용자 요청이 없으면 후속 기능 구현을 시작하지 마라.

이 문서는 전체 대화 원문이나 모델의 내부 기억이 아니다. 개발에 필요한 확정·근거·미해결 사항을 인계한다.

## APP-01H 최신 후속 (2026-11-09 KST)

원본 카드: app docs/ai/tasks/APP-01-review-fixes.md. 상세 최신 상태/개최국 및 날짜 요청 UUID/revision 보호 수정 완료. 작성자 Simulator 날짜 선택→목록→상세, OTT 해제/복원과 재실행 후 필터 유지 확인. 최종 iOS 빌드 성공. 별도 컨텍스트 정적 리뷰 IR001~004 수정 후 추가 지적 없음 보고. 리뷰는 실제 UI/DB 실행이나 승인 판정이 아니다. 응답 지연/409 주입·DST/전국가 전수 UI 미실행. verifier/reviews/2026-11-09-app-public-calendar.md 및 LEARN-0012 참조.

현재 APP-01H 담당 해제. 다음 작업은 verifier VFY-01의 현재 정책 대비 관찰점 정리와 기존 VFY-02 evidence v2 구현이다. APP-01 UI 탐색을 미실행으로 기술한 위 과거 문단은 당시 기록이며 최신 확인 범위는 본 절/카드를 우선한다. acceptance draft 및 통합 PASS 없음 유지. backend는 문서만 변경, 실행 코드 기준85ea4f3.
