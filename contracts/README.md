# GODIEOR API·DB 계약 초안

- 버전: `0.1.0-draft.1` / 정책: `SYNC-2026-11-09-12` / 작업: SYS-02.
- 연결: PROD-001~010, P03~P09/P13. **초안**이며 서버·Prisma schema·migration·독립 실행 검증은 아직 없다.
- 소유 원본: backend의 [OpenAPI](openapi.yaml), [DB DDL](database.sql), 이 문서.
- [DB 설계 설명](database.md), [가상 응답 예시](examples/calendar.json), [내용 해시](manifest.json).
- OpenAPI 문법이 표현하지 못하는 조건부 요청·트랜잭션 의미도 이 문서의 계약이다. 코드 작성 전 소비자/독립 검토한다.

## 경로와 인증

기본 경로 `/v1`. 공개 API는 인증과 관계없이 동일한 비개인 데이터를 반환한다. 잘못된 bearer를 보내도 공개 응답을 개인화하지 않는다.

| 메서드·경로 | 의미 | 인증 |
|---|---|---|
| GET /catalog/options | 필터 선택값, KR/KST, 신규 movie/ott 기본값 | 공개 |
| GET /calendar | 월 전체 날짜별 건수·최대 2개 미리보기 | 공개 |
| GET /events | 날짜 있는 일정 또는 미정 목록 | 공개 |
| GET /events/{eventId} | 상세·출처·이전 시각 | 공개 |
| GET /contents/{contentId} | 작품·시즌 정보 | 공개 |
| POST /auth/google | Google ID token 검증 후 서비스 세션 발급 | Google token 본문 |
| DELETE /auth/session | 현재 서비스 세션 폐기 | 서비스 세션 |
| GET /me | 현재 계정 | 서비스 세션 |
| GET, PUT /me/settings | 설정 조회·버전 조건 전체 교체 | 서비스 세션 |
| GET /me/favorites | 모든 분야의 직접 작품/일정 찜 | 서비스 세션 |
| PUT, DELETE /me/favorites/contents/{contentId} | 작품 찜 저장·해제 | 서비스 세션 |
| PUT, DELETE /me/favorites/events/{eventId} | 일정 찜 저장·해제 | 서비스 세션 |
| GET /me/calendar, /me/events | 찜한 작품의 일정 + 직접 찜 일정 합집합 | 서비스 세션 |

개인 API에는 userId를 입력받지 않는다. 서비스 세션으로 사용자를 결정한다.
공개 응답은 찜 여부/계정 설정을 포함하지 않는다. 모든 `/me`와 `/auth` 응답은 `Cache-Control: no-store`.
API 비밀/원본 제공처 키/Google token을 URL·응답 예시·로그에 남기지 않는다.

## 콘텐츠·이벤트·시즌

- Content = 영화/드라마/게임 작품. Event = 극장 개봉/OTT 시즌 최초 공개/게임 정식 출시/EPL 한 경기.
- OTT는 시즌별 첫 공개만. 회차·완결 이벤트는 제외한다. 콘텐츠 자체의 최초 방영연도로 2026 이후 새 시즌을 제외하지 않는다.
- `season=null`은 출처에서 시즌 식별이 불확실한 최초 공개다. 시즌 1/0을 임의 생성하지 않는다. 확인 후 같은 이벤트 ID를 유지하며 시즌을 연결한다.
- 극장 개봉일은 상영 회차·좌석 예매와 별개다. EPL은 Content 없이 홈/원정 Team을 직접 참조한다. 스코어·실시간 중계·팀 구독은 이 계약에 없다.
- 지역/시즌/공개 방식·날짜/시각이 다르면 별도 이벤트다. 같은 공개 이벤트라는 근거가 있을 때만 플랫폼을 복수 연결한다.
- 제목 또는 날짜만으로 자동 병합하지 않는다. 제공처 키 매핑과 정규화 근거가 필요하다.
- 날짜 변경·연기·취소는 같은 Event ID의 변경 이력이다. hard delete 대신 상태를 유지해 찜 연결을 보존한다.
- `scheduled`는 공개/경기 일정 상태다. EPL의 실시간 진행/종료 상태가 아니다. 시간이 지났다고 경기 결과를 추정하지 않는다.

## 조회 조건·설정과 빈 값

1. 국가 기본 KR, 시간대 기본 Asia/Seoul. `/catalog/options`에 있는 선택값만 허용한다. 지원 국가와 데이터 확보율은 별개다.
2. API `categories` 생략/빈 값은 네 분야 전체. 앱은 계정의 활성 분야와 임시 필터의 교집합을 명시 전송한다.
3. 새 계정 활성 분야는 movie/ott. 계정 설정을 암묵적으로 읽는 공개 API를 만들지 않는다. 모두 OFF이면 앱이 분야 선택 안내를 표시하고 일정 조회를 생략한다.
4. 분야 선택은 OR, OTT 서비스 선택은 OTT 안에서 OR, 게임 기기 선택은 게임 안에서 OR다. 이 조건을 분야 안에서 AND 적용한다. 서비스/기기 필터가 다른 분야를 제거하지 않는다.
5. 예: `categories=movie,ott&services=netflix`는 영화 + 넷플릭스 드라마 최초 공개. `categories=game&devices=pc,xbox`는 PC 또는 Xbox 정식 출시다.
6. 설정 services/devices 빈 배열은 각각 해당 분야 전체. enabledCategories 빈 배열은 분야 모두 OFF이므로 다른 의미다.
7. 국가 조회는 해당 공개 시장 또는 명시적인 WORLD 일정을 포함한다. WORLD는 실제 전 세계 동일 공개 근거가 있는 경우만 가능하다. OTT는 국가별 공개 근거가 필요해 WORLD를 사용하지 않는다.
8. EPL은 국가 필터로 경기 장소를 제한하지 않는다. 영국 경기에도 KR 표시 국가를 쓸 수 있다. `venueCountry`와 `releaseMarket`을 분리한다.
9. 분야 숨김은 찜/원천 일정을 삭제하지 않는다. `/me/favorites`는 숨긴 분야도 모두 반환하고 `/me/calendar`는 명시한 분야 조건을 적용한다.

## 날짜·시각·미정

- `instant`: UTC 실제 시각과 알려진 원본 시간대를 저장. 응답의 displayDate/displayTime은 요청 timeZone으로 계산한다.
- `date_only`: 원본 지역 날짜만 저장/반환한다. KST나 UTC 자정으로 변환하지 않는다.
- `unknown`: 달력 날짜 없음. announcedYear/announcedPeriod는 알려진 범위를 설명할 뿐 달력에 배치하지 않는다.
- `schedule=dated`에는 from/to 둘 다 필수, `from <= 날짜 < to`. 시작은 2026-01-01 이상, 한 요청은 최대 62일, 미래 연도는 자료형 표현 범위에서 임의 상한 없이 이동 가능하다.
- instant 범위는 요청 시간대의 실제 두 자정 경계를 UTC로 변환해 비교한다. 하루를 항상 24시간으로 계산하지 않는다. date_only는 원본 날짜로 비교한다.
- `schedule=undated`에는 from/to 금지. unknown만 별도 반환한다. 알려진 announcedYear가 2026 미만이면 제외하며 완전 미정은 연도 확정으로 표시하지 않는다.
- `month=YYYY-MM`은 2026-01 이후의 월이며 모든 날짜를 반환한다. 미정과 과거 날짜에 남은 연기 이력은 날짜별 합계에 포함하지 않는다.
- 연기 후 새 날짜도 미정이면 현재 precision=unknown으로 이동하고 이전 유효 시간은 history로 남긴다. 기존 날짜를 현재 일정처럼 재배치하지 않는다.
- 알려진 날짜가 있는 취소/연기 이벤트는 그 날짜에 상태와 함께 표시한다.

## 월간 건수·페이지와 버전 일치

월 응답은 날짜별 전체 `total`과 정렬 순서의 최대 2개 `previews`다. 목록 페이지 크기를 전체 건수로 표시하지 않는다.
날짜 선택 후 /events의 from/to를 해당 날짜의 포함/다음 날 제외 범위로 요청한다. 두 응답의 필터·country/timeZone·catalogRevision은 같아야 한다.

- 날짜 목록 정렬: 표시 날짜 → 날짜만(먼저)/instant(다음) → instant의 UTC 시각 → Event UUID. date_only에 가짜 시각을 생성하지 않는다.
- 미정 목록 정렬: Event UUID. 직접 찜 관계는 savedAt DESC → targetType → targetId.
- 페이지 기본 50/최대 100. `nextCursor=null`이면 끝이다. 다음 호출은 cursor와 같은 조건/limit를 전송한다.
- cursor는 조건·정렬 위치·카탈로그 버전·개인 조회 사용자/찜 버전을 서명해 묶는다. 임의 편집/다른 조건=400 INVALID_CURSOR.
- 공개 카탈로그는 모든 공개 변경(수집 상태/출처 변경 포함)에 단일 bigint revision을 증가시킨다. JSON에서는 십진 문자열이다.
- 달력/상세 목록 읽기는 한 DB 읽기 snapshot에서 revision과 데이터를 함께 읽는다. 개인 목록은 favoritesVersion도 같은 snapshot에서 읽는다.
- 달력→목록, 다음 페이지는 revision을 유지한다. 변경됐으면 409 CATALOG_CHANGED 또는 FAVORITES_CHANGED로 처음부터 조회한다. 이미 읽은 행과 새 버전을 섞어 누락/중복을 숨기지 않는다.
- 이 초안은 과거 버전의 DB snapshot을 장기간 보관하지 않는다. 일 1회 수집 규모에서는 재조회가 단순하다. 빈번한 변경으로 문제가 확인되면 별도 설계한다.
- 상세는 최신 한 이벤트를 반환하며 목록과 revision 고정은 하지 않는다. 복귀하면 달력/목록 버전을 다시 확인한다.

## 계정·세션·동시 변경

Google SDK에서 받은 ID token을 POST /auth/google 본문에 보낸다. 서버는 공식 라이브러리로 서명·issuer·만료·audience를 검증하고 검증된 sub로 계정을 찾는다.
허용 audience는 서버 OAuth 클라이언트 설정으로 고정한다. 클라이언트가 보낸 userId/email을 신원 근거로 사용하지 않는다.
provider+sub UNIQUE와 DB 트랜잭션으로 첫 가입 경쟁을 처리하고, 신규일 때만 설정 기본값을 만든다.

서비스 세션 초안: 32바이트 이상 난수 opaque token, SHA-256 digest만 DB에 저장, 절대 만료 30일 제안. 매 개인 요청에서 만료·폐기를 확인한다.
응답 expiresAt이 권위 값이다. 수명은 로컬 인증 구현 전에 설정으로 고정하며 **사용자가 30일을 별도 확정한 것은 아니다**.
refresh token은 V1 초안에서 두지 않는다. 만료 시 Google SDK에서 새 유효 ID token을 확보해 다시 교환하고 필요할 때 로그인 UI를 연다.
iOS는 서비스 token을 Keychain에 보관한다. 로그아웃은 현재 세션 폐기+로컬 자격/개인 캐시 삭제이며 다른 기기 세션은 유지한다.
로그인 취소/실패 후에도 공개 조회는 가능하다. 로그인 전에 선택한 찜 동작은 성공 후 명시한 대상만 재시도한다.

- settings PUT는 expectedVersion과 모든 설정값을 보낸다. 한 트랜잭션에서 비교·관계 교체·version 증가. 불일치=409 SETTINGS_CONFLICT, 최신값 재조회 후 사용자 의도와 조정한다.
- 같은 값·일치 버전의 PUT는 version을 증가시키지 않는다. 통신 오류 재시도에서 이미 적용돼 버전이 바뀌었다면 409 후 최신값으로 적용 여부를 확인한다.
- 찜 PUT는 UNIQUE/ON CONFLICT 등으로 멱등 처리, 기존 savedAt 유지. DELETE는 없던 관계도 204. 실제 관계 변화 때만 favoritesVersion 증가한다.
- 작품 찜의 관련 Event와 직접 찜 Event는 UNION하여 Event ID로 중복 제거한다. 작품 해제는 직접 일정 찜을 삭제하지 않는다.
- 직접 일정 찜을 해제해도 작품 상속으로 남을 수 있다. 앱은 직접 저장 여부와 작품 상속을 구분해 표시한다.
- 개인 설정 저장/찜 변경과 해당 버전 증가는 동일 트랜잭션에서 처리한다. 사용자 식별은 항상 서버 세션이다.

## 오류·최신성

공통 오류는 code/message/requestId/details. 예: INVALID_QUERY, INVALID_CURSOR, AUTH_REQUIRED, SESSION_INVALID, NOT_FOUND, CATALOG_CHANGED, FAVORITES_CHANGED, SETTINGS_CONFLICT, RATE_LIMITED, SERVICE_UNAVAILABLE.
잘못된 지원 국가/시간대/범위는 400. 원본 소스가 실패해도 DB의 마지막 성공 데이터가 있으면 조회는 200과 freshness를 반환한다.
DB/API 자체가 응답할 수 없으면 503이며 iOS는 이전 캐시를 최신 데이터라고 표시하지 않는다.
`lastSuccessfulAt=null`은 성공 수집 이력이 없다는 뜻이다. fixture는 `dataOrigin=fixture`로 표시한다.
source freshness는 부분 지원·미지원·미설정과 수집 실패를 구분한다. 응답 생성 시각을 성공 수집 시각으로 쓰지 않는다.

## 남은 구현·검토

- Nest/Node/Prisma/PostgreSQL 버전 및 로컬 DB 도구 고정, Prisma 모델과 SQL CHECK·복합 FK의 migration 매핑.
- source별 실제 접근/라이선스·지역·최초 공개/시즌 매핑, 수집 실행 시각/재시도·보관 기간.
- 세션 수명·로그인 동의 설정·계정 삭제/연결 정책은 로컬 인증 구현/외부 사용자 제공 전 구체화한다.
- 구현 전 소비자 검토·독립 계약 검토가 필요하다. runtime/DB 실행·정식 evidence v2 검증은 수행하지 않았다.
- V1 알림 endpoint/token 등록/권한 요청은 없다. 스토어 배포·가입·유료 서비스도 이번 초안에 포함하지 않는다.

## 공식 근거와 자체 제안 구분

- [OpenAPI 3.1.1](https://spec.openapis.org/oas/v3.1.1.html): 계약 기술 형식. 경로·버전 재조회 정책은 GODIEOR 설계 제안.
- [Google iOS backend 인증](https://developers.google.com/identity/sign-in/ios/backend-auth): 검증 가능한 ID token을 서버로 보내고 계정/세션을 구성하는 근거. opaque token/30일 수명은 자체 제안.
- [PostgreSQL constraints](https://www.postgresql.org/docs/18/ddl-constraints.html): CHECK/FK/UNIQUE와 NULL 의미의 근거.
- [Prisma 미지원 DB 기능](https://www.prisma.io/docs/orm/prisma-schema/data-model/unsupported-database-features): Prisma Schema와 DB 제약 표현이 다를 수 있어 migration SQL을 구분한다. 문서 확인이 Prisma 버전 선정은 아니다.

확인일 2026-11-09. 이 공식 문서들은 제품 데이터 출처나 구현 통과 증거가 아니다.
