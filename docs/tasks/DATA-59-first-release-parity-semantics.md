# DATA-59 · StreamPick 한국 첫 공개 기준 재검증

- Requirement: PROD-005/007/009, 신규 작품 및 새 시즌의 KR OTT 최초 공개. 일반 회차(5·6화 포함) 제외.
- 상태: 비교 도구 보완 완료, 전체 참조 일치 미완료. 승인·배포 아님.
- 기준: backend 시작 `f3c3375`, app 시작 `06f9703`, 두 저장소 branch `codex/ott-animation-support`; backend 기존 개인 변경 `.env.example`/`package.json` 및 기존 미추적 감사 스크립트·테스트, app 개인 signing 변경 보존.
- 범위: StreamPick RSC 첫 공개 추출·중복, 비교 보조 집계, 시즌/날짜 불일치 진단, 전체 미일치표 생성. API 계약/DB/게시/검증 승인 기준 변경 없음.
- 예상 실패: 시즌 2 첫 회를 일반 회차로 취급, 동일 시작일의 `new_release`/`episode.premiere` 중복 계수, 글로벌/한국 공개일 1일 차이를 일괄 보정, 다른 시즌을 날짜 차이로 잘못 분류, 다수의 타 작품 게시를 동일 건수 달성으로 오인.

## 재검증 결과 (2026-11-16)

- 저장된 11~12월 StreamPick 참조: **52 플랫폼·시즌별 첫 공개 행 = `new_release` 25 + `season_premiere` 27**. 일반 회차는 참조에서 제외. 현재 저장된 참조 자체에는 같은 작품/날짜/플랫폼의 `new_release`/시즌 프리미어 중복이 0이다. 새 중복 방지 규칙은 가상 반례로 검사했다.
- 로컬 DB `ott_reviewed` 조회(읽기 전용): **68행**, 52행과 정확 일치 **26**, 날짜 차이 **2**, 미게시 **24**. 68≥52는 작품·플랫폼·시즌·날짜 parity가 아니다. 이번 작업 DB 신규 게시 **0**.
- 날짜 차이: `오버액션 갱` StreamPick/TMDB 11/04 vs 한국 Netflix 공식 신규 목록 및 로컬 DB **11/05**(기존 DATA-42 승인 근거). `네버 서렌더` StreamPick 11/11 vs 한국 Netflix 공식 신규 목록 후보 및 로컬 DB **11/12**(기존 공식 목록 스냅샷). 두 날짜 차이는 0시 UTC 강제 보정 근거가 아니다.
- `scripts/report-first-release-parity.mjs`로 월/OTT 및 미일치 26행 비교표를 반복 생성: `docs/tasks/evidence/data59/first-release-parity-2026-11-16.md`. 제3자 목록의 실제 한국 최초 공개 증거는 아직 26행 중 추가 확보하지 않았다.
- 저장된 TMDB 역감사(DATA-57): 미일치의 대표적인 원인은 시즌 제공처 증거가 아닌 **시리즈 전체의 provider 힌트만 있는 경우 14행**, 시즌/영화 provider 힌트만 있는 경우 7행, 플랫폼 미확인 1행, 시즌 후보 미발견 2행 및 위 날짜 차이 2행. 각 힌트는 한국 OTT 최초 공개일 확정이 아니다.
- 최신 StreamPick 실시간 HTML은 `curl` DNS 실패(`Could not resolve host: streampick.io`)로 다시 획득하지 못했다. 따라서 52는 저장된 2026-11-16 참조 기준이고 오늘 실시간 재확인 건수로 표현하지 않는다.

## 변경 및 검사

- `audit_streampick_calendar.py`: 동일 작품/날짜/OTT에 시즌 프리미어와 시즌 미상 신작 카드가 중복되는 경우 명시 시즌만 참조; 보조 `audit()`가 신작+시즌 프리미어를 함께 집계하고 일반 회차 제외. 기존 `missingNewReleaseCandidates` 키는 하위 호환으로 유지하되 새 `missingFirstReleaseCandidates` 사용 권장.
- `audit-ott-published.mjs`: 다른 시즌의 다른 날짜는 날짜 불일치로 오분류하지 않고 시즌 미확인으로 유지; 같은 시즌의 실제 게시 날짜 출력. 합성 반례 검증.
- 보고서 생성기 및 검사 추가. `python3 -m unittest scripts/test_audit_streampick_calendar.py` **12/12**, Node24 `node --test tests/*.test.mjs` **162/162**, `git diff --check` 성공. 첫 Node 테스트는 기존 기대값 1건이 새 정의와 충돌하여 기대값 변경 후 전체 통과. 로컬 DB 조회 기본 sandbox `EPERM 127.0.0.1:55432`, 승인 실행 경로에서 읽기 성공.

## 인계

- 다음은 미게시 24건의 각 작품/시즌/플랫폼 **한국 최초 서비스 제공일**을 공식 OTT 원문·시즌별 식별과 함께 찾아 기존 독립 발견→검토→게시 경로로 연결한다. 특히 신규 시즌에 시리즈 전체 watch-provider 값을 그대로 상속하지 않는다.
- 기존 공식 KR 자료와 충돌하는 2건은 참조 오류/날짜 의미 차이로 분류하고 원본 증거를 유지한다. StreamPick 자체를 DB 게시 입력으로 사용하지 않는다.
- 독립 verifier runner, iOS 실기기 및 클라우드 미실행. 계약/migration/acceptance/verdict 변경 없음. 관련 ADR 신규 없음(기존 ADR-020·021 적용); LEARN-0011·0021의 최초 공개 검증 조건 유지.
