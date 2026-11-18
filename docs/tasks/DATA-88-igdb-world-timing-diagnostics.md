# DATA-88 · IGDB WORLD 수집·게시 시간 진단

- 요구 PROD-009/GD-009, PROD-010/GD-010. 기존 승인 기준은 verifier `requirements/acceptance.yaml` 원본을 따른다.
- 상태: 구현·자체 테스트 완료, 원격 실측 및 독립 검증 대기.
- 담당: `codex/igdb-world-backfill-20261118`, 별도 worktree `/private/tmp/godieor-igdb-world-20261118`.
- 기준 backend `origin/dev` `f479eb94f35f573b13b0fcdaef331892bcc3e2b7`. 앱·verifier 구현 변경 없음.
- 사용자 요청: dev 기반 새 브랜치, 작업·검증 후 dev 대상 PR. 데이터 적재 후속 단계의 진단 범위.

## 문제·범위·예상 실패

기존 원격 백필에서 IGDB WORLD `P2028`이 관찰되었다. 이전 출력에는 수집 건수, fetch와 publish의 단계별 소요 시간이 없어 병목 위치를 정량적으로 알 수 없었다. 해당 실패의 실제 원인과 소요 시간은 아직 확정하지 않았다.

- 수집 단계 `fetchMs`, 원자적 게시 호출 `publishMs`, 게시 입력 건수 `recordCount`를 각 scope 결과에 남긴다. `fetch`와 `publish`가 실패한 경우에도 이미 측정한 값은 보존한다.
- 일일 runner는 허용 목록에 있는 비음수 정수 필드만 전달한다. DB 예외 원문·URL·비밀·임의 자식 출력은 복사하지 않는다.
- 기존 provider/시장 선택, 잠금, 트랜잭션, 이벤트·찜 ID, 계약·마이그레이션은 유지한다.
- 예상 실패: fetch 실패 시 소요 시간 누락, publish 실패 시 입력 건수 누락, 자식 출력에 음수나 임의 필드가 섞여 상위 보고서에 노출, 일부 scope 실패 후 다른 scope가 중단됨.

## 구현·자체 검증

| 실제 명령 | 결과 | 범위 |
|---|---|---|
| Node22 `npm ci --offline --ignore-scripts` (engine strict 임시 해제) | 성공 | 분리 worktree 로컬 의존성 |
| Node22 `npm run build`, 격리된 Prisma 캐시 및 합성 DATABASE_URL | 성공 | Prisma client·TypeScript |
| Node22 `node --test tests/collection-diagnostics.test.cjs tests/provider-daily.test.mjs` | 19/19 | fetch 실패, publish P2028, 출력 허용 목록, 격리 |
| Node22 전체 `node --test tests/*.test.cjs tests/*.test.mjs` (기본 sandbox) | 354/355 | localhost HTTP 바인딩 EPERM 1건 |
| Node22 `node --test tests/architecture.test.cjs` (localhost 허용) | 8/8 (하위 테스트 포함) | HTTP 포트 바인딩 허용 후 통과 |
| Node22 전체 `node --test tests/*.test.cjs tests/*.test.mjs` (localhost 허용) | 361/361 | 전체 자체 회귀 통과 |

현재 worktree에서 확인된 Node는 22.23.4이다. 저장소 요구 버전은 24.22.3 이상이므로 Node24 CI 결과를 별도로 확인해야 한다. 합성 오류 테스트는 원격 WORLD 원인 재현이나 운영 적재 증거로 해석하지 않는다.

## 독립 검증·인계

- 범위 backend-only. 앱 계약·DB migration 및 verifier acceptance 변경 없음.
- 본 작업은 계측만 변경한다. WORLD 실제 재수집·Supabase DB 게시·운영 백필·독립 runner 검증은 수행하지 않았다.
- 다음은 dev 대상 PR에서 Node24 CI 검증 후, 승인된 운영 실행에서 WORLD의 `fetchMs`, `publishMs`, `recordCount`, `phase`, `causeCode`를 확인하고 원인을 좁히는 것이다.
- 학습 `LEARN-0022`의 수집 장애 진단 사례에 연결. 원인 확정 전 학습 해설 갱신은 보류한다. ADR은 필요하지 않은 계측 변경이다.
