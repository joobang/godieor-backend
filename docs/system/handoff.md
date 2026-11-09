# 계정·모델 사이에서 작업 이어받기

revision: `CONTEXT-2026-11-10-04`. 원본 app `docs/system/`, backend/verifier에는 동일 사본.
공통 문서는 `SYNC-2026-11-09-18`이다. APP-01 통합 및 독립 검증 대기 상태를 반영했고 OTT 날짜 정책/API 스키마는 유지한다. 별도 맥락 저장소·DB·서버 없이 기존 문서를 사용한다.

APP-01G 인계 기준: app `f36adb748b3a452db105475ffbcae5abe8d3d02f`, backend `85ea4f3398d949e4f59313232306c3325956b7a6`, verifier `109f918799d6c818ae30ba5af4a5cedb112573e8`. API `0.1.0-draft.2`, contract manifest SHA-256 `8dfc69a8c6a5f9feb91f2d0cf6d661eec16a1aacb8e980b7abe880cd0b1f3b1e`, migration SHA-256 `29ef8ef0d520f44b6a633e8f017144a3e2b2199189461a88ba99bc296c42f5b9`. acceptance 초안, verifier evidence v1 앱 전용으로 통합 PASS 없음. UI 조작 미확인 범위는 app `docs/ai/tasks/APP-01-finalize.md` 참조. 문서 변경 커밋 이후 HEAD는 Git으로 확인한다.

## 시작

1. 역할(설계/구현, 독립 검토)을 확인하고 작업 저장소 `AGENTS.md`를 읽는다.
2. 구현 세션은 `status.md`와 정책/작업 원본을 읽고 각 저장소의 HEAD·branch·dirty 상태를 확인한다.
   디스크 파일이 웹 전달본/기준 SHA와 다르면 차이를 확인하고 오래된 전달본의 상태를 그대로 적용하지 않는다.
3. 현재 작업 카드와 사용자 요청을 확인한다. 관련 없는 선행 작업을 다시 구현하거나 미정 정책을 승인하지 않는다.
4. 코드/문서 수정 전 작업 카드를 만들거나 이어받는다. 작업 ID, requirement ID(없으면 이유), 담당 세션의 식별명,
   상태, 기준 SHA, 작업 브랜치/worktree, 수정 범위, 완료 조건, 예상 실패 사례를 적는다.
   개인 이메일/토큰 대신 `codex-context-01` 같은 임의 세션 이름을 쓴다.

작업 카드 원본은 작업 저장소 `docs/tasks/` 또는 app의 기존 `docs/ai/tasks/`에 둔다.
상태 문서는 카드 위치를 연결한다. 같은 기록을 세 저장소에 복제하지 않는다.

## 계정 전환과 동시 수정

- 순차 전환: 이전 세션이 카드에 중단 위치·미커밋 파일·다음 행동·실행/미실행 검사를 남기고 담당을 해제한다.
  다음 세션은 Git 상태와 비교한 뒤 담당을 인계받는다. 기존 변경을 임의 reset/stash/덮어쓰기 하지 않는다.
- 동시 개발: 서로 다른 작업과 `codex/` 브랜치, 별도 worktree를 사용한다. 동일 checkout에서 동시에 수정하지 않는다.
  카드에 같은 파일/계약 변경이 겹치면 구현을 나누거나 순차 진행하고, 통합 시 변경과 검사를 다시 확인한다.
- 공통 `status.md`, 정책/계약은 한 세션이 통합한다. 다른 세션은 자기 카드에 변경 제안을 기록한다.
  카드의 담당 표시는 잠금 장치가 아니다. 작업 시작 전 실제 실행 중인 세션과 파일 변경을 확인한다.
- 다른 장치에서는 로컬 미커밋 파일이 전달되지 않는다. 사용자 요청 범위의 push/pull 또는 파일 전달 후 SHA를 확인한다.

## 종료·중단

1. 카드에 실제 변경, 사용자 확정/구현 제안, 실제 명령·결과, 미실행 검사·남은 문제를 기록한다.
2. 정책/ADR/학습 기록은 해당 원본을 갱신하고 연결한다. 가설·예방 설계·실제 실패를 구분한다.
3. `status.md`의 현재 상태·작업 목록·다음 행동을 갱신하고 status/handoff 사본을 함께 동기화한다.
   제품 정책을 바꾸면 기존 architecture/plan/policies도 동일 SYNC revision으로 갱신한다.
4. README·로드맵의 현재 상태 요약이 원본과 충돌하지 않는지 확인한다.
5. 검토 가능한 단위로 영문 타입 + 한글 설명의 커밋을 만든다(`docs: 인계 문서 갱신` 등). 자기 커밋 SHA를 같은 커밋 안에 넣으려 하지 말고,
   최종 SHA는 Git 이력과 커밋 후 생성하는 웹 전달본에서 확인한다. 담당을 해제하고 다음 행동을 남긴다.

## 커밋 메시지 형식

`type(scope): 한글 설명`으로 쓴다. scope는 선택이다. 타입은 `feat`, `fix`, `docs`, `chore`, `test`,
`refactor`, `build`, `ci`, `perf`, `revert` 등 영어로 쓰고 변경 설명은 한글로 적는다.
기능 추가는 `feat: 월간 달력 추가`, 문서 수정은 `docs: 커밋 규칙 보완`, 검사는 `test: 날짜 경계 검사 추가`처럼 쓴다.
기존 커밋은 재작성하지 않는다. 이 규칙은 commit 권한을 push·배포 권한으로 확대하지 않는다.

## ChatGPT 웹에 전달

세 저장소를 같은 상위 디렉터리에 둔 상태에서 app에서 실행한다. Python 3.9 이상, 외부 패키지 불필요.

```sh
python3 scripts/export-context.py
python3 scripts/export-context.py --check
```

생성물은 app `work/context/chatgpt-context.md`다(Git 제외). 커밋 후 생성하고 `--check`로 최신 여부를 확인한 뒤
ChatGPT 웹 대화/프로젝트에 업로드한다. 기본 형제 경로가 다르면 `--backend /경로 --verifier /경로`를 사용한다.
명시한 공개 문서 목록과 작업 카드 디렉터리(app `docs/ai/tasks/`, backend/verifier `docs/tasks/`),
backend ADR 디렉터리 `docs/decisions/`의 바로 아래 `.md` 파일만 합친다. 새 카드는 다음 생성에 자동 포함된다.
필수 파일 하나라도 없거나 공통 사본이 다르면 생성에 실패한다.
각 출처의 SHA-256과 세 저장소 HEAD·branch·dirty 상태, UTC 생성 시각을 포함한다.
제품 실행 여부·승인 여부를 검사하는 도구는 아니다. 키·대화 원문·.env·실행 로그는 수집하지 않는다.

웹에서 다음과 같이 요청한다.

> 첨부 문서의 생성 시각·커밋·dirty 상태를 확인하고 현재 상태부터 읽어라.
> 포함된 문서만 읽었다고 말하고 미포함 링크를 읽었다고 가정하지 마라.
> 사용자 확정·기술 제안·미정·작성자 실행·독립 검증을 구분해 논의해라.
> 코드가 없는 전달본만으로 구현 정확성이나 검증 PASS를 선언하지 마라.

웹 대화는 로컬 파일을 자동 갱신하지 않는다. 웹에서 합의한 변경은 관련 작업 카드에
날짜·제안/사용자 확정 여부·이유·적용할 원본 위치를 남겨 Codex에 전달한다.
Codex는 현재 파일/정책과 대조해 반영하고 새 전달본을 생성한다. 예전 파일을 함께 업로드했다면 최신본을 명확히 지정한다.
전체 대화 원문 보관은 필수가 아니다. 작업에 영향을 준 결정·반례·미해결 질문을 남긴다.

## 독립 검토 예외

독립 reviewer에게 구현용 웹 전달본·구현 대화·작성자 학습 해설을 주입하지 않는다.
기존 verifier 절차에 따라 요구사항/기준, 고정 app/backend SHA, 계약/migration digest,
변경 사실과 공식 근거를 제공한다. 현재 상태 문서는 검증 가능 범위/원본 위치 확인용이고 결과의 정답이 아니다.
구현 담당이 기록을 공유했다는 이유로 acceptance나 verdict를 승인할 수는 없다.

## APP-01H 후속 인계

앱 구현4dbb8d1(브랜치 codex/app-01-review-fixes), backend 코드85ea4f3 및 기존 계약/migration 조합. 작성자 UI 탐색 확인과 독립 정적 리뷰 수정 기록은 status.md 최신 절/APP-01H 카드 참조. 다음 VFY-01 관찰점 점검→VFY-02 evidence v2이며 기준 승인·통합 PASS는 별도다.

## VFY-02 인계

verifier d15601e에서 v1/v2 지원. 통합runner는 --require-schema-version 2 필수. 실제 파일 수집/snapshot/실행 진위는 아직 후속 VFY-03/04이며 input hash 일치만으로 통합PASS를 주장하지 않는다. 새 작업은 status.md의 VFY-01/02 최신절과 verifier/docs/evidence-v2.md부터 확인한다.

## 다음 계정 재개 요청 (사용자 중단 지점)

> 세 저장소 AGENTS와 app/docs/system/status.md의 최우선 중단·인계 절, handoff.md, verifier/docs/tasks/VFY-03-04-runner.md 및 docs/runner.md를 읽어라. 각 저장소 HEAD/branch/dirty를 확인하고 동시수정 여부를 확인해라. VFY-03/04는 초기구현이며 실제 iOS sandbox 빌드가 exit65이고 setsid후손수명P5가 open이다. 먼저 현재상태와 다음재현단계를 설명하고 사용자의 재개요청에 따라 진행해라. 62개 자기검사/백엔드 부분실행을 제품통합PASS로 표현하지 말고 acceptance승인상태를 바꾸지 마라. 원본실행로그는 verifier/work/handoff/godieor-vfy-run-391f70fd에 있다.

로컬동일Mac에서는 현재브랜치/파일로 이어간다. 원격push는 하지 않았으므로 다른장치는 로컬미푸시커밋/무시된산출물이 자동전달되지 않는다. 웹에는 커밋후 재생성한 app/work/context/chatgpt-context.md를 전달한다. 전체대화기억이 아니라 확정·실행·미해결·다음명령을 인계하는 구조다.

## 2026-11-10 Foundation 진단 인계

공통 status 최신 절과 verifier/docs/tasks/VFY-03-foundation-diagnostics.md를 우선 확인한다. 제한 실행 `scripts/probe-foundation-atomic --sandbox NEW_DIR`은 runner profile·로그·결과를 저장한다. 일반 실행 성공과 atomic=false/exit2를 실제 비교했다. 전용 UID/VM 마련 및 Xcode/P5 게이트가 다음이며 도구 구현 완료를 격리 또는 제품 PASS로 해석하지 않는다. 담당 해제, 분리 컨텍스트 리뷰 대기.

## P5 실제 후손 수명 재현 후속 (2026-11-10)

verifier `docs/tasks/VFY-03-lifetime-probe.md` 원본. `scripts/probe-process-lifetime` 추가:
고정 합성 자식은 자체 기한/alarm으로 종료하며 정상/timeout의 실제 runner 제한 프로필에서
일반 자식 heartbeat 정지, setsid 자식 갱신 지속을 관찰했다. 74개 자체검사 통과.
실행 결과·프로필·로그 보존, isolation_verified/cleanup_verified=false 유지. 독립 리뷰 대기, 담당 해제.

이 Mac에는 전용 실행 계정·tart/prlctl/vfkit가 없고 sudo는 관리자 인증 필요.
사용자에게 용어 설명 후 지금 환경을 선택할 필요 없다고 안내했다. 계정/VM 선택 미정,
설치·계정 생성·Xcode 재빌드는 하지 않았다. 환경 준비와 제품 기능 개발은 별도 작업이며,
P5·Xcode 실행 경계 및 전체 통합 검증은 계속 미완료다. 통합 PASS 없음.

## 전용 macOS 계정 방식 확정 (2026-11-10)

사용자가 전용 계정 방식을 선택했다. 앞 절의 환경 선택 미정은 당시 상태다.
기존 개발 계정에서 iPhone 서명·설치, 새 표준 계정에서 서명 없는 자동검증 빌드로 역할을 나눈다.
P10 및 architecture/plan을 SYNC-2026-11-10-01로 갱신했다. 계정 생성은 관리자 인증 필요·미실행.
원본 verifier/docs/tasks/VFY-03-dedicated-account.md 및 docs/dedicated-account-setup.md.
다음은 실제 계정 준비와 최소 staging 전달 후 실환경 게이트 검사다. 담당 해제.
Apple ID/인증서/개인 키체인 공유 없음, P5·격리 입증 미완료/통합 PASS 없음 유지.

## 전용 계정 생성 확인 · 2026-11-10

사용자가 GODIEOR Build(`godieorbuild`) 표준 계정을 생성했다. UID502/GID20,
HOME /Users/godieorbuild, 관리자 그룹 비회원 확인. 앞 절의 계정 미생성은 당시 상태다.
현재 기존 개발 계정 UID501에서 작업 중이며 실제 UID502 검사 실행은 아직 인증 대기다.
고정 입력/진단 staging /Users/Shared/godieor-account-check-4b8fe0c2 준비.
원본 카드 verifier/docs/tasks/VFY-03-dedicated-account.md. 개인 HOME 권한은 변경하지 않았다.
계정 분리만으로 원본·비밀 접근 차단을 보장하지 않으며 사전점검→실제 파일 경계→Foundation/Xcode와
후손 수명 검사는 별도다. P5·격리 검증 미완료, 통합 PASS 없음.
