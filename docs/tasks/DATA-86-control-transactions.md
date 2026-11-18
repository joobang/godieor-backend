# DATA-86 · 수집 제어 트랜잭션 한도와 실패 위치 보완

- 요구: PROD-009/GD-009(실수집·부족/실패 표시), PROD-010/GD-010(비밀 미노출). acceptance 원본 verifier, 미승인 draft; 기준/판정 변경 안 함.
- 상태: 로컬 구현·검증 완료, 원격 재실행 인계. 담당 codex-control-tx, 담당 해제. 원본 이 카드, 종료 시 담당 해제.
- backend base67737c0ac38be7fd1d2453f981c561216a8b733b main clean, app base879e4471e00795000df611556d6d3a6daf7f955a clean, verifier base6eef0af57735c1657c6007cdcefb26507bea5cc6 clean.
- 작업: codex/collection-control-transactions, /private/tmp/godieor-control-tx-fix. 다른 checkout 동시수정 없음. 사용자 수정·검증·push 명시 요청.
- 관측: run44216042056의 사용자 첨부에 collect-daily bootstrap DB_TRANSACTION_FAILED/P2028. 기본제한이 남은 register/beginRun/failRun을 코드에서 확인. P2028은 넓은 트랜잭션 오류이므로 정확한 발생 지점/시간 초과를 과거 로그만으로 확정하지 않음.
- 범위: 수집 repository의 네 트랜잭션에 명시적 timeout/maxWait와 안전한 phase. 제어작업 기본60초(설정가능), 게시 한도 기존 유지. 원자적 commit/rollback, ID/이력·계약/migration 불변.
- 예상 실패: 초기등록5초초과, 제어작업도 한도초과, 연결획득 지연, 실패기록 오류가 원래 실패를 가림, phase가 subprocess/일일runner에서 유실, 비밀 원문 노출.
- 완료조건: 네 경로 옵션·오류위치·실패전파 회귀, 실제 임시PostgreSQL의5초초과 및 rollback 검사, 전체검사, 별도컨텍스트리뷰, 커밋·push 원격SHA확인.
- 학습 LEARN-0022 본문 수정. 독립 통합runner/제품PASS·실운영 DB재수집을 로컬검사로 대체하지 않음.

## 실제 구현·검사

- 네 repository 트랜잭션은 같은 래퍼를 사용한다. register/beginRun/failRun 기본60초, 환경변수 COLLECTION_CONTROL_TIMEOUT_MS=10000~300000ms 허용. publish는 기존30초/IGDB180초·CI900000ms 유지. 네 경로 maxWait10000ms. 원자적scope 게시/ID/변경이력 처리 코드 불변.
- 오류 원문 대신 허용코드/causeCode/phase만 새예외로 전달. phase는 고정목록만 허용. bootstrap오류도 일일runner가 stderr원문 대신 안전한JSON diagnostic으로 보존. 실패를성공으로변경하지않음.
- 왜 별도제어작업한도인가: 게시의15분을모든작업에일괄주면 초기등록/기록실패대기도길어진다. 제어경로는60초로제한하고 원격왕복시간에대비한다. maxWait는연결획득대기이며 실행timeout과분리. 긴게시/풀고갈·DB서버자체한도를해결했다고주장하지않음. ADR별도추가없음, 운영경계선택근거를이카드·LEARN0022본문에기록.

| 실제 명령 | 결과 |
|---|---|
| 합성DATABASE_URL, 공식Node24.22.3 `npm run build` | exit0 |
| 공식Node24.22.3 `npm test` (임시localhost허용) | exit0, 357/357, skip0. 로그 /private/tmp/godieor-data86-full.log |
| `node scripts/check-control-transactions-db.cjs` | exit0, 기존기본5초P2028재현, 수정네경로5.3초지연commit, 10초한도에10.3초지연시provider/scope/catalog revision전체rollback |
| Ruby YAML.load_file 및 control환경변수검사 | exit0, 60000값확인 |
| 별도컨텍스트리뷰 | 추가finding없음, 관련27/27·tsc noEmit·DB스크립트문법·diff공백검사통과 |
| `git diff --check` | exit0 |

임시DB는 `postgres:16-alpine@sha256:aa6cb33cf4c19c765cefcf48d96176258800870a9a1e930ad126200f9d825139` 고정digest·임의container명·tmpfs·127.0.0.1임시port·임의password 사용. .env를읽지않고임시연결만직접생성, 종료시container제거. compose기본digest와다르지만이검사자체이미지는위digest로고정. 전체테스트기존스냅샷2개는원본backend work에서별도worktree work로복사, Git추적fixture생성하지않음.

## 인계 binding·범위

- app base879e4471e00795000df611556d6d3a6daf7f955a, backend base67737c0ac38be7fd1d2453f981c561216a8b733b, verifier base6eef0af57735c1657c6007cdcefb26507bea5cc6. 각head는이카드포함커밋후Git이력/원격refs에서확인. 각별도worktree의codex/collection-control-transactions.
- backend-only검사. 계약0.1.0-draft.5 manifestSHA256 04cfea7456d83ca141ba64c6d6568365b00cbdf2d5e95eacd8c4dad7249a0f2e. migration집합SHA256 83a824f7b4e40d844331ee6660361da4a309c1170cce5e5f688cd75c3f3a227f (정렬상대경로+NUL+내용+NUL). 기준acceptanceSHA256 c4906283810c8b378800b67930028685a41b6a051923ea9f9415346b2d657063, 미승인draft. 모두변경없음.
- 실제운영DB/원천수집/원격workflow실행, iOS빌드·독립통합runner 미실행. 별도코드리뷰는판정승인/OS격리/제품PASS가아님.
- 다음: 사용자명시요청범위의commit·push후원격SHA확인→Actions 새Run workflow/main/backfill. 기존Re-run은옛코드이므로사용하지않음. Secret추가불필요. 실제실패시새phase/소요시간으로원인구분. 새실행성공전운영복구완료로표현하지않음.
- 원본학습 LEARN0022 `verifier/docs/learning/entries/0022-safe-collection-diagnostics.md` 본문에 경계누락·두시간제한·실제합성지연실험/선택비용을설명. 공통status/handoff앱원본동일revision동기화.
