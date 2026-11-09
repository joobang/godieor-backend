# 데이터 출처 적합성 판단 · 2026-11-09

로컬 DB·파이프라인·공개 API를 구성한 뒤 공식 문서로 조사했다.
**문서상 제공 필드/무료 조건**과 **본인 키로 실제 응답·누락률을 확인한 결과**는 다르다. 이번에는 본인 키 인증 호출을 하지 않았다.
계정 생성·키 발급·유료 신청·크롤러 배포·실제 어댑터 연결도 하지 않았다.
이 문서는 후보 판단이며 연결 완료나 2026 이후 전수 확보를 의미하지 않는다.

## 분야별 판단

| 분야 | 우선 후보 | 가져올 수 있는 데이터 | 현재 판단 |
|---|---|---|---|
| 한국 극장 영화 | KOBIS 영화목록/상세 | 영화 코드·제목·개봉일·제작 상태 등 | 국내 개봉 근거 후보. 예정/미정/재개봉의 실제 범위 확인 필요 |
| 다른 국가 영화·이미지/설명 | TMDB | 국가별 개봉 유형, 영화/TV 정보·이미지 | 보조 후보. 극장과 디지털을 구분 |
| OTT 드라마 | TMDB + 공식 공개 공지의 보강 근거 | 작품/시즌 정보, 국가별 제공처 가용성 | 국가·플랫폼별 시즌 최초 공개일의 자동 확보 근거가 부족함 |
| 게임 | IGDB | 기기/지역별 출시일, 날짜 정밀도·상태, 게임 정보 | 정식 출시/기기·지역 매핑을 확인한 뒤 연결 가능 |
| EPL | football-data.org v4 | 경기/팀 ID, UTC 일정, 상태·수정 시각 | 일정 요구와 잘 맞는 우선 후보. 2026년 초 과거 시즌 접근 확인 필요 |

## 한국 극장 · KOBIS

[공식 영화목록 명세](https://www.kobis.or.kr/kobisopenapi/homepg/apiservice/searchServiceInfo.do?serviceId=searchMovieList)는 동적 화면이다.
공식 페이지의 `searchServiceDesc.do`에 apiSvcId=searchMovieList를 보내는 읽기 요청에서 다음 정의를 확인했다.

- `movieCd`, `movieNm`, `movieNmEn`, `openDt`, `prdtStatNm`: 코드/제목/개봉일/제작 상태.
- `openStartDt`, `openEndDt`: YYYY 형식 **개봉연도** 조건. 일 단위 날짜를 넣는 필터가 아니다.
- [영화 상세](https://www.kobis.or.kr/kobisopenapi/homepg/apiservice/searchServiceInfo.do?serviceId=searchMovieInfo)는 movieCd로 조회한다.
- [이용 안내](https://www.kobis.or.kr/kobisopenapi/homepg/board/findServiceGuideList.do): 회원 가입과 서비스 키가 필요하다. 현재 키별 할당량/무료 조건은 발급 화면에서 확인해야 한다.

매핑 제안: movieCd→content_source, 명시된 유효한 개봉일→date_only, 해당 개봉 이벤트→event_source.
날짜 형식·공백·미정은 실제 응답으로 확인한다. 연도 필터만 쓰면 미정 개봉작이 누락될 수 있으므로 후보 발견을 별도로 설계한다.
목록 한 개의 openDt만으로 모든 재개봉·취소 이력을 얻는다고 가정하지 않는다. 박스오피스만으로 미래 개봉작을 수집하지 않는다.
문서의 샘플 키는 사용하거나 저장하지 않았다.

## TMDB · 영화와 OTT의 역할 분리

[영화 release_dates](https://developer.themoviedb.org/reference/movie-release-dates)는 극장 제한 개봉(type 2), 극장(type 3), 디지털(type 4) 등을 구분한다.
국가·공개 방식 근거를 확인하고 영화제 premiere/type 1을 극장 개봉일로 대입하지 않는다. 날짜처럼 제공된 자정 문자열을 정확한 공개 시각으로 간주하지 않는다.
일반 극장 개봉(type 3)을 우선 후보로 보고 제한 개봉/재개봉 구분은 실제 자료 확인 후 계약에 매핑한다.

[시즌 상세](https://developer.themoviedb.org/reference/tv-season-details)는 season/air_date 등을 제공한다.
[TV watch/providers](https://developer.themoviedb.org/reference/tv-series-watch-providers)는 국가별 시청 제공처 정보를 제공한다. **가용성은 그 플랫폼의 최초 공개일이 아니다.**
이를 조합해 한국 넷플릭스·디즈니플러스·쿠팡플레이·티빙의 시즌 최초 공개일이라고 추정하지 않는다.
네 서비스의 실제 provider ID/한국 지원 여부도 키 인증 응답으로 확인해야 한다.

[TMDB FAQ](https://developer.themoviedb.org/docs/faq)는 비상업 사용의 무료 조건과 출처 표기를 설명한다. watch/providers 사용 시 JustWatch 출처 표기도 필요하다.
현재 제안: 작품/이미지/시즌 후보는 TMDB, 달력 날짜는 지역·플랫폼·시즌이 명시된 공식 공지 등 추가 근거가 있는 것만 반영한다.
네 OTT를 모두 포괄하는 무료 공식 공개일 API를 확보했다는 결론은 내리지 않는다. 공식 공지를 자동 수집할지는 접근 방법/허용 범위와 구조를 조사한 뒤 정한다.

## 게임 · IGDB

[공식 IGDB 문서](https://api-docs.igdb.com/#release-date)의 release_dates는 game/platform/date/date_format/release_region/status/updated_at을 제공한다.
게임/표지/플랫폼 자료도 연결 가능하다. date_format·release_region은 참조 테이블이며 구 category/region 필드는 deprecated다.
문서상 비상업 무료, Twitch 개발 앱의 Client ID/Secret과 OAuth가 필요하다. 제한은 초당 4 요청이다.

매핑 제안: 기기·지역별 release record→Event, 게임→Content. 연/분기/월만 아는 값은 unknown으로 보존한다.
아시아 지역을 곧바로 한국이라고 바꾸지 않는다. worldwide도 원본이 그렇게 명시한 경우에만 WORLD다.
정식 출시와 얼리액세스·베타·DLC를 game type/status와 release status 실제 값으로 분류해야 한다.
게임의 first_release_date 하나를 모든 PC/PlayStation/Xbox/Switch 출시일에 복사하지 않는다.
새 참조 테이블/플랫폼 세대·운영체제 ID 매핑은 키를 받은 뒤 확인할 사항이다.

## EPL · football-data.org

[무료 요금제](https://www.football-data.org/pricing)는 fixtures와 지연된 schedules, 분당 10호출을 명시하고,
[coverage](https://www.football-data.org/coverage)는 Premier League를 무료 범위에 포함한다.
[Competition v4](https://docs.football-data.org/general/v4/competition.html)의 PL 경기 조회와
[Match v4](https://docs.football-data.org/general/v4/match.html)의 id/utcDate/status/homeTeam/awayTeam/lastUpdated가 후보 필드다.

매핑 제안: match.id→event_source, 팀 ID→team_source. 확정 UTC kickoff는 instant로 저장한다.
SCHEDULED/TIMED/POSTPONED/CANCELLED와 null의 의미는 [API 정책](https://docs.football-data.org/general/v4/policies.html) 및 실제 응답으로 확인한다.
정확한 시각이 미정인 placeholder를 확정 kickoff로 취급하지 않는다. 연기 시 이전 날짜만 남았으면 새 날짜 미정과 이력을 구분한다.
2026년은 2025/26·2026/27 두 시즌에 걸친다. 무료 키로 전 시즌 경기를 읽을 수 있는지 확인하기 전 2026년 전체 확보를 약속하지 않는다.
경기 미발표 시기의 빈 결과를 연도 지원 제한이나 모든 경기 확보로 잘못 표시하지 않는다.

## 다음 조사와 연결 순서 제안

1. KOBIS·football-data의 본인 키로 현재/2026년 초/예정/미정 범위의 샘플 응답과 페이지·할당량 확인.
2. TMDB 영화 개봉 유형·국가/포스터, OTT 제공처/시즌 정보의 실제 응답 확인. 출처/이용 조건 함께 기록.
3. IGDB 게임 type/status/date_format/region/platform 참조 값과 정식 출시 샘플 확인.
4. OTT 네 곳의 공식 공지에서 시즌·국가·플랫폼·최초 공개일 근거를 확보할 방법부터 판단.

가장 불확실한 것은 **OTT의 국가·플랫폼별 시즌 최초 공개일**이다. 근거 없는 자동 보완 대신 부분 지원/미정으로 표시한다.
원본 전체를 로그에 남기지 않고 비밀 제거 샘플·조회 시각·출처·범위만 보존한다. 키를 대화나 공개 레포로 받지 않는다.
