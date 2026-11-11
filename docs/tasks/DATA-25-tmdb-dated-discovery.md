# DATA-25 · TMDB 방영일 중심 OTT 후보 수집 및 StreamPick 역대조

- Requirement: PROD-005/007/009, ADR-015. 담당 세션 `codex-tmdb-date-discovery` (2026-11-12).
- 기준: backend `1d3e43cc`, app `097c59c`, 공통 작업 브랜치 `codex/app-auth-phone-ready`.
- 변경: TMDB 11~12월 날짜 기반 발견, 시즌/에피소드 날짜 검토, 서비스별 비교 보고서. 기존 568건 인기순 카탈로그 및 StreamPick 35행을 기준으로 누락 원인을 분류한다.
- 완료 조건: 원천 날짜/시즌/에피소드/지역 제공처 단서를 구분한 후보 JSON과 StreamPick 35행 대조, 회귀검사, 실제 실행 결과 기록.
- 예상 실패: TMDB API/DNS 실패, 인기순 결과 절단, 시즌 번호·동명이인·제공처 미일치, 글로벌 에피소드 방영일을 KR OTT 최초 공개로 오인.
- 안전 경계: 이번 후보는 검토 대기 데이터다. `event` DB 게시·독립 승인·기존 승인 기준 변경을 하지 않는다.

## 실행 기록

2026-11-12 로컬 검증:

- 기존 `work/tmdb/latest.json` 568개 카탈로그와 StreamPick 35행의 정확한 제목+서비스 일치 **12/35**. 이는 동일 작품 확정도 KR 최초 공개 증명도 아님.
- `scripts/tmdb-date-discovery.mjs` 추가: 참조 작품명 `/search/tv` 역검색, `/tv/{id}` 및 `/tv/{id}/season/{n}`의 `first_air_date`, 시즌 `air_date`, 1화 `air_date`, 다른 회차 날짜를 분리. KR watch provider 단서는 별도 표시. `discover/tv`의 `air_date`/`first_air_date`, 영화 `primary_release_date`를 11~12월별로 검색하고 모든 페이지 절단을 명시한다. `--skip-discover` 지원. 모든 출력은 검토용 JSON이며 게시 0건.
- `node --test tests/tmdb-date-discovery.test.mjs tests/tmdb-season-audit.test.mjs` **9/9 통과** (Node 20.20.2). 기존 인기순/시리즈 최초 날짜 때문에 새 시즌을 놓치는 경우, 회차일 오인, 시즌 불일치, DNS 실패, 페이지 잘림을 검사.
- 실제 TMDB 연결 사전 확인: `ENOTFOUND` (`api.themoviedb.org`), 이어서 `node --env-file=.env scripts/tmdb-date-discovery.mjs --live`도 `TMDB_REQUEST_FAILED:fetch failed`로 종료. 결과 `/private/tmp/godieor-tmdb-date-discovery.json`에는 `liveAttempted=true`, `liveError`가 기록되고 실제 역검색 **0/35 실행**, 날짜 기반 원격 후보 **0건 조회**. 후보가 실제 0개라는 뜻이 아니다.
- 기존 backend `work/tmdb/`에 보고서 쓰기를 시도했으나 현 sandbox `EPERM`; 기본 보고서 경로를 쓰기 가능한 `/private/tmp/godieor-tmdb-date-discovery.json`으로 설정. 
- 기존 가정(568개, StreamPick 35행)은 로컬 데이터 스냅샷 기준. 9건 제품 캘린더는 이전 기록이며 이번 작업에서 DB 재조회하지 않았다. 배포·독립 검증 없음.

다음 담당: TMDB DNS 가능 환경에서 `node --env-file=.env scripts/tmdb-date-discovery.mjs --live` 재실행하여 35행의 `status`와 날짜 기반 발견 결과를 확인하고, 한국 플랫폼별 **공식 최초 공개 근거**가 확보된 시즌만 reviewed 게시 절차로 연결한다. 날짜만 일치해도 자동 게시하지 않는다. 기존 `.env.example`, `package.json`, 앱 signing 및 다른 세션의 미추적 파일은 그대로 보존.

## 2026-11-12 후속 · 캐시 누락 분석 및 영화 역검색

- 로컬 568건 카탈로그와 StreamPick 참고행 35개를 재분류: `title_not_in_cache` **22**, `service_not_in_cache` **1**, `series_first_date_differs` **8**, `series_first_date_matches` **4**. 제목+제공처가 모두 있는 경우는 12개다. 서비스별 참고행/제목발견/제공처발견/첫 날짜 동일: Netflix **18/8/7/3**, TVING **12/2/2/0**, Disney+ **5/3/3/1**. 이는 오프라인 스냅샷 비교이며 실제 TMDB 재조회는 아니다.
- 역조회에 시즌 번호 없는 참조를 위한 `/search/movie`, `/movie/{id}`, `/movie/{id}/watch/providers` 조회 추가. 영화 `release_date` 일치와 TV 시즌·1화 `air_date` 일치를 다른 상태로 기록하며 영화 검색 페이지 절단도 노출. 영화 글로벌 공개일과 KR 제공처는 한국 OTT 최초 공개 근거가 아니다.
- 실제 명령: `/opt/homebrew/bin/node --test tests/tmdb-date-discovery.test.mjs tests/tmdb-season-audit.test.mjs` → **12/12 PASS**. `/opt/homebrew/bin/node scripts/tmdb-date-discovery.mjs --output=/private/tmp/godieor-tmdb-date-audit-v3.json` → **exit 0**, 참조 35건 분류 저장, `liveAttempted=false`, 원격 역조회 0건, 신규 달력 게시 0건.
- 이전 라이브 API DNS `ENOTFOUND`가 해소되었다는 증거가 없어 추가 원격 시도는 하지 않았다. 35행 날짜 일치 수·누락 개선량은 **검증 불가**. 다음 작업은 네트워크가 가능한 환경에서 실제 역조회 35행과 월별 discover 결과를 수집하고, 다국어 이명·동명작을 검토한 뒤 공식 한국 OTT 최초 공개 증빙을 연결하는 것.
- API/마이그레이션/acceptance 변경 없음. 독립 verifier, DB 게시, 배포 미실행. 기존 다른 작업 dirty 변경은 보존. ADR-015 참조; 별도 LEARN-ID 없음(기존 날짜 후보 정책에 대한 구현 보완).

## 2026-11-12 후속 · 실제 TMDB 역대조 및 제목 보정

- 실제 인증된 TMDB API를 사용해 StreamPick 2026년 11~12월 참고 **35행**을 역조회했다. 568건 인기순 캐시의 정확한 제목+서비스 발견은 **12/35**에 그쳤으나, TMDB TV 시즌 `air_date` 또는 1회 `air_date` 일치 **28행**, 영화 `release_date` 일치 **3행**, 날짜 단서 합계 **31/35**를 확인했다. StreamPick 행은 검토 기준 샘플이며 서비스 전체 전수 목록이라고 주장하지 않는다.
- TVING의 `두 번째 스윙` 및 `나쁜 원숭이`는 TMDB 검색명이 각각 `'두 번째 스윙' - Stick`, `'나쁜 원숭이' - Bad Monkey` 형태여서 기존 정확 일치 필터에서 누락됐다. 인용된 한국어 전체 제목에 영문 원제가 이어지는 형태만 인식하도록 보정했다. 보정 전 날짜 일치 29/35 → 보정 후 **31/35**.
- KR watch-provider 명칭까지 해당 행과 일치한 날짜 후보는 **25/35**(시즌 22, 영화 3). 서비스별 날짜 단서/제공처 동시 일치/참고 행: Netflix **16/12/18**, TVING **11/10/12**, Disney+ **4/3/5**. 제공처 정보는 현재 시청 가능성의 단서이며 특정 날짜의 한국 OTT 최초 공개 증빙은 아니다.
- 남은 4행: `네모바지 스폰지밥` 시즌20과 `몰몬교 주부들의 은밀한 사생활` 시즌6은 TMDB 해당 시즌 API 404; `상남자의 여행법 in 규슈`는 Netflix·TVING 각각 동일 제목 TV 검색 결과 없음. 404는 시즌 불일치이며 네트워크 장애나 작품 부재로 단정할 수 없다. 일부 다른 동명이인 검색 후보의 404 오류도 결과에 기록했다.
- 날짜 기반 `/discover`를 별도로 실조회한 결과, 11~12월 조건 및 KR 제공처 필터를 가진 **211개 고유 TMDB 작품 ID** 후보를 찾았다(이전 호출의 실측 결과, 이번 후속 호출은 역조회만 재실행). 페이지 한도에 걸린 항목은 없었다. 작품 수이며 OTT 공개 **이벤트 수나 검증된 KR 최초 공개 수가 아니다**. `retrieved`를 필터별로 초기화해 커버리지 보고의 누적 오차를 수정했다.
- 실행: `/opt/homebrew/bin/node --env-file=.env scripts/tmdb-date-discovery.mjs --live --skip-discover --output=/private/tmp/godieor-tmdb-live-reference-v2-20261112.json` 성공, `liveError=null`, 신규 게시 **0**. `/opt/homebrew/bin/node --test tests/tmdb-date-discovery.test.mjs tests/tmdb-season-audit.test.mjs` **14/14 PASS**, `git diff --check` 통과. 실측 상세 결과는 Git 제외 `/private/tmp/godieor-tmdb-live-reference-v2-20261112.json`.
- 원인: 기존 **인기순 5페이지 상한**, 시리즈 `first_air_date`로 신규 시즌을 판단하던 정책, 한국어 제목 래핑을 무시한 검색 제한. 역조회는 개선됐지만 실제 상용 수집/DB 적재 경로의 월별 자동 확장과 공식 KR 공개일 근거 확인은 여전히 별도 작업. API·마이그레이션·verifier acceptance/승인 불변. LEARN-ID 해당 없음(기존 ADR-015 날짜 후보 정책 보완).
