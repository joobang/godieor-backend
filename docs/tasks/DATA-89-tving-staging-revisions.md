# DATA-89 · TVING 공식 공개예정 후보 변경 이력 안정화

- 요구사항 PROD-005/006/007/009. 검증 기준은 verifier 원본을 참조하며 변경하지 않는다.
- 상태 완료. 담당 작업 브랜치 `codex/tving-staging-stability-20261118`, 별도 worktree `/private/tmp/godieor-tving-staging-20261118`.
- 기준 `origin/dev` f479eb9. 앱과 verifier의 승인 판정 및 작업 트리는 변경하지 않았다.
- 범위는 `bridge-tving-upcoming.mjs` 후보 revision 해시 계산과 회귀 검사다.

## 문제와 결정

TVING 공식 공개예정 홈에서 작품 카드의 순서는 매일 바뀔 수 있다. 기존 후보의 `sourceItem`은 순서 번호인데, 이 값까지 내용 해시에 포함하므로 순서만 바뀐 수집에서 새 증거 revision이 생성됐다. 변경 이력에 실제 공개 주장 변경과 화면 정렬 변경이 섞이는 문제다.

해시는 작품 URL, 공식 날짜 주장, 시즌, TMDB 식별 단서, 검토 상태를 포함한 실제 근거로 유지하고 `sourceItem`만 제외한다. 후보의 근거 본문과 검토/게시 게이트는 그대로 유지한다. 기존 저장 해시로부터 변경되는 첫 수집에서는 1회 revision이 생길 수 있으며 이후 재배치에는 추가되지 않는다. 기존 검토/게시된 후보는 원래의 수정 방지 경계를 계속 사용한다.

## 검증

- 가상 TVING 두 작품 순서 교체 시 `revised=0`, 둘 다 revision 1개 유지. 날짜 변경 시 `revised=1` 확인.
- `prisma generate`·`tsc -p tsconfig.json` 성공, 관련 테스트 3/3 통과.
- 전체 `node --test tests/*.test.cjs tests/*.test.mjs` 361/361 통과 (로컬 HTTP 포트 바인딩 허용 실행). 기본 sandbox 최초 실행은 EPERM 1건이었다.
- 실제 TVING 원천 재수집이나 제품 PostgreSQL 게시, GitHub CI, 독립 통합 검증은 수행하지 않았다.
- 변경된 API 계약·migration은 없다. LEARN-0021 기존 공식 원천/검토 원칙을 그대로 사용하며 새로운 해설 항목은 필요하지 않다.

## 다음 작업

공식 한국 첫 공개를 명시하는 근거가 있는 TVING 새 작품/시즌을 실제 수집해 식별·첫날 검토→DB/API 자동 게시 경로로 확장한다. 날짜만 있는 공개예정 주장으로 최초 공개를 추론하지 않는다.
