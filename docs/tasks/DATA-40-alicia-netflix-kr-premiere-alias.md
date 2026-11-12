# DATA-40 · Alicia's Law 한국 공개 및 StreamPick 누락 11건 역대조

- 요구사항: PROD-005/007/009. 기준 backend `15088b0`, 브랜치 `codex/app-auth-phone-ready`; app `10bbb24`, verifier `62e137b`(이전 기록 기준).
- 변경 범위: 한국 Netflix 시즌1 최초 공개 근거, reviewed 매핑, 영어/한국어 제목 별칭, StreamPick 11건과 로컬 DB의 날짜·OTT·시즌 일치 감사 도구 및 테스트.
- 예상 실패: 제목 번역으로 같은 작품을 미일치 처리, 다른 시즌 또는 다른 OTT 날짜를 일치 처리, Netflix 미국 일정만으로 한국 출시 확정, 한 시즌의 파트2를 신규 첫 공개로 중복 적재.

## 근거와 처리

- Netflix 한국 신규 공개 목록과 한국 작품 페이지 `https://www.netflix.com/kr/title/82013594`에서 **알리시아의 법**을 확인하고 Netflix 공식 발표 `https://about.netflix.com/en/news/fernanda-castillo-stars-in-alicias-law-trailer`의 시즌1 파트1 **2026-11-11** / 파트2 **2026-12-09**를 대조했다. 파트2는 같은 시즌의 후속 공개라 신규 최초 공개 이벤트로 세지 않았다.
- `data/lineups/netflix-kr-2026-11-alicia-premiere-confirmed.json`에 한국어/영어 별칭과 날짜 근거를 보존했다. 기존 후보 `b9ac0e7986802ac033d9810f403755ac8d8e4f584f2b36b551829ca2c5b1e9fd`, revision `702e488ceae1d3946baa7884d7cfc80f355ae6924a7e686eaa7ba67fd131ad1f`를 검토한 뒤 `work-000018` / `event-000018`을 reviewed 매핑에 추가해 로컬 DB에 게시했다. 공개 시각이 없어 `date_only`로 유지했다.
- StreamPick에서 최초 차이로 조사하던 11개 행을 `data/reference/streampick-2026-11-12-gap11.json`에 독립 저장하여 기존 35행 샘플의 누락과 혼동하지 않도록 했다. `scripts/audit-ott-published.mjs`는 공개일·OTT·시즌과 공식 한국어/영어 별칭까지 일치시킨다. `scripts/reconcile-streampick-gaps.mjs`에도 명시적 별칭을 반영했다.

## 실제 결과

- 로컬 DB 게시 결과 총 **18건**, 그중 2026년 11~12월 **16건**. 11개 최초 미일치 행을 재검사한 결과 **7건 정확 일치**, **4건 미게시**.
- 미게시 4건: `오버액션 갱`(StreamPick 11/04, Netflix KR 11/05 날짜 충돌), `전지적 집착 시점`(TVING 11/08, TMDB 날짜+KR 제공처만 확인), `문무`(11/14 KBS 첫 방송 및 wavve 근거, Netflix 한국 첫 공개 미확정), `나인 투 식스`(Netflix 11/25 한국 첫 공개 미확정).
- 분류기 11건 결과: `official_kr_premiere_candidate` 7, `official_date_conflict` 1, `tmdb_date_and_provider_only` 1, `tmdb_date_only` 2. 이는 후보 근거 분류이며 한국 플랫폼 최초 공개 자동 승인 수치가 아니다.
- `node --env-file=.env scripts/audit-ott-published.mjs data/reference/streampick-2026-11-12-gap11.json`으로 7/11 직접 확인. 회귀 두 파일 16/16 통과. `npm test` 전체 **132/132 통과**. 기본 sandbox에서 `dist` 삭제 `EPERM` 확인 후 허용된 환경에서 빌드·테스트를 성공적으로 완료했다.
- LEARN-ID 없음: 기존 reviewed 게시·날짜 정책의 근거 보강 작업. 독립 verifier 실행/승인, 클라우드 게시, iOS 실기기 반영은 수행하지 않았다. 기존 사용자 dirty 파일은 보존한다.

## 다음 확인

남은 4건을 국내 제공처의 해당 작품·시즌 첫 공개 날짜로 역검증한다. TMDB `first_air_date`, 시즌 `air_date`, KR watch provider는 각각 날짜·서비스 단서이며, 그 조합만으로 국내 OTT 첫 공개일을 확정하지 않는다.
