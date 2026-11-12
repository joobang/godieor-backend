# DATA-45 · Netflix 공식 videoID 정체성·종류·시즌 대조

- 요구사항: PROD-005/006/007/009, GD-005/006/007/009. acceptance 0.1.0-draft, 승인 상태 변경 없음.
- 상태: 인계 대기(구현·로컬 게시·작성자 검사 완료, 독립 검증 미실행). 담당 codex-data45-01, 종료 시 담당 해제. 별도 동시 작업 없음, 각 저장소 기존 checkout에서 순차 작업.
- 기준 app ed5453cb90b4dbdec544d1a9f3ac9d00d9961e09 / backend fd76c95e0095985a03182f835733b8f9ec333bb9 / verifier 91dfc9e80b45b9c0f8dd70c8ff5e3f177204d06e.
- 브랜치: codex/data45-netflix-identities. 기존 dirty: app pbxproj, backend .env.example/package.json 및 audit 관련 미추적 4파일. 그대로 보존.
- 원본 카드 backend/docs/tasks/DATA-45-netflix-official-identities.md.
- 범위: 인계 순서에 따라 DATA-44의 44건(미발견33/날짜차이11)에 대해 Netflix 공식 videoID의 제목·형식·시즌을 확인하고 확인 가능한 TMDB 정체성을 재조회. 근거 충분한 항목만 기존 수동 검토·고정 매핑으로 로컬 게시 후 같은 범위 실측. 공식 page 접근 실패와 지원 범위 밖 콘텐츠는 구분.
- 완료 조건: 44건별 시도/성공/미확인 결과·출처 보존, 합계 재현, 검토 가능한 배치만 로컬 게시/SQL 확인. 미확인 작품에 premiereConfirmed를 자동 부여하지 않음.
- 예상 실패: title2를 원제로 오인(실제로 시즌/부제 포함), 게임/스페셜을 영화로 오분류, season videoID의 시리즈 ID redirect를 동일 시즌 확정으로 오인, 메타데이터 dateCreated/startDate를 한국 첫 제공일로 오인, 동명 다른 영화/시즌 합병.
- 접근 관측: 공식 목록 title2는 원제가 아닌 시즌/부제일 수 있음. www.netflix.com 일반 bot robots 제외를 확인했으므로 추가 직접 스크래핑 배치는 하지 않고 웹 도구의 공개 문서 조회를 사용. 기존 단일 상세 HTML 관측은 재사용 가능. 인증/재생/계정 접근 없음.

## 구현·자체 검사

아래 실제 결과 참조. 제품의 독립 승인과 구분한다.

## 독립 검증 handoff

backend-only 작성자 자체 검사. 앱/계약/migration/acceptance/verdict 변경 계획 없음. 독립 검증·클라우드·폰 미실행.

## 결정·학습 기록

ADR/LEARN-ID: 해당 없음(기존 근거 교차검토·수동 게시 경로 적용). 중요한 정책 변경 필요 시 별도 제안.

## 조사·게시 결과

- DATA-44 44건 모두 공식 videoID 상세를 웹 도구로 조회 시도: 제목/형식 확인28, 도구 fetch 실패16. 실패는 해당 Netflix 작품이 없다는 뜻이 아님. 기존 한국어 검색 미발견33 중22건 상세 확인,11건 미확인. 종전 날짜차이11 중6건 상세 확인,5건 미확인.
- 공식 목록 현재4페이지/78원천행 중44개 videoID 모두 존재, raw timestamp를 KST로 대조한44개 날짜 변경0. title2는 시즌/부제일 수 있어 원제 검색에 사용하지 않음. 공식 영문 표시 제목을 videoID와 묶어 검색 별칭으로만 사용.
- www.netflix.com robots 일반 user-agent 제외를 확인한 뒤 직접 상세 배치 스크래핑을 중단. 웹 도구의 공개 페이지 조회를 사용했고 로그인/재생/계정 접근 없음. about.netflix.com 목록 페이지+공개 API 3페이지 읽기는 이번 초반 접근 관측이며 /api/ 경로에 대한 상시 자동 수집 허가를 뜻하지 않음.
- 공식 상세28 중 NFL 실시간 경기1건은 OTT 신작 게시 대상에서 제외, 나머지27건 실TMDB 재조회: 영화 날짜 일치8/시즌 날짜 일치6/날짜차이11/제목미발견2. 오류0. 검색잘림4(My Best Friend, Allen, Gordon, The Child) 별도 보존.
- 날짜 일치14 중 기존 검토 Alicia 1건 중복 제외, 검색잘림 Allen/Gordon2건 보류, 나머지11건 작성자 수동 검토 후 기존 후보 review·고정 work/event-000045~000055 매핑 추가. 최초매핑44→55.
- 알리시아의 법: 원 Netflix videoID82013595가 시리즈82013594로 redirect, 공식 TVSeries/numberOfSeasons1/시즌1 예고편, TMDB tv338562 시즌1 2026-11-11 일치. 기존 시즌1 검토와 일치 확인, 추가 게시0. redirect 자체만으로 시즌을 추정하지 않음.
- 날짜 차이가 있던 작품은 이번에 새로 게시하지 않음. 오버액션 갱은11/05, 가능한 사랑은11/06 기존 공식 한국 날짜 유지. Cunk on Cinema는 공식KR11/15 vs TMDB시즌11/12로 차이 보존. dateCreated/startDate를 한국 공개일로 대입하지 않음.
- 로컬 DB 실제 측정: 같은11~12월/KR/ott_reviewed/4서비스 범위42→53(+11), Netflix11월35→46. 연중전체 ott_reviewed55. 신규11건 모두date_only/instant_at=NULL, 원본season null/실제확인된1 보존.
- 임시 Nest API를127.0.0.1 임의포트로 시작해 GET /v1/events?schedule=dated&from=2026-11-01&to=2027-01-01&country=KR&categories=ott&limit=100 확인: HTTP200/53행/신규11ID모두존재. 수집스케줄비활성/가상데이터제외. 검사후임시API종료, 기존사용자서버변경없음.
- 같은55개매핑 재게시후 provider전체이벤트55/신규11건event_change11 유지. 중복 이벤트·변경이력 증가0.
- Node22.22.3 npm test149/149(기존dirty·미추적 포함working tree) 통과. package engines의Node24 재확인/실폰/클라우드/독립검증은미실행. 이번데이터게시는전체OTT수집이나통합PASS아님.
- HTTP 검사 중 pg의 동시 client.query 사용 deprecation 경고 관측. 검사 자체 성공, pg9 업그레이드 호환성 수정은 이번 범위에 포함하지 않음.

## 실제 명령·종료 코드

Node 명령은 `/Users/dojoohwan/.nvm/versions/node/v22.22.3/bin/node` 사용. API 키와 DB 비밀은 Git 제외 .env에서만 읽음.

| 실제 명령 | 종료 코드 | 관찰 결과·로그 |
|---|---|---|
| node --test tests/netflix-identity-aliases.test.mjs |0| 독립 합성 예시4/4: 공식ID/URL·시장·형식, 검색실패/오프라인·자동게시금지 |
| node --env-file=.env scripts/enrich-netflix-identity-aliases.mjs data/reference/netflix-official-identities-2026-11-12.json /private/tmp/godieor-data45/tmdb-alias-crosscheck.json --live |0| 27작품실조회, 44행보고서 |
| node --env-file=.env scripts/audit-ott-published.mjs data/reference/streampick-2026-11-12-gap11.json |0| 게시전42건, 참고11행일치7/날짜차이1/미게시3 |
| npm test |0| build+149/149, /private/tmp/godieor-data45/npm-test.log |
| node scripts/enrich-netflix-identity-aliases.mjs data/reference/netflix-official-identities-2026-11-12.json /private/tmp/godieor-data45/offline-final.json |0| 최종 관측44행 처리/외부조회0/게시0 |
| git diff --check (세 저장소) |0/0/0| 공백 오류 없음 |
| node /private/tmp/godieor-data45/apply-reviews.cjs |0| 공식입력11review, prepareReviewed55개사전검증 |
| node --env-file=.env dist/src/cli/publish-reviewed.js --file data/curated/ott-reviewed-mappings.json (2회) |0/0| 로컬55매핑게시, publish.log/publish-repeat.log |
| COLLECTION_SCHEDULE_ENABLED=false CATALOG_PROVIDER_ONLY=true node --env-file=.env /private/tmp/godieor-data45/verify-publication.cjs |0| SQL53건/신규11건+HTTP200, db-http-after.json |
| node --env-file=.env /private/tmp/godieor-data45/check-idempotency.cjs <before/after.json> |0/0| 이벤트55/신규변경이력11 그대로 |

## 재현 입력과 경계

- `data/reference/netflix-official-identities-2026-11-12.json`: 공식44건 시도·영문표시명·장르형식·원ID/redirect ID·시즌힌트. 표시명은 제작원제라고 주장하지 않음. detail은다른지역으로redirect될수있으므로한국날짜는KR공식목록에서만취함.
- `scripts/enrich-netflix-identity-aliases.mjs`: 해당공식ID에묶인영문제목만영어TMDB검색, 공식형식과다른종류검색배제, 오류/검색잘림표시. 한국제목/날짜보존, 시즌힌트로자동시즌확정하지않음, 자동게시0.
- `data/reference/netflix-identity-tmdb-crosscheck-2026-11-12.json`: 실TMDB결과; 회차전체날짜배열만제거, 날짜/ID/오류/잘림보존. query 당시의 관측에 사후 raw timestamp 보강은 포함되지 않아 observations의 동일 ID/제목/날짜별로 연결한다.
- `data/curated/netflix-kr-reviewed-identities-2026-11-12.json`: 재현가능한11개수동review·공식상세URL·TMDB정체성·고정mapping. 새환경에서는기존75개lineup bridge로후보state복원후 items[].review를기존review CLI에입력하고 전체mapping을publish한다. 로컬 후보state와DB는Git제외이며자동생성된독립정답fixture가아님.
- `data/reference/netflix-identity-publication-evidence-2026-11-12.json`: 작성자DB전/후·HTTP·재게시건수, 독립검증아님.

## 신규11건

| 제목 | 한국Netflix날짜 | 종류 | 시즌 | TMDB |
|---|---|---|---|---|
| 하이 엔드: 명품 시계 절도단 | 2026-11-05 | movie | 미지정 | movie/1817773 |
| 딜왈리 디왈리 | 2026-11-05 | movie | 미지정 | movie/1810711 |
| 저넬 제임스: 미치게 로맨틱 | 2026-11-10 | variety | 미지정 | movie/1820172 |
| 응급실의 기적 | 2026-11-12 | drama | 1 | tv/312661 |
| 네버 서렌더 | 2026-11-12 | movie | 미지정 | movie/1616687 |
| 크리스마스까지만 | 2026-11-12 | movie | 미지정 | movie/1757174 |
| 윈 더 몰: 쇼핑 전쟁 | 2026-11-18 | variety | 1 | tv/336592 |
| 롭 로: 아웃사이더 | 2026-11-24 | movie | 미지정 | movie/1802703 |
| 토스 판데르팔크 납치 사건 | 2026-11-26 | drama | 1 | tv/302837 |
| 타이슨 퓨리 | 2026-11-27 | movie | 미지정 | movie/1811599 |
| 샐리시의 12가지 크리스마스 게임 | 2026-11-28 | variety | 1 | tv/341600 |

## 독립검증용 고정 정보

- app/backend base는카드상단, 최종head는종료Git이력. API0.1.0-draft.2/마이그레이션집합/acceptance불변(아래실제digest). verifier base는카드상단, 공통문서사본만갱신.
- API·iOS기능변경없음. iOS빌드미실행(앱코드변경없음). 전체제품승인/독립review/서버배포미실행. 별도reviewer에는구현대화와이카드의판단을정답으로주입하지않고고정소스·독립기준·공식원천을제공할것.

| 입력 | SHA-256 |
|---|---|
| API | `e2e368a3b285ab0dae7d5f1d6f497c3de28ca0c099b2da10344a0a1a857e515c` |
| acceptance | `c4906283810c8b378800b67930028685a41b6a051923ea9f9415346b2d657063` |
| identity observations | `df104f71ad262055004315c847c89a48fee557600410fbf3e91817c40c36b81c` |
| curated reviews | `6149e66a427f7703f85bb7c368879a7089747942a6dfa9e7859aee0f327f0b32` |
| migrations (relative path + NUL + bytes + NUL) | `a6009a82ea00e08cfefa5d294ed40e2f5fb30a0e6e6807bf22e3db79217bb2e7` |

## 다음 세션 인계

- 상세실패16건은공식접근가능경로/작품정보추가확인. 라이브스포츠NFL은OTT게시에서제외상태유지. 검색미발견2(Mike Ward/Nate Bargatze)는공식제목변형·TMDB대체제목확인. 검색잘림4는연도/배우/제작국가등으로후보정체성좁히기.
- 날짜차이11개영문재조회결과는KR입점일/극장·해외방영일을분리해추가검토. 장르/시즌이확인안된게임·보너스콘텐츠를영화로자동게시하지않음.
- TVING/Disney+/Coupang공식원천확대, arrival유형설계, 클라우드/실폰/권장Node24/독립검증은별도후속. 기본계정·서명설정작업반복금지.
- app OTT전용인계+status/handoff와동일사본갱신. 기존dirty환경/서명/미추적도구보존. README기능변경없음.
- 담당해제codex-data45-01. 최종커밋은Git이력참조.

## 44건 공식 상세 조사표

| 한국제목 | videoID | 공식영문표시명 | 형식 | 조회상태 |
|---|---|---|---|---|
| 케이팝 데몬 헌터스: 플레이리스트 | [83135831](https://www.netflix.com/title/83135831) | 미확인 | unknown | web_tool_unavailable |
| 케이팝 데몬 헌터스: 보너스 콘텐츠 | [82661317](https://www.netflix.com/title/82661317) | 미확인 | unknown | web_tool_unavailable |
| 나의 베스트 프렌드 | [82046358](https://www.netflix.com/title/82046358) | My Best Friend | movie | observed |
| PAW Patrol: The Game | [83098128](https://www.netflix.com/title/83098128) | 미확인 | unknown | web_tool_unavailable |
| 이런, 북극! | [81997254](https://www.netflix.com/title/81997254) | 미확인 | unknown | web_tool_unavailable |
| 하이 엔드: 명품 시계 절도단 | [81904803](https://www.netflix.com/title/81904803) | High End: The Watch Theft Ring | documentary_movie | observed |
| 오버액션 갱 | [81993326](https://www.netflix.com/title/81993326) | Overacting | movie | observed |
| 딜왈리 디왈리 | [83167469](https://www.netflix.com/title/83167469) | Dilwali Diwali | movie | observed |
| ABC마우스 | [82878686](https://www.netflix.com/title/82878686) | 미확인 | unknown | web_tool_unavailable |
| 가능한 사랑 | [82106490](https://www.netflix.com/title/82106490) | Possible Love | movie | observed |
| WWE Crown Jewel | [82848233](https://www.netflix.com/title/82848233) | 미확인 | unknown | web_tool_unavailable |
| 좋은 변호사 | [81955038](https://www.netflix.com/title/81955038) | The Good Lawyer | movie | observed |
| Thomas & Friends: Whistle & Go | [82662589](https://www.netflix.com/title/82662589) | 미확인 | unknown | web_tool_unavailable |
| 저넬 제임스: 미치게 로맨틱 | [81751140](https://www.netflix.com/title/81751140) | Janelle James: How Romantic | stand_up | observed |
| 우당탕탕 공룡들 | [83312495](https://www.netflix.com/title/83312495) | 미확인 | unknown | web_tool_unavailable |
| 알리시아의 법 | [82013595](https://www.netflix.com/title/82013595) | Alicia's Law | series | observed |
| 리처드 애버던 | [83018004](https://www.netflix.com/title/83018004) | Avedon | documentary_movie | observed |
| 응급실의 기적 | [82027981](https://www.netflix.com/title/82027981) | Miracles of the ER | series | observed |
| 네버 서렌더 | [81996126](https://www.netflix.com/title/81996126) | Never Surrender | movie | observed |
| 크리스마스까지만 | [81625025](https://www.netflix.com/title/81625025) | The Christmas Switch | movie | observed |
| 앨런 | [81382720](https://www.netflix.com/title/81382720) | Allen | movie | observed |
| 스타 & 웨딩: 아넬레와 버자 | [83073031](https://www.netflix.com/title/83073031) | 미확인 | unknown | web_tool_unavailable |
| 머더 인 갈리시아 | [82023390](https://www.netflix.com/title/82023390) | 미확인 | unknown | web_tool_unavailable |
| 컹크의 색다른 영화 이야기 | [82171490](https://www.netflix.com/title/82171490) | Cunk on Cinema | series | observed |
| Mike Ward: Modest | [81697863](https://www.netflix.com/title/81697863) | Mike Ward: Modest | stand_up | observed |
| 고르돈 | [81657615](https://www.netflix.com/title/81657615) | Gordon | series | observed |
| 발렌치나의 열두 별자리 | [81289599](https://www.netflix.com/title/81289599) | 미확인 | unknown | web_tool_unavailable |
| 로 오브 비스트 | [81769098](https://www.netflix.com/title/81769098) | 미확인 | unknown | web_tool_unavailable |
| 윈 더 몰: 쇼핑 전쟁 | [81906730](https://www.netflix.com/title/81906730) | Win the Mall | reality_series | observed |
| 프라임타임 전도사$ | [81774139](https://www.netflix.com/title/81774139) | Primetime Preacher$ | documentary_movie | observed |
| 제 아들을 대신하여 | [81724626](https://www.netflix.com/title/81724626) | On Behalf of My Son | movie | observed |
| 캐런 리드 재판 | [81777232](https://www.netflix.com/title/81777232) | 미확인 | unknown | web_tool_unavailable |
| 세서미 스트리트 | [82641828](https://www.netflix.com/title/82641828) | 미확인 | unknown | web_tool_unavailable |
| 네이트 바가치: 이 정도면 잘했지 | [81735281](https://www.netflix.com/title/81735281) | Nate Bargatze: Good For Nathan | stand_up | observed |
| 마지막 주문을 받습니다 | [82980714](https://www.netflix.com/title/82980714) | One Last Order | documentary_movie | observed |
| 롭 로: 아웃사이더 | [81952500](https://www.netflix.com/title/81952500) | Rob Lowe: The Outsider | documentary_movie | observed |
| 모스키토 볼: 전장의 마지막 터치다운 | [81661161](https://www.netflix.com/title/81661161) | The Mosquito Bowl | movie | observed |
| NFL 넷플릭스 게임데이: 패커스 vs 램스 | [82917757](https://www.netflix.com/title/82917757) | NFL Netflix Gameday: Thanksgiving Eve, Packers vs. Rams | live_sports | observed |
| 토스 판데르팔크 납치 사건 | [81716315](https://www.netflix.com/title/81716315) | Toos: The Van der Valk Kidnapping | series | observed |
| 24시간 온콜 | [81763934](https://www.netflix.com/title/81763934) | 미확인 | unknown | web_tool_unavailable |
| 필리핀의 크리스마스 선물 | [82044874](https://www.netflix.com/title/82044874) | 미확인 | unknown | web_tool_unavailable |
| 그 아이 | [81780038](https://www.netflix.com/title/81780038) | The Child | movie | observed |
| 타이슨 퓨리 | [82046214](https://www.netflix.com/title/82046214) | Tyson Fury | documentary_movie | observed |
| 샐리시의 12가지 크리스마스 게임 | [82723082](https://www.netflix.com/title/82723082) | Salish's 12 Games of Christmas | reality_series | observed |
