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
