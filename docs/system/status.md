# 현재 상태 · 새 개발 대화의 시작점

문서 revision: `CONTEXT-2026-11-09-03`. 원본은 app의 이 파일이며 backend/verifier에는 동일 사본을 둔다.
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
| app | SwiftUI 시작 화면, iOS 빌드 스크립트 | API client, 달력/상세 기능, Google 로그인·계정 동기화 | `README.md`, `docs/repository-plan.md` |
| backend | NestJS 공개 조회 API, Prisma 23 모델·초기 SQL migration, 로컬 PostgreSQL, fixture 파이프라인. 작성자가 빌드·가상 7건 수집·API 조회 실행 | 실제 제공처, Google/개인 쓰기, iOS 연결, 실패/경합 회귀 검사·독립 통합 검증 | `docs/tasks/BE-01-local-pipeline.md`, `contracts/implementation.md` |
| verifier | acceptance 초안, app-only evidence v1 집계기, bootstrap 자기 검사·리뷰 기록 | evidence v2, 자동 snapshot/runner/AI 어댑터, 실제 OS 격리, 승인 기준에 의한 통합 run | `README.md`, `docs/bootstrap-validation.md` |

모든 현재 일정은 가상이다. acceptance는 draft이며 세 저장소 통합 PASS는 없다.
Node 24.19.0 / Nest 12.4.0 / Prisma 7.10.1 / PostgreSQL 16.14가 로컬 구현에 고정돼 있다.
실행·중단·포트·환경 복구 원본은 backend의 `docs/local-development.md`다. 이번 인계 문서 작업에서 제품 실행을 다시 확인하지 않았다.

## 버전 확인

제품 구현을 마지막 확인한 기준 커밋은 다음과 같다. 이번 문서 변경 이후의 HEAD를 뜻하지 않는다.

- app: `d4b5eba`.
- backend: `625811830172c8ceb08ef2a1ab10fd44a1abd53a`.
- verifier: `01ca34b816ddf4d9b6185e1a9e450008bb642c6b`.
- API: `0.1.0-draft.2`, 작성자 검토 기록 있음 / 독립 검토 대기.
- 계약·migration digest: app `docs/api/contract-reference.json`, verifier `docs/contracts/reference.json`.
- 공통 문서: `SYNC-2026-11-09-14`. 이전 13에서 커밋 표기만 영문 타입 + 한글 설명으로 보완했다.
  계약 참조의 `policyRevision=SYNC-2026-11-09-13`은 계약 작성 기준으로 보존하며, 이번 문서 변경으로 재고정하지 않는다.
  제품/API 의미·migration·acceptance 승인 상태는 변경하지 않았다.

작업 직전 각 저장소에서 `git status --short`, `git branch --show-current`, `git rev-parse HEAD`를 실행한다.
현재 checkout이 기준과 다른 경우 diff와 후속 기록을 읽는다. 웹 전달 파일은 생성 시점의 전체 HEAD·branch·dirty 상태·문서 SHA-256을 따로 기록한다.

## 이어받을 작업

| 작업 | 상태·담당 | 다음 행동 / 완료 조건 | 기록 |
|---|---|---|---|
| CTX-02 | 커밋 규칙 보완·다음 작업 판단 완료. 세션 종료 시 담당 해제 | 커밋은 영문 타입 + 한글 설명 사용. 새 개발은 아래 우선순위 참고 | app `docs/ai/tasks/CTX-02-commit-convention.md` |
| CTX-01 | 문서·생성 도구 구현 완료, 사용자 계정 전환 실험 대기. 현재 구현 세션 종료 시 담당 해제 | 새 계정이 이 문서만 시작점으로 상태·미완료·다음 일을 설명하는지 사용자가 확인 | app `docs/ai/tasks/CTX-01-context-handoff.md` |
| DATA-01 / OTT 근거 | 공식 공개 페이지·3개 RSS 실제 접근 확인 완료, 작성자 조사. 어댑터/인증 API·전수 coverage 미확인. 담당 해제 | 다음 제안: 공지 후보 수집→사람 검토→publish 허용 여부 결정 및 표본 대조. 부분 지원을 자동 확정하지 않음 | backend `docs/research/2026-11-09-ott-feasibility.md`, `docs/tasks/DATA-01-ott-feasibility.md` |
| 계약 독립 검토 / VFY-01~04 | 대기, 담당 없음 | 기준 초안·고정 SHA/계약 조합으로 독립 검토 및 evidence v2/runner 설계. 구현 완료로 취급하지 않음 | 공통 `plan.md`, verifier `requirements/proposals/` |
| APP-01 | 미착수, 담당 없음 | 고정 계약으로 공개 API client→캘린더/상세 연결. 가상 데이터 표시, 날짜 정밀도 유지 | app `docs/repository-plan.md` |
| BE-AUTH / 개인 쓰기 | 미착수, 담당 없음 | 세션·계정 삭제/동기화 충돌 세부 설계 후 Google 실제 인증·사용자 격리 구현 | backend 계약, 공통 P03 |

후속 작업의 우선순위는 제안이다. 현재 요청한 OTT 확보 가능성 확인에서 공식 샘플·RSS 접근과 한계를 조사했다.
계정 전환 실험 결과는 아직 전달받지 못했다. 이를 후속 모든 작업의 필수 선행 조건으로 두지는 않는다.

조사 결과: Netflix/Coupang/CJ의 공개 공지에 날짜 근거가 있고 RSS를 실제 XML 파싱했다.
단, RSS는 최신 일부이며 과거 채우기/전수 일정을 보장하지 않는다. Disney+는 검색 색인의 일자와 현재 상세 본문의 연도 표시가 달랐다.
미검토 검색 요약·플랫폼 가용성·TV 방송일로 한국 OTT 최초 공개일을 생성하지 않는다.

권장 다음 작업: 공지 기반 후보 수집 + 사람 검토 입력을 도입할지 정한 뒤 표본 대조/허용 조건을 확인한다.
확정되면 별도 작업에서 RSS→후보 저장까지만 작은 단위로 구현하고 publish 단계와 구분한다.
키를 준비한 실제 출처 최소 응답 확인, 계약 독립 검토/evidence v2·runner 확장은 병행 가능하다.
제품 정책/계약/정식 검증 상태는 바꾸지 않았다. LEARN-0007은 조사에서 확인한 입력 위험을 연결한다.

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
