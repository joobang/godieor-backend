# DATA-35 · Netflix KR 공식 목록을 검토 후보로 연결

- Requirement: P05(한국 OTT 시즌별 최초 공개만 게시), P07(알려진 일정), P11(커밋), DATA-26(StreamPick 누락 대조).
- 상태: 구현·작성자 자체검사 완료 / 검토 및 실제 게시 대기.
- 담당: backend 구현 세션, 2026-11-12.
- 기준: app `10bbb249`, backend `4e6b107`, verifier `62e137b`; backend branch `codex/app-auth-phone-ready`.
- 변경 범위: `candidate.ts`의 optional 작품별 식별자, 공식 넷플릭스 라인업 검토 큐 import 스크립트 및 회귀 검사. API 계약·마이그레이션·acceptance 변경 없음.
- 기존 dirty 파일: `.env.example`, `package.json`, `docs/system/status.md`, `docs/system/handoff.md`, 기존 미추적 감사 스크립트/검사는 별도 작업으로 보존.

## 근거·실패 조건

Netflix KR 공식 목록 75행은 동일한 `about.netflix.com/ko/new-to-watch` 출처 URL을 공유한다. 기존 `source + URL` 후보 ID를 그대로 이용하면 작품 75행을 한 개로 병합하므로, 출처 URL과 공식 Netflix videoID를 조합한 추가 ID를 사용한다. 기존 기사 기반 후보 ID는 그대로 유지한다. 공식 목록 날짜는 플랫폼 신규 등록일 단서일 수 있으므로 기사 게시 시각이나 한국 플랫폼 **최초 공개 확정**으로 승격하지 않는다.

실패 사례: 같은 videoID 두 행, 허용되지 않은 출처 도메인, 같은 원본 재실행 중복, 변경된 근거를 이전 검토로 게시, 동일 제목의 서로 다른 시즌 합침, 기존 검토된 기사 후보 손실.

## 실행·결과

| 실행 | 결과 |
| --- | --- |
| `npm test` 기본 샌드박스 | `dist` unlink `EPERM`으로 빌드 이전 실패. 코드 판정 아님 |
| `npm test` 허용된 실행 | exit 0, 전체 125/125 성공 |
| `node scripts/bridge-netflix-lineup.mjs data/lineups/netflix-kr-2026-11-12-auto.json` | 원본 75, 생성 75, 기존 포함 후보 173, 검토대기 75, DB 게시 0 |
| 같은 명령 재실행 | 생성 0, 변경 0, 동일 75, 총 173, 게시 0 |

독립 검증·DB 게시·Render/Supabase 반영·iPhone 확인 미실행. 75개를 공식 출시 확정으로 표시하지 않는다. StreamPick 11~12월 대상 신작 15건과 로컬 최종 게시 9건의 날짜/플랫폼 일치율은 이번 작업으로 변경됐다고 주장할 수 없다. 후속으로 173개 후보 중 공식 한국 첫 공개 근거를 작품·시즌별 검토해 mapping/publish하고, TVING·Disney+·Coupang Play 후보도 동일 원칙으로 정규화 연결한다.

## 인계

- app/backend/verifier HEAD, 계약/migration digest는 독립 검증 요청 시 다시 고정하여 기록한다.
- verifier acceptance 자체 승인 없음. 관련 LEARN-ID: 해당 없음(후보 식별 기능 변경과 자체 회귀검사만 기록).
- 기존 `.env` 계열 및 다른 미커밋 상태를 임의로 변경하거나 커밋하지 않는다.
