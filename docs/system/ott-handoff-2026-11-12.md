## DATA-53 재개 · TMDB 수집·공식 교차검증 연결 (2026-11-16)

- 사용자 방향: 참고 일정 표시 변경보다 StreamPick 구성 방식을 역추적해 TMDB 기반 발견→TMDB/OTT 공식 루트 검증→배치 게시 연결을 우선한다. StreamPick은 참조 측정에만 쓰며 수집 입력으로 복제하지 않는다. 신작·시즌 첫 공개/회차 제외 유지.
- backend 코드/배치/근거 head c6ce3af89833265d9729b81bbb5be89894ec9f97. 독립 월별/한국예정작 발견312작품→공식 ID 보완325작품→현재 후보120행(누적123ID). 최신 참조52행의 후보 발견49행, 공식 재확인 후 기존 고정 키 결속39행. 실제 게시67행/제품 일치26/52로 전체 일치 목표는 미완료다.
- 시리즈 제공처 힌트/해당 시즌 제공처/시즌 첫날·첫회/공식 날짜·원문 신선성을 분리했다. 후보 미발견2(스폰지밥20·몰몬교주부들6)와 Netflix미확인1(나인투식스)은 보존한다. 애니 후보도 큐에서 숨기지 않고 범위 검토 표시. 공식 자동 파서는 Netflix/TVING 지원, 미지원·실패는 통과에 포함하지 않는다. OTT 정식API/StreamPick 내부 구현 확보라고 표현하지 않음.
- 현재트리·고정소스 Node24 서버183/183, Python9/9, 동일실제관측 재처리0신규/0수정. 고정소스 최초 Prisma Client 미생성 실패 후 generate→빌드/183통과로 구분 기록. 로컬 SQL/API67행/기존69이벤트·ID/이력 재확인. Coupang영화 provider미등재로 수집complete=false, 제품 일치 게이트도exit2 유지.
- 원본 backend docs/tasks/DATA-53-streampick-parity.md, 최신52행표 evidence/data53/2026-11-16/comparison.md, ADR-020/LEARN-0021. 다음은 공식 루트 미지원4/조회실패2 및 발견 후보의 근거·고정키 연결을 유형별 묶음으로 확대한다. 앱 달력 작업보다 OTT 우선 유지. 계약/migration/acceptance·이전 독립ERROR/4 SKIPPED 불변, 실폰/클라우드/신규독립검증 미실행. 개인dirty보존·담당해제, revision DATA-53-2026-11-16.

## DATA-53 · OTT 참조 누락 최우선·진행 (2026-11-13)

- 사용자 확정: StreamPick 신작·시즌 첫 공개 대조를 최우선, 회차 제외. 원본 backend `docs/tasks/DATA-53-streampick-parity.md`, 전체 대조표 `docs/tasks/evidence/data53/case-matrix.md`. 앱 달력 후속보다 먼저 처리한다.
- 기존 파서가 episode+premiere=true인 새 시즌26플랫폼행을 제외했다. 같은 최신 HTML 기존21→수정47행, 월별 페이지46/전체달력47 차이1행도 보존. 최초 DB63≥참조47이지만 정확14/47로 총수만으로는 보장 불가. 검토 별칭2·미상시즌4·공식 새시즌4를 묶어 처리해 정확24/47, DB67/연중69매핑으로 개선했다.
- SQL/API67행·새4/시즌보완4·기존61전체행/기존ID 보존·재게시 멱등 확인. 서버159/159·Python9/9. 한 명령 최신 대조/미달 exit2 게이트 추가, 실제 미일치23으로 exit2 유지. 애니4/공식날짜충돌1/정확한 목표OTT·시즌 일자 근거 부족18. 미확인 참고일정 표시 도입은 사용자 질문 중이며 아직 구현/확정하지 않음.
- 공통 revision DATA-53-2026-11-13. 계약/migration/acceptance·이전 독립runnerERROR/4 SKIPPED·review 대기는 불변. 실폰·클라우드·신규 독립runner 미실행, 개인dirty 보존. 전체 일치 목표는 미완료이며 미확인 날짜를 사실로 게시하지 않는다.

# GODIEOR OTT 수집·게시 인계 · 2026-11-13 (DATA-52 반영)

## 현재 실행 방향 · 2026-11-13 사용자 수정

추가 적재 반복은 중단한다. 이 문서의 과거 ‘다음 작업’ 목록을 현재 우선순위로 해석하지 않는다. 데이터 문제는 [통합 백로그](ott-batch-backlog.md) 유형별로 모아 근거가 준비된 배치만 처리한다. 현재 주 작업은 [제품 계획](plan.md)의 계정·설정·찜 사용 흐름 완성이다. 신규 수집/적재 없이 제품 결함 BE-AUTH-07을 수정했다. 아래 DATA 기록은 역사 관측으로 보존한다.


## DATA-52 뜨거운 안녕 공식 공개일 확인·로컬 게시 (2026-11-13)

- 원본 backend `docs/tasks/DATA-52-tving-release-evidence.md`, evidence/data52. 인증TVING공식SNS원문에서11/11독점공개와연도문맥을직접확인,공식작품P001793179과대조후1건게시. 게시시각을공개시각으로쓰지않고date_only/seasonNULL보존.
- 같은KR11~12월4OTT62→63,연중65매핑/이벤트. SQL·임시API200/63행/신규ID·공식작품출처확인. 재게시이벤트65/신규변경1유지,기존64개event전체행불변. Node24추적CJS+ESM156/156. source별staging176/반복신규0.
- 나머지TVING3개(보스의노골적취향/내새끼의연애3/브라더스)는정확한첫날보류. 앱/코드/계약/migration/승인기준변경없음. 신규fixed runner/실폰/클라우드/독립검증미실행,DATA-51전체ERROR유지. 다음은남은3개와기존목표OTT미확인근거보강. 개인dirty보존·담당해제.

## DATA-51 문무 티빙 공개일 확인·로컬 게시 (2026-11-13)

- 원본 backend `docs/tasks/DATA-51-tving-dates.md`, `docs/tasks/evidence/data51/`. 공식 티빙 작품·이번 주 일정에서 문무 11/14 공개를 확인해 TVING 별도 이벤트로 게시했다. 같은 11~12월 KR 4OTT 범위 61→62건, 연중 매핑/이벤트64건. 시각·시즌 번호는 추정하지 않아 date_only/instantNULL/seasonNULL로 보존했다. Netflix 문무 후보의 날짜는 여전히 미확인이다.
- 공식 TVING 작품 permalink를 수동 검토 출처로 지원(자동 피드 추가 아님). 다른 호스트·login/player/live·임의query와 다른 플랫폼 게시를 차단했다. 관련38/38 및 Node24 추적 전체156/156, 고정 커밋 재시도 서버156/156·unsigned iOS·임시DB migration/반복수집/API 검사 성공. 최초 Prisma 생성 ECONNRESET 후 재시도 성공 이력도 보존했다.
- SQL·임시HTTP200/62행/신규ID·출처·원 날짜 확인. 재게시 이벤트64/신규변경이력1 유지, 기존63개 event 전체행 불변. source별 staging175/재실행 신규0. 나머지 티빙4개 첫날은 보류한다. 계약/migration/승인 기준 변경 없음.
- 최종 runner ERROR: secret-check 환경변수 참조 탐지1건, 필수4개 SKIPPED, 독립review/acceptance승인 대기. 실폰 최신 표시·클라우드·OS격리 검증 미실행. 중단된 근거 저장·인계·커밋을 후속 사용자 요청으로 마무리했다. 기존 개인dirty 보존, 담당 해제.

## DATA-50 공식 후보 5개 추가·PAW 게임 식별 (2026-11-13)

- 원본 backend `docs/tasks/DATA-50-official-gap-review.md`. 공식Netflix game83098128→AppStore6818349835와정확한제목·개발자·Games를대조해PAW의정체성미확인을해결,OTT에서게임제외(Academy별칭아님). 게임일정게시0.
- 오늘CJ공식TVING추천작5개를정확한날짜null/첫공개미확정후보로추가: staging169→174,반복신규0. 문무TVING제공근거를NetflixKR날짜로이식하지않음. 전지적집착·문무Netflix·나인투식스Netflix3개는목표OTT일자미확인유지.
- 관련기존18/18통과,SQL읽기61건/연중63건재확인,제품신규게시0·검토state/게시매핑hash불변. 앱/계약/migration/runtime변경없음. 전체검사/독립runner/실폰/클라우드재실행없음,이전ERROR유지. 다음: TVING5개정확한첫날확보/3개날짜미확인근거보강. 개인dirty보존·담당해제.

## DATA-49 다큐 시리즈 1건 로컬 게시 (2026-11-13)

- 원본 backend `docs/tasks/DATA-49-reviewed-documentary.md`, evidence/data49. 로컬DB에 기존다큐migration적용 후 `캐런 리드 재판` Netflix KR11/23·시즌1·documentary/series를명시검토해게시. 같은11~12월KR4OTT60→61, Netflix11월54, 연중전체매핑/이벤트63. 신규1건date_only/instantNULL. 기존62개event전체row불변확인.
- SQL·임시API200/61행/다큐상세·날짜·시즌·출처·달력확인. 재게시이벤트63/신규변경이력1유지. Node24추적CJS+ESM154/154(working tree검사,기존미추적제외). 런타임코드/계약/migration파일/앱변경없음. 공식KR날짜는11/12저장관측,오늘공식Tudum·title에서시리즈형식/날짜재대조.
- DATA-48 secret-rule환경변수참조1탐지·SKIPPED/ERROR는미해결그대로, 신규독립runner/실폰/클라우드/OS격리미실행. 다음: 다른OTT공식근거확대/PAW정체성/날짜의미검토·독립finding검토. 기존개인dirty보존,담당해제.

## DATA-48 기록 검산·Node24 고정소스·다큐 지원 (2026-11-13)

- 원본 backend `docs/tasks/DATA-48-ott-support-alignment.md`, evidence/data48. 실제KR11~12월4OTT60건/고정매핑62건 재검산, 신규게시0. 사용자 영화·시리즈·예능·다큐 확정에 따라 product/검토형태/정규화/새migration/API분류/iOS다큐배지 구현. 실제개발DB migration/다큐후보게시 미실행.
- 검증기 ESM누락·가상수집smoke설정 수정, 계약manifest/소비자참조/options버전 동기화(draft.4). Node24 고정HEAD 서버154/154, verifier109/109, unsigned iOS/임시DB migration·반복수집/API/다큐DDL12경계/Swift해석 성공. 검사HEAD·digest는원본카드. 기존dirty포함 Node22결과와 구분.
- 최종runner ERROR/exit3: secret-check가 실제키가 아닌runtime 환경변수참조1건을탐지(판정유지), 필수4항목SKIPPED/독립review대기/acceptance미승인. 독립PASS·OS격리·클라우드·최신실폰관찰 아님. 다음은literal규칙검토와로컬migration후다큐검토게시, 다른OTT공식근거확대. 기존개인dirty보존, 담당해제.

## 읽는 순서와 작업 경계

1. AGENTS.md, app docs/system/status.md, docs/system/handoff.md.
2. 이 문서, backend docs/tasks/DATA-52-tving-release-evidence.md, DATA-51-tving-dates.md.
3. 이전 근거가 필요하면 DATA-46-netflix-search-disambiguation.md, DATA-45-netflix-official-identities.md, DATA-43-netflix-reviewed-batch.md, DATA-44-netflix-review-backlog.md.

DATA-47 시작 기준: app `81d1d20` / backend `f7480e4` / verifier `b3c9721`. 작업 브랜치는 세 곳 모두 `codex/data47-netflix-official-recovery`다. 현재 HEAD는 각 저장소에서 다시 조회한다. 기존 app 개인 signing pbxproj, backend .env.example/package.json과 audit 관련 미추적 4개 파일은 보존했다. 공통 status/handoff 원본은 app이고 backend/verifier 사본을 동일하게 유지한다. 동시 작업은 별도 브랜치/worktree로 분리한다.

## 최신 실제 결과 · DATA-47 (2026-11-13)

- 과거 공식 상세 실패16개 원URL을 재조회한 웹 도구는 모두 실패했지만, 공개 브라우저에서는12개가 실제 콘텐츠 페이지로 redirect됐고4개는NSES-404였다. 별도 공식 도움말로3개 게임을 확인했다. 로그인·재생 클릭·계정 변경 없이 화면 제목/장르/URL만 읽었다.
- 일반 시리즈·예능·다큐8건의TMDB 대조에서 단일 시즌날짜 일치6/차이2를 확인했다. 드라마4건은 공식 배우 최소2명·국가까지 일치했다. 처음6개 검토 중documentary가 게시 스키마에서 거부됐고 후보state/매핑 보존을 확인한 뒤 지원되는5개만 게시했다.
- 신규5건: 스타 & 웨딩: 아넬레와 버자11/13, 머더 인 갈리시아11/13, 발렌치나의 열두 별자리11/18, 로 오브 비스트11/18,24시간 온콜11/26. 모두 실제확인된시즌1/date_only/instant_at=NULL이다.
- 같은11~12월/KR/4OTT/ott_reviewed 로컬 범위 **55→60건(+5)**, Netflix11월53건, 연중전체 고정매핑/이벤트62건. SQL·임시API200/60행/신규5ID 확인 후 임시API종료. 재게시이벤트62/신규변경이력5 유지. Node22 전체154/154(기존dirty포함) 통과, 권장Node24/독립검증/클라우드/실폰 미실행이다.
- 16건 최종 결과는5게시/1게시유형미지원/2날짜차이/3게임/2영상모음집/1Volume/1레슬링/1정체성미확인이다. 과거16건 전체를 단순 조회실패로 계속 표현하지 않는다.
- 캐런 리드 재판은 공식 다큐 시리즈/첫 날짜 근거를 확보했지만 현재reviewSchema·Canonical/API ottCategory가documentary를 지원하지 않아 보류했다. 후보lineup에 분류를 저장할 수 있다는 사실과 게시 지원은 다르다. 유형을 다른 이름으로 바꾸거나 enum 하나만 늘리지 말고 제품/계약/정규화/iOS 영향을 검토한다.

## 이전 DATA-46 실측 · 2026-11-13

- 기존 검색잘림4건과 제목 미발견2건을 공식 배우·제작국가·연도로 재대조했다. 연도 제한 검색은 모두 끝까지 확인했고, 6건 결과는 날짜/정체성 일치2, 정체성 일치·날짜차이2, 상세 정체성 미확인1, 제목 미발견1이다.
- **앨런**(movie1518204, 공식 배우3명/AU,11/12)과 **고르돈**(tv340280, 공식 배우3명/AR,시즌1,11/18)을 수동 검토·로컬 게시했다. 한국 날짜는 DATA-43의 공식 KR 목록 관측을 유지했고, 해외 보도자료만으로 생성하지 않았다.
- 같은11~12월/KR/4개OTT/ott_reviewed 로컬 범위 **53→55건(+2)**, Netflix11월48건, 연중 전체 고정 매핑/이벤트57건이다. 신규2건은date_only/instant_at=NULL, 시즌null/1이다.
- SQL과 임시 로컬API(HTTP200/55행/신규2ID) 확인 후 임시API를 종료했다. 재게시 전후 이벤트57/신규2건의변경이력2로 동일했다. Node22.22.3 작성자 검사154/154 통과(기존dirty포함), 권장Node24/독립검증/실폰/클라우드 미실행이다.
- My Best Friend의 미국 동명작과 The Child의 라트비아 동명작을 배우/국가로 배제했다. 맞는 브라질/스페인 작품을 찾았지만 각각TMDB09/03 vsKR11/02, TMDB11/13 vsKR11/27이라 게시하지 않았다.
- Nate Bargatze 후보1824177은 상세 날짜·출연진이 비어 있어 보류했다. Mike Ward: Modest는 연도 제한/해제 검색에서 정확한 제목을 찾지 못했다. 과거4건을 더 이상 검색잘림 상태로 표시하지 않는다.

## 이전 DATA-45 실측 · 2026-11-12

- DATA-45에서 로컬 PostgreSQL의 **2026년 11~12월 KR 4개 OTT 일정 42→53건(+11)**을 실제 SQL로 확인했다. Netflix 11월은35→46건, 연중 전체 ott_reviewed 고정 매핑/이벤트는44→55건이다. 신규11건은 영화·예능·시리즈로 검토한 작품이며 시리즈 시즌은 실제 확인된1, 영화·단독 스페셜은null을 보존했다. 모두 date_only이고 instant_at은NULL이다.
- 임시 로컬 API의 GET /v1/events 기간 조회는HTTP200/53행이며 신규11개ID가 모두 포함됐다. 검사 후 임시API를 종료했다. 기존 서버·iPhone 설치는 변경하지 않았다.
- 같은55개 매핑을 다시 게시해도 이벤트55건/신규11건의 변경 이력11건으로 동일했다. Node22.22.3 전체 작성자 검사149/149 통과(기존 dirty 포함 working tree). 권장Node24, 독립 verifier, 클라우드, iPhone 신규 표시 확인은 미실행이다.

## DATA-44의44건을 어떻게 이어받았는가

- 공식 Netflix 한국 월간 목록75건 중 기존 TMDB 날짜 단일 매칭31건을 제외한44건이 DATA-44 조사 대상이었다. 당시 한국어 검색 미발견33건, 후보 날짜 이전10건, 이후1건이다. 이는 실제 미게시 수가 아니다.
- 이번에는44개 videoID의 공식 상세를 모두 조회 시도했다. 영문 표시명·형식 확인28건, 웹 도구 fetch 실패16건이다. 미발견33건 중22건, 날짜차이11건 중6건에서 상세를 확인했다. fetch 실패는 Netflix에 작품이 없다는 뜻이 아니다.
- 공식 상세의 영문 제목을 videoID와 묶어 TMDB를 재조회했다. 목록 title2는 시즌/부제일 수 있어 원제로 쓰지 않는다. 상세에서 다른 국가로 redirect되더라도 한국 날짜는 공식KR목록에서만 가져온다. JSON-LD dateCreated/startDate나 예고편 시즌을 한국 첫 공개일로 대입하지 않는다.
- 상세 확인28건 중 NFL 생중계1건은 OTT 신작 게시 대상에서 제외했다. 나머지27건의 TMDB 재조회는 날짜 일치14, 날짜 차이11, 제목 미발견2다. 날짜 일치14 중 기존 알리시아의 법1건과 검색잘림 Allen/Gordon2건을 제외한11건을 작성자 수동 검토·게시했다. 보고서 자체는 자동 게시하지 않는다.
- 알리시아의 법은 videoID82013595→시리즈82013594, 공식 시즌1/TVSeries와 TMDB tv338562 시즌1 11/11이 일치해 기존 시즌1 검토를 재확인했다. 중복 게시하지 않았다.
- 오버액션 갱은 공식KR11/05, 가능한 사랑은11/06을 유지한다. TMDB 극장/해외 날짜로 덮어쓰지 않는다. 날짜 차이가 있는 작품을 이번에 신규 게시하지 않았다.

## 다음 작업 순서 (DATA-52 이후)

1. 세 저장소 HEAD/dirty와 후보state/로컬DB를 확인하고 같은KR/11~12월/provider/4서비스63건(연중65매핑)을기준으로진행한다. 개인설정·미추적도구를보존한다.
2. 다큐지원설계(DATA-48)와로컬migration/캐런리드검토·게시(DATA-49)는완료했다. 다른OTT공식한국최초공개근거를확대하고충분한경우에만추가review→고정mapping→게시→SQL/API/멱등성확인한다. secret룰runtime참조탐지검토/독립필수검사는별도미완료다.
3. **PAW Patrol: The Game**은 DATA-50에서 공식게임route와AppStore ID로정확히게임식별완료. OTT첫공개에서제외하며 Academy와합치지않는다. 같은정체성조사를반복하지말고 문무 TVING 11/14는 DATA-51에서 게시했다. 뜨거운 안녕 TVING11/11은 DATA-52에서 게시했다. 남은 보스의 노골적 취향·내 새끼의 연애3·브라더스 3개의 정확한 TVING 첫날을 확보한다. ABCmouse/Thomas & Friends: Whistle & Go/Bad Dinosaurs는 공식 도움말상 게임이다. KPop2개는영상모음집, Sesame Volume4는시즌4 근거가 아니며 WWE는레슬링 묶음이므로 OTT첫공개로 자동 게시하지 않는다.
4. **이런, 북극!**은KR11/05 vsTMDB시즌2 09/08, **필리핀의 크리스마스 선물**은KR11/26 vsTMDB시즌1 12/03 차이가 남았다. 다른 날짜차이 건도 한국첫제공일/입점일/극장·해외방영일을 분리한다. arrival 유형은별도ADR/계약/migration/iOS 검토가 필요하다.
5. TVING/Disney+/Coupang 한국 공식 원천을 확대하고 근거가 있는 후보만review→고정mapping→로컬publish→SQL/API/멱등성 확인한다. Mike Ward 대체제목과 Nate 상세날짜/출연진은 새 공식 근거나 원천갱신이 있을 때 재조회한다. 클라우드·실폰·독립 검증은 실제 실행 전에 완료로 표현하지 않는다.

StreamPick 참고11건은 일치7/공식 날짜 차이1/한국OTT날짜 미확인3 상태다. 미확인3은 전지적 집착 시점(TVING11/08), 문무(Netflix11/14), 나인 투 식스(Netflix11/25)다. 방송 시작일만으로 해당OTT 제공일을 확정하지 않는다. 참고 달력885이벤트(회차849+신작36)와 GODIEOR 첫 공개/입점 건수를 같은 모수로 비교하지 않는다.

## 재현 파일과 명령

backend 원본:

- docs/tasks/DATA-47-netflix-official-recovery.md:16건 복구·분류·5건 게시·다큐 유형 거부·실제 명령/digest.
- data/reference/netflix-official-recovery-2026-11-13.json:공식 브라우저redirect/형식·게임도움말·보류 근거.
- data/reference/netflix-official-recovery-tmdb-2026-11-13.json:8건실조회,4건추가배우/국가 대조 입력과결과.
- data/curated/netflix-kr-reviewed-recovered-2026-11-13.json:5개수동review·고정mapping, 유형미지원1개blockedItems. DATA-47 당시전체는62개이며 현재63개다.
- data/reference/netflix-official-recovery-publication-evidence-2026-11-13.json:16건최종상태·preflight거부·SQL/API/재게시작성자증거.
- docs/reviewed-publish.md:후보 분류와 게시 지원 유형의 차이. verifier/docs/learning/entries/0011-reviewed-candidates-to-events.md에구현담당관측연결.

이전 DATA-46/45 파일은 관측·재현 경로로 보존한다:

- docs/tasks/DATA-46-netflix-search-disambiguation.md:6건의 조사·보류 사유,2건 게시, 실제 명령과고정digest.
- scripts/disambiguate-netflix-tmdb.mjs / tests/netflix-disambiguation.test.mjs:공식 배우·국가·완료한 검색·상세/시즌 날짜 대조, 자동 게시 없음.
- data/reference/netflix-disambiguation-input-2026-11-13.json 및 netflix-disambiguation-report-2026-11-13.json:공식 사실과 실TMDB보고서.
- data/curated/netflix-kr-reviewed-disambiguated-2026-11-13.json:신규2건의수동review·고정mapping. DATA-46 당시전체57개였으며 현재 ott-reviewed-mappings.json은63개다.
- data/reference/netflix-disambiguation-publication-evidence-2026-11-13.json:작성자SQL/API/멱등성증거.

아래 DATA-45 파일은 이전 관측·복원 경로로 보존한다:

- docs/tasks/DATA-45-netflix-official-identities.md:44건 조사표,11건 게시표, 실제 명령·검사·digest.
- data/reference/netflix-official-identities-2026-11-12.json:공식ID에 묶인 수동 상세 관측. 영문 표시명은 제작 원제라는 뜻이 아니다.
- scripts/enrich-netflix-identity-aliases.mjs 및 tests/netflix-identity-aliases.test.mjs:영문 별칭의 읽기 전용 TMDB대조, 합성 경계 검사.
- data/reference/netflix-identity-tmdb-crosscheck-2026-11-12.json:실TMDB관측(오류/잘림 유지).
- data/curated/netflix-kr-reviewed-identities-2026-11-12.json:11개 수동review·TMDBID·고정mapping.
- data/curated/ott-reviewed-mappings.json:현재전체65개 고정 매핑(DATA-45때55개,DATA-46때57개,DATA-47때62개,DATA-49때63개,DATA-51때64개). 후보state는Git제외이므로 새 환경은 원본75개lineup bridge와 각 curated review로 복원한다.
- data/reference/netflix-identity-publication-evidence-2026-11-12.json:작성자SQL/API/재게시 증거. 독립 정답fixture·verdict가 아니다.

```sh
cd /Users/dojoohwan/workspace/godieor-backend
node --test tests/netflix-disambiguation.test.mjs
# 키가 설정된 경우에만 실행하는 읽기 전용 실조회. 출력 파일은 새 경로 사용.
node --env-file=.env scripts/disambiguate-netflix-tmdb.mjs data/reference/netflix-disambiguation-input-2026-11-13.json /private/tmp/godieor-next-disambiguation.json --live
# 로컬 DB 읽기 전용 비교:
node --env-file=.env scripts/audit-ott-published.mjs data/reference/streampick-2026-11-12-gap11.json
# 검토·고정 매핑·후보state가 준비된 경우에만 의도적으로 로컬 DB에 게시:
# node --env-file=.env dist/src/cli/publish-reviewed.js --file data/curated/ott-reviewed-mappings.json
```

권장Node는package.json engines 기준이다. DATA-47의Node22 결과를 권장Node24 검증으로 표현하지 않는다. 전체154개 검사는 기존 dirty/미추적 파일을 포함한 당시 작업 트리 기준이다.

요구사항 PROD-005/006/007/009(GD-005/006/007/009). 계약0.1.0-draft.2 digest `e2e368a3b285ab0dae7d5f1d6f497c3de28ca0c099b2da10344a0a1a857e515c`, migration집합 digest `a6009a82ea00e08cfefa5d294ed40e2f5fb30a0e6e6807bf22e3db79217bb2e7`은 DATA-47에서 재확인했고 변경하지 않았다. verifier acceptance는draft/미승인 그대로다. 새로운 독립review에는 구현 대화·작성자 판단을 정답으로 주입하지 않는다. 담당codex-data47-01은 종료 시 해제한다.
