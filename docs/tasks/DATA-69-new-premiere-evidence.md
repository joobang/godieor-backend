# DATA-69 · 신규 첫 공개 근거 연결과 수집 실행 복구

- requirement: PROD-005/006/007/009 (GD-005/006/007/009 초안, acceptance 변경 없음).
- 상태: 진행. 담당 codex-data69-01, 순차 인계. branch codex/ott-new-premiere-evidence, 기존 checkout 사용.
- base: app cecb723 (개인 pbxproj dirty 보존), backend 232b29a (clean), verifier f75b098 (clean).
- 범위: 신규 공식 첫날 근거의 자동 검토 경로, TMDB 수집 실행/잠금/결과 확인. StreamPick parity 제외.
- 예상 실패: 글로벌 날짜를 KR 첫날로 오인, 동명이작/시즌 혼합, 명시 첫날 없는 원문, stale lock, 수집 중단, 기존 게시 변경.
- 완료 조건: 검증 근거 없는 후보 보류, 실제 수집 완료/실패를 관측하고 신규 게시 경로 검사, 기존 데이터 보존. 실제 신규 게시 여부는 따로 기록.
- ADR/학습: 기존 ADR-020, LEARN-0021 관련 주장 재검토 예정. 승인/verdict 변경 금지.

## 구현·자체 검사 결과

상태: 구현·자체검사 완료, 실제 신규 게시 성립/독립 검증은 미완료. 담당 codex-data69-01 해제.

- 쿠팡 공식 기사 작품별 날짜·시즌·출연진·출처 보존. 명시 첫 공개+정확 날짜+고유 TMDB/2인 출연진, TV 명시 시즌·첫 회 대조에 한해 curated binding 없는 신규 후보를 자동 검토하고 기존 매핑/게시로 연결한다. 현재 source만 늘려 첫날 검증이 됐다고 하지 않는다.
- 기존 근거 재검토만 하던 경로와 신규 공식 근거 경로를 분리했다. 공통 후보 schema는 내부 lineupEvidence에 coupang_play만 추가했고 API 계약·DB migration은 불변이다. 기존 reviewed 후보와 같은 TMDB 시즌의 중복 검토를 방지한다.
- 이전 DATA-68 실제 전수 실행을 끝까지 관측: TMDB 3,305작품/1,217후보/49검토준비/요청오류0. Coupang 영화 provider_not_found는 남아 discoveryComplete=false. 수집 요청 완주와 전수 커버리지 확보는 다르다.
- 기존 LaunchAgent가 Node20 경로였음을 관측, 영속 경로 Node24.22.3으로 재등록. Node20 일간 실행/설치는 `NODE_24_REQUIRED` exit1. 오전9시 등록 확인, 다음 날 자동기동은 미관측. 수동 일간 실행과 launchd 자체 기동을 구분한다.
- 일간 실행 기록에 단계별 결과 보존, 타임아웃에서 프로세스 그룹 종료. crash 후 소스별 stale writer lock의 무조건 자동 삭제는 구현하지 않았다.

| 실제 명령 | 종료 코드 | 관찰 |
|---|---|---|
| Node24 PATH `npm test` | 0 | 최종 276/276. 초기 가상 테스트의 빈 mapping 전제와 중복 TMDB ID를 수정 후 재검사한 결과 |
| `node --test tests/coupang-premieres.test.mjs tests/official-ott-pipeline.test.mjs` | 0 | 신규 검토/매핑 및 불확실 근거 보류. 후속 pagination 반례 포함 최종 전체 검사에 통합 |
| `GODIEOR_TEST_POSTGRES_IMAGE=postgres:16-alpine node scripts/check-coupang-premiere-db.mjs` | 0 | 일회용 DB migration, 가상 원문→정체성→검토→매핑→신규 저장/재조회. 1→2→2, 기존 전체행/이력 보존, instant NULL. 로컬 이미지 사용, 고정 digest 검사 아님 |
| `node --env-file=.env scripts/collect-coupang-premieres.mjs` | 2 | 공식4기사에서 현 기간3개 날짜 주장. 첫 공개 명시 없음3/정체성 보류2, 승인0. 마이클은 유력 영화 식별 후 다른 동명이작 cast 조회 미완료도 보존 |
| `node scripts/install-official-ott-launchd.mjs --install` (영속 Node24) | 0 | KST09시 등록. next morning/launchd 기동 실측 아님 |
| `node scripts/run-official-ott-daily.mjs --reuse-recent-tmdb` | 2 | 방금 완주한 실제 TMDB snapshot 재사용. 기존 reviewed70 게시, 신규0. 수집/식별 gap 명시. 단계별 결과 `work/ott-official-daily-last-run.json` |
| 실제 PostgreSQL 읽기→기존70 재게시→재읽기 | 0 | 전체 event hash c81de42ed1d365942e11039b10173b90f06caa3ea5f2c09649e9bf0cda77e2be 동일, 변경 이력 수 동일 |
| `git diff --check` | 0 | diff 공백 검사 |

공개 관측 요약은 `evidence/data69/observations.json`. 임시 원문/원시 로그는 `/private/tmp/godieor-data69-*`, 기존 full run `/private/tmp/godieor-data68-retry-live.json`. 비밀·제품 데이터의 가상 fixture 복사 없음.

## 독립 검증 handoff / 다음 행동

- app base cecb723e4ac4633995b09a6b74161a073011d5e4, 앱 코드 변경 없음/개인 pbxproj dirty 보존. head는 종료 Git 이력 참조.
- backend base 232b29a, 구현 head는 종료 Git 이력 참조. verifier base f75b098d5b74416eabef6421d801edfb23708de3, 공통 문서/학습 후속만 수정.
- 계약 0.1.0-draft.5, manifest SHA256 0ffd7cbcdcb3c46b450e626ced90055e985308d728c279832aa00ec76b24e9c9. migration digest ec6966538bd599bf0dcee21ec0e0fb03a63b513ae01654d52b9e2badf5697fd7.
- acceptance 0.1.0-draft / SHA256 c4906283810c8b378800b67930028685a41b6a051923ea9f9415346b2d657063. 기준·승인·verdict 수정 없음.
- 검사 범위 backend-only 자체검사·로컬 실제 관측. 신규 독립 runner/별도 리뷰/iOS·폰·클라우드 미실행. 통합 PASS 아님.
- 남은 목표: 실제 신규 공식 첫 공개 문구 확보 및 파서 범위 확대→고유 정체성·시즌 검토→실제 신규 DB 게시 관측. 현재 파서는 쿠팡 작품별 공개란의 제한된 명시 표현을 지원한다. Netflix/TVING/Disney+ 신규 첫날의 일반 자동 확정은 여전히 미완료다. 마이클 동명이작 인물 조회·돌싱N모솔 시즌 식별 및 provider 미등재도 보류한다. StreamPick parity는 이번 완료 조건 제외.
- ADR-022 / LEARN-0021 연결 갱신. 실제 신규 게시가 없다는 주장과 가상 DB 경로 성공을 분리했다. 사용자 이해도·성능 향상 수치 미측정.
