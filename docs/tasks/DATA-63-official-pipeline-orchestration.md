# DATA-63 · 공식 OTT/TMDB 수집·검토·DB 게시 파이프라인 실행 경계

- **요구사항**: 한국 OTT 공식 일정 → TMDB 작품·시즌 식별 → 한국 플랫폼의 *시즌 최초 공개* 증거 → 검토 완료된 DB 게시 → StreamPick 첫날 52건 감사. 일반 2회 이후 회차는 제외한다. StreamPick은 출처나 날짜 확정 입력으로 사용하지 않는다.
- **상태**: 구현 및 자체 검사 완료, 전체 자동 신규 게시/참조 동등성 미달. 사용자 목표는 아직 완료되지 않았다.
- **범위/브랜치**: backend `codex/ott-animation-support`, 기존 커밋 `405deee`에서 시작. app `f860c02`, verifier `49238b6`. app 개인 iOS signing dirty 및 backend 기존 dirty를 유지한다.
- **예상 실패**: 검토한 공식 후보를 반복 크롤링하면서 review revision을 덮어쓰기; TMDB 공급처 누락으로 수집 CLI가 2를 반환해 전체 기존 게시 중단; TVING 일부 소스 요청 실패 시 부분 보고서를 staging; StreamPick 감사 2를 DB 게시 실패로 잘못 표현.

## 구현과 실제 관찰

- Netflix 공식 2026년 11~12월 최근 수집 78항목은 78 unchanged, 50 reviewed preservation, 새 게시 0. 기존 후보 190, 현재 리뷰 70, 매핑 70으로 보존됨.
- `scripts/bridge-netflix-lineup.mjs`는 재관측으로 기존 review revision이 무효화되지 않게 수정. `scripts/collect-tmdb-release-candidates.mjs`는 TMDB 원방영일과 한국 OTT 공식 날짜의 차이를 보존하며, 상충하는 공식 날짜는 차단.
- `scripts/run-official-ott-pipeline.mjs`에서 공식 Netflix 수집/후보 → TMDB 발견/공식 binding 최신화 → 공식 TVING 예정작 → 후보 → 기존 검토 매핑 게시 → 52행 감사 순서를 연결. TMDB/TVING 수집 CLI의 `exit 2`는 커버리지 미완료로 기록해 다음 단계에 전달한다. TVING 불완전 보고서는 staging하지 않는다. 기존 검토 완료 매핑은 수집 범위 미완료 시에도 게시한다. 감사의 parity 실패를 데이터로 남기고 실행 결과 상태도 미완성으로 기록한다.
- `scripts/audit-current-first-premieres.mjs`는 현재 52행 참조와 실제 로컬 DB를 별칭/명시 TMDB 정체성으로 비교한다. **2026-11-16 실제 실행** 정확 26, 공인 공식 날짜와 다른 참조 2, 미게시 24. 현재 reviewed 70건 모두 매핑되어 있고 신규 검토 완료·매핑 누락 후보는 0. 새 작품을 자동으로 확정·검토하여 매핑하는 단계는 아직 없다.
- `scripts/complete-reviewed-mappings.mjs`는 신규 검토 완료 후보가 나타나면 기존 게시 매핑과 중복되는지 검사한 뒤 키를 할당한다. 이번 실행은 `added: 0`, `total: 70`이었다.
- 공식 TVING 예정 밴드가 P(프로그램) 외 M(영화) 코드도 포함하도록 바뀌어 최초 실행이 실패했다. 수집 파서·후보 URL 검증을 확장하여 현재 공식 11건(프로그램9·영화2)을 **오류 없이 수집·후보 저장**했다. 영화 상세의 연도 없는 `11월 19일 공개`는 날짜 미확정으로 보관한다. 신규 후보 2건, 리뷰 보존 4건, 새 게시 0건.
- **실시간 통합 완주**: `node scripts/run-official-ott-pipeline.mjs --reuse-recent-tmdb`는 Netflix 78건(전체 81 / 5페이지), TVING 11건, TMDB 최근 스냅샷 1215행/준비49행을 검토하고 DB `published:70`으로 종료했다. DB 감사 정확26/52, 날짜차이2, 미게시24. 최종 exit 2는 기능 오류가 아닌 **참조 동등성 미달**이다. TMDB 공급처 커버리지 `discoveryComplete:false`라 전체 자동 수집 완성으로 주장하지 않는다.

## 자체 검사

| 실행 | 결과 |
| --- | --- |
| `node --test tests/*.test.mjs` | 178/178 PASS (working tree) |
| `node24 --env-file=.env scripts/audit-current-first-premieres.mjs` | 기존 52행 기준 정확26 / 날짜차이2 / 미게시24, 의도한 parity exit 2 |
| `node24 --env-file=.env dist/src/cli/publish-reviewed.js --file data/curated/ott-reviewed-mappings.json` | 이번 턴 이전 실제 로컬 DB 70 매핑 재게시 성공, 신규 증가 0 |
| 공식 TMDB fresh collector | 기존 최근 스냅샷 재사용(실행 당시 26분 경과). 별도 신규 수집 완료로 표현하지 않음 |
| `node scripts/run-official-ott-pipeline.mjs --reuse-recent-tmdb` | 실제 OTT 수집→후보→매핑→DB 70건 게시→52건 감사 완주. 정확26/52, 미게시24, parity exit 2 |

## 남은 필수 작업 / 인계

1. **독립 공식 source→TMDB 신규 binding** 생성: Netflix videoID·공식 제목·TVING P ID·Disney+/Coupang Play 공식 상세 등에서 지역/시즌/최초 플랫폼 공개 단서를 추출하여 시즌 단위로 고유하게 정체성을 검증. TMDB KR 시리즈 공급처나 첫 방영일만으로 날짜를 확정하지 않는다.
2. 신규 binding에 대응하는 검토 후보를 검증 가능한 규칙으로 승인/키 할당하고 `prepareReviewed` 전체 snapshot을 통과한 경우에만 게시. 현재 `prepare-tmdb-reviewed-batch.mjs`는 기존 매핑만 재검증하며 `newMappingsAssigned: 0`으로 설계되어 있다. 사용자 요구의 **자동 신규 게시**를 달성하려면 이 단계의 별도 구현·테스트가 필요하다.
3. 동일한 52행 중 시즌 첫날 근거가 다른 플랫폼 공식에서 확인되면 공식 날짜로만 게시하고 DB/API에서 실제 숫자를 다시 측정. 인정된 공식 날짜 차이 2건은 원천 날짜를 유지. 단순 숫자 맞추기용 더미 이벤트·회차 확장 금지.
4. 통합 고정 SHA, 계약·마이그레이션 digest, verifier 독립 runner 및 제품 환경 검증은 미실행. approval/verdict를 수정하지 않는다.

- **ADR**: 기존 리뷰/게시 경계 유지, 새 ADR 불필요. **LEARN-ID**: 해당 없음(배치 실행·오류전파 보수).
- **공통 revision**: DATA-63-2026-11-16. app `docs/system` 원본 → backend/verifier 공통 사본 동기화 필요.
