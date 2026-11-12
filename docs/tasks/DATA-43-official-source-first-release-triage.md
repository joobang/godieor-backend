# DATA-43 · 한국 OTT 원천 우선 공개일 후보 분류

- 요구사항: PROD-005/007/009. 담당: codex-context-01. 상태: 구현/작성자 자체검사 완료, 최초 공개 확인·게시/독립 검증 대기.
- 기준: backend `be5bac0` (`codex/app-auth-phone-ready`), 기존 dirty 보존. 앱·API 계약·마이그레이션 수정 없음.
- 범위: 한국 OTT 원천 목록을 기준으로 TMDB 날짜·시즌 보조정보를 연결하는 검토 분류기와 회귀 검사.
- 예상 실패: TMDB 제공처 누락으로 Netflix 한국 날짜 배제, 시즌 최초일과 후속 회차일 혼동, 동일 날짜 다른 TMDB 작품 자동 승인, StreamPick 날짜로 공식 OTT 날짜 덮어쓰기.

## 수집·분류 규칙

1. 한국 OTT 공식 날짜는 해당 플랫폼의 **한국 제공/등록 날짜** 근거로 유지한다. TMDB `watch/providers`에 플랫폼이 없더라도 후보를 삭제하지 않는다.
2. TMDB `first_air_date`는 시리즈 첫 방송 단서, `season.air_date`는 시즌 시작 단서, 회차 `air_date`는 해당 회차의 방송 단서다. 어떤 필드도 단독으로 한국 Netflix/TVING 최초 제공일을 확정하지 않는다.
3. 한국 공식 목록 날짜와 TMDB **시즌 시작일** 또는 영화 출시일이 일치하고 작품 식별이 고유하면 `official_kr_date_and_tmdb_season_match`로 분류해 **최초 공개 검토 우선순위**에 둔다. 날짜 불일치/후속 회차/다중 식별은 이 분류에 들지 않는다.
4. 공식 한국 OTT 최초 공개를 명시한 별도 근거가 있는 경우 `official_first_release_review`로 구분한다. 두 분류 모두 작성자 검토·기존 reviewed 게시 과정을 거쳐야 한다. TMDB KR 제공처 누락은 거부 조건이 아니다.
5. StreamPick은 누락 탐색 및 차이 감사용. 방송사 첫방 날짜·타사 OTT 제공처로 특정 OTT 공개일을 생성하지 않는다. 같은 작품이라도 한국/해외, Netflix/TVING 및 시즌별 날짜를 구분한다. 시각 근거가 없으면 `date_only`.

## 실행 및 근거

- `scripts/triage-official-ott-releases.mjs`는 공식 JSON과 `enrich-official-ott-with-tmdb.mjs` 결과를 결합해 확인이 필요한 레코드를 생성하며 DB 게시하지 않는다.
- 기존 2026-11-12 Netflix KR 공식 목록 스냅샷 `data/lineups/netflix-kr-2026-11-12-auto.json` 75개 + 같은 날 저장한 `/private/tmp/godieor-netflix-kr-tmdb-all.json` 감사 결과로 실행: **75개 중 31개 최초 공개 검토 우선 후보**, **11개 TMDB 한국 제공처 누락 상태로 보존**, 자동 게시 **0**. 출력 `/private/tmp/godieor-netflix-triage-20261112.json` (로컬 임시파일).
- `node --test tests/*.test.mjs` (Node 22.23.4): 75/75 통과. `git diff --check` 통과. 전체 `npm test`(build 포함), 독립 verifier, 신규 DB 게시/클라우드 배포는 실행하지 않았다.
- `문무`(tv/301354), `나인 투 식스`(tv/310209)는 한국 Netflix 원천 스냅샷 75개에 **없다**. 이것만으로 Netflix 한국 제공 여부를 부정하지 않으며 두 작품에 대한 Netflix 최초 제공일을 확정하지 않는다. 별도 한국 Netflix 공식 페이지/공지 또는 배급사 일자·플랫폼 확인 후 적재한다.

## 다음 단계

- 원천 목록 기간·페이지 및 넷플릭스 한국 작품 페이지, 방송사 배급 공식 발표를 추가 확인하여 `문무`/`나인 투 식스`의 한국 Netflix 날짜를 찾는다.
- 31개 검토 후보의 공식 최초 공개 근거를 재확인하고 reviewed 매핑/실 DB 로컬 게시 후 StreamPick 신작 기준 날짜별 비교표 갱신. 자동 후보 개수와 실제 게시 개수를 혼동하지 않는다.
- 관련 LEARN-ID 해당 없음: 기존 공식 공개일 검토 규칙의 소규모 구현·회귀 검사로 새로운 독립 기술 결정은 없음.
