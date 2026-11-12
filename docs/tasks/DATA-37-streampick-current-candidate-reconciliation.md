# DATA-37 · StreamPick 차이 분석에 최신 공식 후보 근거 반영

- Requirement: PROD-005/007/009, DATA-26/27/36, P11(커밋). 기존 verifier acceptance 변경 없음.
- 기준: 2026-11-12, backend `7dfeae6` / `codex/app-auth-phone-ready`, app `10bbb24`, verifier `62e137b`.
- 범위: StreamPick 11건 역대조에서 최신 후보 revision의 `lineupEvidence`를 공식 lineup snapshot과 결합. 비교 분모는 원래 StreamPick-only 11건으로 고정. DB/API/마이그레이션 변경 없음.
- 실패 사례: 최신 `더 바디` 한국 공식 날짜가 TMDB 날짜만 있는 것으로 누락; 다른 시즌·국가·플랫폼 후보의 잘못된 병합; 동일 공식 출처 중복; 검토 상태가 오래된 revision에 묶인 채 유효한 것으로 표시; 공식 신규 등록일을 첫 공개 확정으로 오인; 전체 공식 라인업 75건이 11건 차이 분모를 오염.

## 실제 재대조 결과

`node scripts/reconcile-streampick-gaps.mjs /private/tmp/streampick-tmdb-11-audit.json data/lineups /private/tmp/streampick-gaps-reconciled.json work/ott-candidates/state.json` 실행:

- 비교 대상 **11건 유지**, 한국 공식 OTT 같은 날짜 목록 근거 **6건**: Netflix `배스 X 마키나`(11/03), `반려견의 완벽한 크리스마스`(11/04), `시한부 1년, 남자를 사다`(11/05), `더 바디`(11/11), TVING `유일무이 로맨스`(11/09), Disney+ `스타일 워즈`(11/11). 이들은 최초 공개 확정이 아니어서 게시 불가.
- 공식 날짜 불일치 **1건**: Netflix `오버액션 갱`(StreamPick 11/04, 공식 목록 11/05). UTC 변환으로 보정하지 않고 원본 날짜 충돌로 보존.
- TMDB 날짜+한국 제공처 단서 **1건**: TVING `전지적 집착 시점`(11/08).
- TMDB 날짜 단서만 **3건**: Netflix `Alicia's Law`(11/11), `문무`(11/14), `나인 투 식스`(11/25).
- `더 바디`의 기존 `tmdb_date_only` 판정은 최신 Netflix KR 후보 revision의 날짜·KR 근거를 읽지 않은 데서 발생. 이제 `official_kr_listing_needs_premiere_review`로 정정, candidateId/revisionToken을 함께 추적.
- 신규 게시 **0**, 기존 DB 게시 건수 변경·재조회 없음. StreamPick 신작 15건과 기존 게시 9건의 정확 일치 4건 역시 이번 비교 수정으로 늘었다고 주장하지 않음.

## 검증·인계

- `node --test tests/streampick-gaps.test.mjs` 10/10 통과(후속 분모 고정 회귀 1개 추가).
- `npm test` 일반 sandbox에서 기존 `dist` unlink EPERM; 허용 실행에서 **129/129 통과**.
- `git diff --check` 통과. 결과 JSON은 `/private/tmp/streampick-gaps-reconciled.json`에 기록. 외부 검증·실배포·DB 게시 미수행.
- 다음: 최초 한국 플랫폼 공개인지 작품/시즌 단위로 공식 원문 교차 검토, 한국 공식 일정이 확인되면 기존 검토→게시 경로 사용. StreamPick 숫자 일치만을 위해 미확정 날짜를 게시하지 않음.
- 기존 dirty `.env.example`, `package.json`, `docs/system/status.md`, `docs/system/handoff.md` 및 미추적 감사 코드는 보존. LEARN-ID 해당 없음(비교 스크립트 최신 후보 증거 결합 및 회귀 수정).
