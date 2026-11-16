# DATA-57 · StreamPick 대비 TMDB 발견/게시 격차 역분석

- Requirement: OTT KR 신규 작품·시즌의 독립 발견과 증거 기반 게시. 현재 작업은 발견 및 진단 단계이며 독립 검증/게시 승인은 아님.
- 기준: app `docs/product.md`, `docs/system/status.md`, `docs/system/handoff.md`; backend HEAD 시작 `2c7e770540f84f49b87b8104cafca2a925d2a3d5`, branch `codex/ott-animation-support`. 사용자 기존 dirty `.env.example`, `package.json` 및 다른 미추적 감사 도구 보존.
- 실패 사례: KR TMDB watch-provider가 없는 해외 시즌을 누락; 시리즈 전체 제공처를 신규 시즌의 KR 최초 공개 증거로 오해; 시즌 상세/첫 회 날짜가 없는데 현재 달력에 기입; 500페이지 또는 요청 실패를 전체 검색 완료로 보고.

## 재현·결론

기존 `data56/case-matrix.json` 52개 비교행을 과거 `data53/2026-11-16/candidate-recall.json`에 매칭하는 **읽기 전용** 역감사 도구 `scripts/audit-tmdb-parity-causes.mjs`를 추가했다. StreamPick 행은 이 평가에만 사용하고 TMDB 발견/적재 입력에 전달하지 않는다.

| 분류 | 행 |
|---|---:|
| 이미 날짜·플랫폼까지 일치 게시 | 26 |
| 이미 게시됐으나 비교 날짜 불일치 | 2 |
| TMDB 시즌/영화 provider 단서만 있음 | 7 |
| TMDB 시리즈 provider 단서만 있음 | 14 |
| 목표 플랫폼 TMDB 미확인 | 1 |
| 시즌 후보 자체를 TMDB 조회에서 미발견 | 2 |

총 52행, 과거 후보 플랫폼·날짜 발견 49행이다. **49는 게시 가능한 행이 아니다.** 한국 OTT의 실제 최초 공개일을 공식 근거로 확인하기 전에는 게시하지 않는다. 미발견 시즌 2개도 기존 TMDB 데이터에 존재한다거나 새 발견 경로로 회수됐다고 주장할 수 없다.

## 변경

- `discoverByDate`에 opt-in `includeUnmappedAiring` 경로 추가. 한국 제공처 필터 없이 세계 TV 방영일을 월 단위 탐색한다. 제공 OTT는 지정하지 않고 경로 및 페이지 누락/오류를 coverage에 기록한다.
- `collectReleaseCandidates`에서 해당 경로를 기본 사용하고 후보 발견 경로를 보존한다. 기존 공식 근거/날짜 충돌/게시 차단 규칙은 유지한다.
- 독립 역감사 CLI 및 가상 사례 테스트 추가.

## 실행 확인

- Node 24.22.3: `node --test tests/tmdb-date-discovery.test.mjs tests/tmdb-release-candidates.test.mjs tests/tmdb-parity-causes.test.mjs` → 30/30 통과.
- Node 24.22.3: `node --test tests/*.test.mjs` → 154/154 통과(이 명령은 `.test.mjs` 파일만 포함).
- Node 24.22.3: `node --test tests/*.test.cjs tests/*.test.mjs` → 220 중 219 통과, HTTP 경계 검사 1개는 로컬 `127.0.0.1` listen `EPERM`으로 실패(테스트 주장 위반 여부 미판정).
- `npm test` → `clean-dist`의 기존 `dist/src/app.module.js` 삭제 `EPERM`으로 빌드 전 중단. 실행 진입 Node는 20.20.2였음.
- `node scripts/audit-tmdb-parity-causes.mjs docs/tasks/evidence/data56/case-matrix.json docs/tasks/evidence/data53/2026-11-16/candidate-recall.json /private/tmp/godieor-parity-causes-20261116.json` → 종료 0, 위 52행 집계.
- 새로운 글로벌 TMDB 실네트워크 전수 수집/DB 게시/API 검증/독립 verifier는 미실행. 따라서 실후보 증가·누락 해소·DB건수 증가 0건으로 **확인된 것이 아니며**, 신규 실측이 없다.

## 인계

- 이어서 별도 임시 결과 폴더에서 실제 TMDB 독립 월별 수집을 재실행하고 coverage의 truncated/error 및 시즌 2건 회수 여부를 재측정한다.
- 목표 플랫폼/시즌 최초일 공식 자료 연결을 강화한 뒤 review→DB publish→기간 API/비교행 재집계를 수행한다. StreamPick만을 근거로 자동 게시하지 않는다.
- API 계약, migration, verifier acceptance/verdict 변경 없음. ADR 추가 없음(기존 TMDB 후보/공식 검증 경계 유지). LEARN-0011/0021에서 후보 발견과 게시 증거 구분 유지.
