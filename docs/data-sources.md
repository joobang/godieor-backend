# 데이터 제공처 조사 · backend 소유

2026-11-06 KST 공식 문서 기준. 아래는 **후보와 제약**이며 가입·키 발급·실제 API 응답 검증은 하지 않았다.

| 분야 | 우선 후보 | 확인된 지원 | 남은 검증 |
|---|---|---|---|
| 영화 | TMDB | 영화 공개일 및 극장/digital 등 공개 유형 | 한국 지역별 응답, 날짜 정밀도, OTT의 개별 플랫폼 공개 근거 |
| OTT 드라마 | TMDB + 공식 공개 공지 | TV/회차 정보, 국가별 시청 플랫폼 정보 | 한국 OTT 공개 날짜/시각은 별도 근거 필요. 지원 플랫폼의 지역별 최초 공개 근거 필요 |
| 게임 | IGDB | 출시일·플랫폼·지역·날짜 정밀도·상태 | 한국/글로벌 일정의 적용 범위, 날짜만 있는 출시의 UTC 해석 금지 |
| EPL | football-data.org | Free에 Premier League, fixtures | 무료 schedules 지연, 일정 변경 반영 시간, 표기·재배포 조건 추가 확인 |

TMDB는 비상업적 사용에서 출처 표기 조건으로 무료이며 상업적 사용은 별도 문의 대상이다.
watch providers에는 JustWatch 출처 표기도 필요하다. 이는 제공 국가·플랫폼 정보이며,
새로운 한국 OTT 공개 시점을 보증하는 엔드포인트로 취급하지 않는다.

IGDB는 비상업적 사용의 무료 접근을 안내한다. 상업 파트너십과 사용자 표시 attribution 절차가 있으므로
수익화 전에 다시 확인한다. 공식 문서의 Getting Started와 FAQ의 상업 이용 표현이 달라
조건 없는 무료 상업 이용으로 확정하지 않는다. Twitch 인증 비밀은 서버에서 관리한다.
기본 제한은 초당 4요청이며 출시 날짜의 월·분기·연도 정밀도도 보존해야 한다.

football-data.org Free는 분당 10호출, 일정·스코어 지연을 명시한다.
경기 시작 시각 변경을 즉시 반영하는 제품 약속은 아직 할 수 없다.
무료 요금표가 일정 데이터의 무제한 재배포 권한을 뜻하지 않는다. 이용 조건 검토를 완료한 뒤 실제 연동한다.

## 2026-11-09 사용자 범위 결정

대상 OTT는 넷플릭스·디즈니플러스·쿠팡플레이·티빙이며 게임은 PC·PlayStation·Xbox·Nintendo Switch 정식 출시다. 한국/KST를 기본으로 국가·시간대 선택을 지원한다.
조회 목표는 2026-01-01부터 발표된 미래 일정 전체, 정상 갱신은 하루 1회다.
이력 채우기(backfill)와 정상 갱신을 분리하고, 기간·페이지·호출 할당량에 맞춘 수집을 설계한다.
이 범위 결정이 제공처 선정/접근·2026년 전체 이력·모든 미래 최초 공개일 확보 완료를 뜻하지 않는다.
새로운 실제 API 호출이나 이용 조건 검증을 이번 문서 작업에서 수행하지 않았다.

## 연동 도입 순서

1. 각 제공처에 대해 작은 읽기 요청으로 날짜·지역·누락·변경 응답을 조사한다.
2. 비밀을 제거한 fixture의 출처·조회일·가상/실제 여부를 기록한다.
3. 검증 저장소는 요구사항에서 독립 기대값을 만든다. 원본 timestamp를 무조건 instant로 간주하지 않는다.
4. 부분 지원·오래된 데이터·미정 일정을 UI와 API에 명시한다.
5. OTT는 지역·플랫폼별 최초 공개 근거부터 확인한다. 회차별 공개는 수집 대상에서 제외하고 새 시즌 포함 여부는 답변 후 정한다.

## 공식 출처

- [TMDB FAQ/이용 비용](https://developer.themoviedb.org/docs/faq)
- [영화 공개 유형](https://developer.themoviedb.org/reference/movie-release-dates)
- [TV Watch Providers와 JustWatch 표기](https://developer.themoviedb.org/reference/tv-series-watch-providers)
- [회차 정보](https://developer.themoviedb.org/reference/tv-episode-details)
- [IGDB 인증·제한·출시일·상업 이용](https://api-docs.igdb.com/)
- [football-data.org 가격](https://www.football-data.org/pricing), [EPL 포함 범위](https://www.football-data.org/coverage)

2026-11-09 구조 정리: 초기 app 조사 문서를 backend로 옮겼다.
이전 조사일을 유지하며 이번 문서 동기화에서 API를 재조회하거나 이용 조건을 다시 검증한 것은 아니다.

## 최신 적합성 판단

2026-11-09 로컬 뼈대 구성 후 [출처별 데이터·제약 판단](data-source-assessment.md)을 추가했다. 이전 후보 표와 실제 연동 상태를 혼동하지 않는다.
