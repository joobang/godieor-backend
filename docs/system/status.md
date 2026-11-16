## DATA-62 · TVING 공식 예정작→TMDB→후보·기존 DB 게시 연결 (2026-11-16)

- backend `docs/tasks/DATA-62-tving-official-review-bridge.md`: TVING 공식 프로그램·TMDB 시즌 근거를 공통 후보 저장소에 연결. 실제 공식 보고서9건 재생으로 신규 후보5, 검토 기록 보존4, 신규 게시0. 기존 reviewed 70매핑 로컬 DB 재게시 성공, 자체 테스트169/169. 최초 한국 OTT 공개 검증이 남은 신규 후보는 미게시. 전체 자동 게시·독립검증 미완료. revision DATA-62-2026-11-16.

## DATA-59 · StreamPick 첫 공개 비교 의미 검증 (2026-11-16)

- backend 원본 `docs/tasks/DATA-59-first-release-parity-semantics.md`. 11~12월 저장된 제3자 참조 52행(신작25·시즌첫날27, 일반 회차 제외)을 로컬 DB 68행과 다시 대조: 정확26/52, 날짜 차이2, 미게시24. 새 게시0. Netflix 공식 KR 목록과 참조 날짜가 다른 오버액션 갱(11/04↔11/05), 네버 서렌더(11/11↔11/12)는 한국 공식 쪽 날짜를 보존한다.
- 동일 일자 중복 신작·시즌 카드 제거, 보조 집계 시즌 프리미어 포함, 시즌 다름과 날짜 다름 분리, 전체 26 미일치 비교표 생성. Node24 162/162·Python12/12 통과; 실시간 StreamPick DNS 실패, DB는 승인된 읽기 경로로 조회. 신규 독립 검증/클라우드/iOS 실행 없음, 승인 기준·계약 불변.
- 다음: 미게시24행에 한국 공식 OTT 시즌 최초 제공일 증거 보강·검토 후 게시. 제3자 참조 날짜로 강제 게시하지 않음. 공통 revision DATA-59-2026-11-16.

## DATA-56 · OTT 애니 지원·기존 분류 전수 보정 (2026-11-16)

- 사용자 확정: ‘애니도 포함해 OTT 전체 대조’. 영화·시리즈·예능·다큐·애니를지원하며일반회차는제외한다. 원본 backend `docs/tasks/DATA-56-ott-animation-support.md`, ADR-021/LEARN-0011·0021.
- 애니영화/시리즈를명시형태로검토·정규화하고새DB제약/API초안draft.5/앱‘OTT · 애니’표시까지연결했다. 기존70개전수대조에서스텝스·풀나이트·두지의멍멍하우스·배스X마키나4개분류만보정. 기간68행/연중70이벤트/신규0,전체ID·일정·다른66전체행/이력보존·재게시멱등확인.
- 최신참조52행중애니는전체6/미일치5행이다(초기질문의5는미일치수). 정확26/52·미일치26·gateexit2유지,애니범위를넓혔다고근거없는5행을게시하지않았다. 독립TMDB현재120/누적124ID/48fresh(이전45),새형태힌트필드도입120revision/실제관측replay0신규·0수정. Coupang영화provider미등재incomplete유지.
- backend코드46751285a88f96ac88ea719a4e5daff791d96a5a:현재트리/고정소스전체218/218,Prisma생성→빌드성공. app코드8b5e17d549ff91011be4ebe8653e5d149c1033cd의개인서명변경제외unsignediOS빌드성공,가상애니JSON해석/표시검사성공. 일회용DB분류경계18/18·로컬migration/SQL/API확인. 최초검사도구의경로/상세래퍼오류2개는수정후재실행으로구분.
- 계약draft.5 manifestSHA256 0ffd7cbcdcb3c46b450e626ced90055e985308d728c279832aa00ec76b24e9c9, migration digest ec6966538bd599bf0dcee21ec0e0fb03a63b513ae01654d52b9e2badf5697fd7. app/verifier소비자참조는같은고정backend지문검사완료. acceptance/verdict·이전ERROR/4SKIPPED불변,새독립runner/리뷰·실폰/클라우드미실행. 개인dirty보존·담당해제,공통revision DATA-56-2026-11-16.
- 다음은52행전수표 evidence/data56/case-matrix.md의미일치26행을목표OTT/시즌첫날근거별로보강한다. 애니5행도동일기준이며총수/분류지원/후보증가를누락해소로세지않는다. 공식homepage진단은읽기전용이며자동연결구현완료가아님.

## DATA-55 · 공식 출연진 식별 보강·검토 배치 (2026-11-16)

- backend 코드 `3a5a4dd62040cded2b184cf84d073ed4fc6ea8fc`, 원본 `docs/tasks/DATA-55-ott-identity-evidence.md`, ADR-020/LEARN-0021. 사용자 최우선 OTT 신작·시즌 참조 누락 해소는 진행 중이다.
- 출연진이 없는 TVING후보에 같은제목·프로그램ID의 공식tvN출연진을 보강하고 TMDB명시별칭을 대조한다. 한출연진을다른TMDB인물2명으로 세던 합성오류를 일대일매칭으로 수정했다. 방송사날짜는식별에만 쓰고 OTT날짜로옮기지않음. 그룹→개인추정·부제만으로병합하지않음.
- 예정작9개 전체대조에서 기존4/신규검토가능1/미확정2/공연1/정확일자없음1. 검토가능전체를 기존경로로 게시: 그냥사람친구 TVING KR11/27 시즌1, 공식명시일자·tvN출연진5명·TMDB첫날/첫회 일치. 로컬기간67→68행/연중69→70이벤트. 기존69ID·전체행·이력불변/재게시중복0. 재수집 신규제안0.
- 최신참조52행/정확26행으로 parity exit2 유지. 신규작품은참조목록에없으므로미일치26해소로세지않는다. 독립TMDB현재120/누적124ID,공식연결50중49재확인·기존키45fresh(이전44),동일관측replay0신규/0수정. Coupang영화provider미등재의incomplete유지.
- Node24현재트리215/215·커밋고정CLI46/46. 최초보조파서null모듈실패→반례추가/수정,로컬pg향후비호환경고는기록. 고정전체215/iOS/폰/클라우드/독립runner미실행. 계약/migration/acceptance·이전ERROR/4SKIPPED불변. 개인dirty보존·담당해제, 공통revision DATA-55-2026-11-16.
- 다음: 미일치26행의 목표OTT·시즌 첫날 근거를 유형별로 확보하고, 아불시대사정확제목미발견/가금채번역출연진·그룹명문제/기프트월만표시는 미해결로 보존한다. 준비안된날짜를게시하거나 참조행을수집입력으로복제하지않는다.

## DATA-54 · 공식 루트 파서·공개예정 배치 보강 (2026-11-16)

- 사용자 우선순위는 OTT 신작·시즌 첫 공개의 참조 누락 해소다. backend 코드 `45695865fd07362a330328b78c70f9e8bc699020`, 원본 `docs/tasks/DATA-54-official-route-parsers.md`, ADR-020/LEARN-0021. StreamPick은 측정용이며 수집 입력으로 사용하지 않는다.
- TVING 프로그램 P ID와 응답의 에피소드 E ID를 구분하고 Disney+ 한국 공개 배너·Netflix 한국 공지·CJ 공식 기사 파서를 추가했다. 같은 원문6개에서 기존 미지원4/식별오류2→날짜 일치5/명시일자 없음1. 실제 공식49개 재조회48일치/1명시일자 없음, TMDB와 함께 기존 고정키에 결속한 재검증39→44행. 신규 게시 증가가 아니다.
- 공개 TVING 홈 공개예정9개 전체→프로그램 명시문구→TMDB 정체성 대조를 연결했다. 기존검토3/기존다른공식출처1/정체성미확정3/공연1/월만표시1. 후보9개 staging176→185, 반복신규0/전부첫공개미확정. 가금채 공식11/18과 내부메타데이터11/16을 구분하며 내부값을 방송일로 확정하지 않는다. 기프트는12월만 명시돼 날짜null 유지.
- 새 제품 게시0, 로컬 SQL/API67행·연중69이벤트/기존ID·전체행·이력 불변. 최신 StreamPick52행/정확26행으로 parity exit2 유지. 후보현재120/누적123ID, 실제동일관측재처리0신규/0수정. Coupang영화 provider미등재로 수집complete=false도 유지.
- Node24 전체 현재트리204/204, 커밋 고정소스 파서/수집 관련35/35. 고정소스 전체서버204·신규iOS빌드·독립runner·실폰·클라우드는 미실행. 계약/migration/acceptance 및 이전 독립ERROR/4 SKIPPED 불변. 개인dirty보존, 담당해제, 공통 revision DATA-54-2026-11-16.
- 다음은 최신 미일치26행을 공식근거/식별/날짜의미/범위별로 유지하면서, 번역·별칭 출연진/출연진 부재/정확제목 미발견의 공통 식별 보강과 목표OTT 공개일 근거 확보를 묶음으로 처리한다. 재검증44행이나 후보9개를 실제 누락 해소로 계산하지 않는다.

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

## APP-AUTH-13 · 앱 계정 흐름 묶음 수정 (2026-11-13)

- 원본 app `docs/ai/tasks/APP-AUTH-13.md`, ADR-003/LEARN-0020. 실제 AccountState 합성15개 시나리오에서4실패→수정15/15. 새 계정의 이전 설정·찜 잔류, 로그아웃 busy 잔류, 이전 defer의 새 busy 해제, 지연 설정 응답 덮어쓰기를 수정했다. 초기 오프라인 복원 재시도/active 재조회 UI 추가.
- 코드 head dc3bab01d675e1fff28c8265dcf6d07606866992의 개인 pbxproj 제외 고정 소스 unsigned iOS 빌드 성공(CoreSimulator 서비스 경고, UI 실행 아님). 합성 HTTP/저장소/인증으로 검사했으며 실 Google·Keychain·폰/기기간 왕복·신규 독립runner는 미실행. 계약/migration/승인 기준·이전 ERROR/4 SKIPPED·review 대기 불변.
- 제품DB 접근/신규 적재0. 다음은 달력→목록→상세·설정 복원의 빈 결과/실패/지연/마지막 성공 흐름 묶음이다. 앱 실제계정 왕복과 독립검증은 남은 범위로 유지. 개인 dirty 보존, 담당 해제. 공통 사본 revision APP-AUTH-13-2026-11-13.

## 제품 완성 우선 전환 · BE-AUTH-07 (2026-11-13)

- 사용자 지적에 따라 작품별 추가 적재 반복을 중단했다. plan.md를 계정 사용 흐름·달력/상세·실제 조합 검증 중심으로 갱신하고, 데이터는 ott-batch-backlog.md의 원인 유형별 배치로 분리했다. 이번 신규 수집/게시0, 제품DB 접근 없음. DATA-52의 기간63건/연중65매핑은 이전 관측이다.
- backend `docs/tasks/BE-AUTH-07-consistent-account-snapshots.md`: 설정·찜 items/version의 읽기 혼합과 설정 저장 응답이 다음 기기의 값으로 바뀌는 결함을 수정했다. 실제 일회용DB/두연결의 합성 동시 실행에서 이전코드2실패→수정2통과, 관련6/6·전체156/156 통과. 실제 사용자 장애/폰 실험으로 표현하지 않음.
- 다음 작업은 앱의 로그인/세션 복원→필터 저장·복원→찜→계정전환·로그아웃/실패 흐름 검증이다. 데이터 추가로 돌아가지 않는다. 계약/migration/승인기준 불변, 이전runnerERROR·독립검증/실폰/클라우드 미완료 유지. 기존 개인dirty 보존, 담당 해제.

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

## DATA-47 공식 상세 복구·Netflix 5건 로컬 게시 (2026-11-13)

- 원본 backend `docs/tasks/DATA-47-netflix-official-recovery.md`. 이전16건을 공개 브라우저로 확인:12콘텐츠redirect/4NSES-404, 공식도움말3게임확인. 최종5게시/1유형미지원/2날짜차이/3게임/2영상모음집/1Volume/1레슬링/1정체성미확인. 기존코드로8건TMDB·4건배우/국가 대조, 런타임코드변경없음.
- 실제11~12월KR4OTT55→60(+5), Netflix11월53, 연중전체매핑/이벤트62. SQL·임시API200/60행/신규5ID, 재게시이벤트62/신규변경이력5 유지. Node22 자체154/154(기존dirty포함). 캐런리드다큐는현재게시유형미지원으로preflight거부, 후보state/57매핑보존확인후지원5건만반영. 계약/앱/migration/verdict 불변, LEARN-0011작성자관측추가. 다음은다큐유형변경안·PAW정체성·다른OTT공식근거확대. 클라우드/실폰/권장Node24/독립검증미실행, 기존dirty보존.

## DATA-46 동명 작품 재대조·Netflix 2건 로컬 게시 (2026-11-13)

- 원본 backend `docs/tasks/DATA-46-netflix-search-disambiguation.md`. 검색잘림4/제목미발견2를 공식 배우·국가·연도로 대조. 앨런·고르돈2건 검토/게시, 동명 다른 작품2건 배제 후 날짜차이 유지, Nate 상세 메타데이터 부족/Mike 제목 미발견 보류. 기존4건 검색잘림은 해소.
- 실제11~12월KR4OTT53→55(+2), Netflix11월48, 연중매핑/이벤트57. SQL·임시API200/55행/신규2ID, 재게시이벤트57/신규변경이력2 유지. Node22 자체154/154(기존dirty포함). 계약/앱코드/migration/승인기준 불변, 클라우드/실폰/권장Node24/독립검증 미실행. 다음은 공식 상세 실패16건·Mike 대체제목·Nate 상세보강·한국입점일과극장/방송일 차이 검토. OTT 전용 인계 갱신, 기존 개인설정·환경 dirty 보존.

## DATA-45 공식 videoID 대조·Netflix11건 로컬 게시 (2026-11-12)

- OTT 전용 인계 `docs/system/ott-handoff-2026-11-12.md` 갱신. 원본 backend `docs/tasks/DATA-45-netflix-official-identities.md`. 기존44건의 공식 상세 조회 시도:28건 제목/형식 확인,16건 도구 조회 실패. NFL1건 제외 후27건 실TMDB대조, 날짜 일치14 중 기존1/검색잘림2 제외한11건 수동 검토·게시.
- 같은11~12월KR4OTT 로컬DB42→53(+11), Netflix11월35→46, 연중전체매핑44→55. SQL신규11건 date_only/instant NULL·시즌 확인, 임시API200/53행/신규11ID 확인, 재게시 이벤트55/신규변경이력11 유지. Node22 작성자검사149/149(기존dirty포함). 클라우드/실폰/권장Node24/독립검증 미실행. 다음은 공식 상세 실패16건·TMDB미발견2건·검색잘림4건·날짜차이11건 검토. 개인설정/기존dirty 보존.

## OTT 인계 진입점 (2026-11-12 · 문서 동기화)

- 다른 에이전트는 app `docs/system/ott-handoff-2026-11-12.md`부터 최신 인계 링크를 따라갈 것. DATA-43 실제 로컬 DB 42건, DATA-44 분류만 수행(추가 DB 게시 0). 이 문서 갱신은 DB/API/앱/검증 결과를 변경하지 않는다.

## DATA-44 Netflix 미분류 44건 사유·기존 검토 대조 (2026-11-12)

- 원본 `backend/docs/tasks/DATA-44-netflix-review-backlog.md`. DATA-43 저장 관측 기준 공식 75건=날짜 단일 매칭31+나머지44. 44건은 TMDB 검색 미발견33/후보 날짜 이전10/이후1. 기존 검토 매핑 동일 조건2, 시즌 확인 필요1, 미일치41이며 DB 미게시 수를 뜻하지 않는다. 재입점·작품 종류 자동 확정/게시 없음.
- 읽기 전용 분류 CLI·재현 입력/보고서·합성 회귀 검사 추가. Node22 전체 자체검사145/145(기존 dirty 포함 working tree), 보고서 반복 출력 동일. 실웹/DB 재조회·신규게시0, 클라우드/실폰/독립 검증 미실행. 이전42건은 DATA-43 측정 유지. 다음은 공식 videoID 상세로33건 정체성/종류 확인 및11건 날짜 의미·기존 시즌 대조. 개인 signing·기존 dirty 보존.

## DATA-43 Netflix 공식 한국 목록 25건 로컬 게시 (2026-11-12)

- 공식 Netflix KR 75건/TMDB 날짜 단일 일치 31건 확인. 기존 게시/동일 시즌 별칭을 제외하고 25건 수동 review·고정 매핑 후 로컬 DB 게시. 2026년 11~12월 KR OTT 17→42건, Netflix 11월 10→35건. 25건은 공식 한국 등록일+TMDB 영화/시즌 일자 일치; 전세계 최초 공개임을 단정하지 않음.
- backend 원본 카드 docs/tasks/DATA-43-netflix-reviewed-batch.md, 검토 입력 data/curated/netflix-kr-reviewed-2026-11-12.json. Node22 npm test 138/138. StreamPick 대조 3건 원천 KR 제공일 미확인, 오버액션 갱은 공식 KR 11/05 유지. 독립 검증·클라우드·iPhone 미실행. 기존 dirty 보존.

## DATA-27 StreamPick 11건 TMDB/국내 공식 근거 대조 (2026-11-12)

- backend `docs/tasks/DATA-27-streampick-tmdb-provenance.md`: StreamPick-only 신작 11/11 TMDB 날짜 일치, KR 제공처 일치 6/11. 한국 공식 OTT 같은 날짜 단서 `유일무이 로맨스`·`스타일 워즈` 2건은 최초 공개 미확정. 현재 분류: TMDB 날짜+제공처만 5, 날짜만 4, 한국 공식 공개일 단서 2. 자동 게시 0. DB 기존 9건은 과거 조회값이며 이번 DB 재조회 없음. backend 전체 테스트 105/105 통과, 독립 검증/배포 미실행.
- 다음: 시즌 날짜 기반 누락 후보 배치 연결, 공식 첫 공개 검증, reviewed 게시 뒤 DB 재집계. 기존 dirty 및 앱 signing 보존.

## DATA-26 StreamPick 전체 달력/로컬 DB 건수 차이 (2026-11-12)

- StreamPick 실제 HTML 캘린더(11~12월) 전체 885 이벤트 = 회차 849 + 신작 36. 대상 4 OTT 연결행 신작 15(Netflix 10, TVING 3, Disney+ 2, Coupang 0), 회차 703. 한국 OTT 최초 공개만 게시하는 현재 분류와 `episode`를 섞어 집계하면 큰 차이 발생.
- 로컬 DB 9건 vs StreamPick 신작 15건: 날짜·제목·플랫폼 일치 4, StreamPick에만 있는 신작 후보 11, DB에만 있는 5. 후보는 미검토이므로 신규 게시 0. backend `docs/tasks/DATA-26-stream-count-gap.md` 원본, `scripts/audit_streampick_calendar.py` 감사 도구, 2/2 자체검사 통과. 추후 11개 후보 공식 KR 근거 확인 및 회차 기능 범위 결정 필요. 독립 검증·배포 미실행.

## DATA-25 TMDB/StreamPick 11~12월 실측 역대조 (2026-11-12)

- StreamPick 샘플 35행을 실제 TMDB API로 역조회: 시즌/영화 날짜 단서 **31/35**, 날짜와 KR 제공처 동시 일치 **25/35**. 기존 인기순 캐시의 제목+제공처 발견은 12/35. 한국어 제목에 영문 원제를 덧붙이는 TMDB 표기 2건을 보정했다.
- 잔여 4행은 TMDB 시즌 번호 404 2행 및 같은 제목 작품 검색 미발견 2행. `discover`의 월별 KR 제공처 조건 후보는 별도 실측 211개 고유 작품 ID였으나 공식 한국 OTT 최초 공개 일정 수는 아니다.
- backend 카드 `docs/tasks/DATA-25-tmdb-dated-discovery.md`. 자체 테스트 14/14, 신규 DB 게시 0, 배포/독립 검증 없음. 다음은 공식 KR OTT 공개 근거와 후보별 시즌·제공처 차이를 확인하고 수집 파이프라인에 안전하게 연결한다.

## DATA-24 TMDB 검토 OTT 포스터 연동 (2026-11-11)

- backend `collect:tmdb`에 검토 완료 한국 OTT 작품의 포스터 연결 추가. 제목·종류·OTT 일치/단일 TMDB ID만 허용, 기존 이미지 보존. 로컬 DB 2개 포스터 UPDATE, 일정 신규 게시 0(11~12월 기존 9건). backend 86/86 테스트 통과, 독립 검증/클라우드 미실행. backend 카드 `docs/tasks/DATA-24-tmdb-reviewed-poster-link.md`; 다음은 공식 KR 최초 공개 후보의 review→publish 연결.

## DATA-18 한국 OTT 최초 공개 근거 2건 후보 추가 (2026-11-11)

- Disney+ 한국 페이지 `재혼 황후` 시즌1 2026-11-03, 쿠팡플레이 공식 보도자료 `스마일 클리닉` 2026-12-03 한국 첫 공개 근거를 backend `data/lineups/`에 각각 저장. Disney 글로벌 시장 미확인 기존 후보는 보존. source 시각 미명시/lineup 날짜 전용 모델이므로 둘 다 `date_only`.
- backend 검토용 staging 후보 86→88건, 2개 파일 각각 반복 입력 중복 0. backend `npm test` 75/75 통과. **신규 제품 DB 게시 0건**; 기존 9건은 DATA-16 기록이고 이번 DB 재조회 없음. 독립 검증·클라우드/실폰 반영 미실행. 카드 `backend/docs/tasks/DATA-18-kr-ott-premiere-evidence.md`.
- 다음: lineup staging → 별도 reviewed candidate 수동 등록/검토/매핑·DB 게시 경로를 연결하고 실제 SELECT, 제공처 공식 일정 확대, Render+Supabase 배포. iOS 개인 signing dirty 보존.

## DATA-16 Netflix KR 공식 최초 공개 후보 2건 로컬 DB 게시 (2026-11-11)

- 기존 Netflix 공식 기사 후보 `푸른길`(2026-11-20, original_series), `가능한 사랑`(2026-11-06, movie)을 구현 담당 근거 검토 후 backend 기존 `ott_reviewed` 매핑에 추가. 7→9건 로컬 PostgreSQL 게시 성공; 직접 SELECT로 9건 중 신규 두 건 제목/날짜/KR/netflix/`date_only` 및 `instant_at=NULL` 확인.
- backend `npm test` 75/75 통과, 작업 카드 `backend/docs/tasks/DATA-16-netflix-reviewed-publish.md`. 검토자는 구현 담당이며 독립 승인 아님. iOS 개인 signing 변경 보존. 클라우드 게시·실폰 반영·OTT 전체 커버리지·독립 검증 미실행. 다음은 다른 OTT 제공처의 한국 공식 공개 근거 확대 및 Render+Supabase 배포 준비.

## DATA-15 한국 넷플릭스 최초 공개 근거 2건 (2026-11-11)

- Netflix 한국 뉴스룸 `푸른길`(11/20, 시리즈), `가능한 사랑`(11/6, 영화) 공식 일자 확인 후 backend `data/lineups/netflix-kr-2026-11-*.json` 2개로 저장, 후보 staging 80→82건. 재실행 중복 0. **신규 DB 게시는 0건**, 기존 7건은 앞선 기록이며 이번에 DB 재조회하지 않음.
- backend 자체 `npm test` 75/75, 독립 검증/클라우드 게시/실기기 조회 미실행. backend 카드 `docs/tasks/DATA-15-netflix-korean-confirmed.md`. iOS 개인 signing 변경 보존. 다음 단계는 수동 review→실DB 게시 및 OTT 다른 제공처 확대.

## DATA-14 Netflix observed monthly lineup (2026-11-11)

- Backend data/lineups/netflix-2026-11-tudum-observed.json records 69 dated title rows from https://www.netflix.com/tudum/articles/new-on-netflix?lv=true (accessed 2026-11-11). This is a partial manually transcribed source listing, not an automatic website fetch.
- Review staging created 69 Netflix rows and retains 11 earlier tentative TVING rows, total 80. Re-run unchanged 69. Zero new database publications; earlier published OTT count remains 7 based on prior run (not independently queried this turn).
- KR availability, KR premiere, and poster licensing are unverified. All new rows have market=null, premiereConfirmed=false, imageUrl omitted. Backend self tests 75/75 pass; independent verification and cloud deployment not run.

## DATA-12 Netflix 공식 월간 텍스트 목록 파서 (2026-11-11)

- backend `scripts/parse-netflix-tudum.mjs`: Netflix Tudum 월간 공개 목록의 저장된 텍스트/Markdown에서 날짜별 여러 작품·시즌을 검토용 JSON으로 변환. 시장/한국 최초 공개는 확인하지 않으며 `market=null`, `premiereConfirmed=false`, 제품 게시 없음. 카드 `backend/docs/tasks/DATA-10-ott-lineup-pipeline.md`의 DATA-12.
- 2026년 11월 실제 공식 목록은 이번 작업에서 검증하지 못함. 로컬 Netflix/TVING DNS 실패로 실제 HTML·robots·TVING 사이트 자동 수집 미확인. 실제 사이트 입력 파싱 완료 0건, 기존 DB OTT 7건 유지.
- 자체 `node --test` 관련 9/9 및 전체 `npm test` 72/72 성공(기본 sandbox dist unlink EPERM 후 허용된 실행에서 성공). 독립 검증/DB 게시/클라우드 배포 미실행.
- 다음은 Netflix/TVING 공식 HTML 접근 조건·원문 데이터 추출/한국 지역 근거를 확인하고 다작품 자동 수집으로 확장. iOS 개인 signing 변경 유지.

## DATA-09 OTT 검토 실데이터 7건 반영 (2026-11-11)

- backend `docs/tasks/DATA-09-ott-reviewed-expansion.md`: Netflix `데블스 플랜: 데드 어게인`·`심장소리`, TVING `대리수능` 공식 근거를 검토해 기존 4건 포함 로컬 DB `ott_reviewed` 7건 게시 성공.
- 최초 기존 Netflix 후보의 STALE_MAPPING 차단 후 공식 날짜 확인·revision 갱신. `npm run publish:reviewed -- --file data/curated/ott-reviewed-mappings.json` exit0, 7건 반영. 전체 자동 OTT 커버리지·포스터 완성·독립 검증은 아님.
- 신규 Supabase DB/Render 서비스 실제 배포·iPhone 운영 URL 전환 미실행. 다음은 Free 프로젝트 계정 연결과 DB migration/원천 수집/검토 데이터 게시 및 HTTP·iPhone 검증. 개인 iOS signing 미커밋 상태 보존.

## DATA-07 세계 게임 출시일 확대 (2026-11-11)

- backend `docs/tasks/DATA-07-global-game-releases.md`: IGDB WORLD에 북미·유럽·아시아·전세계 출시 지역 포함. KR/JP/AU/NZ/CN/BR 개별 지역 유지, 날짜별 페이징·요청 간격·대량 DB 게시 시간 조정.
- 작성자 `npm test` **63/63 통과**, 실제 `npm run collect:daily` 성공. 로컬 DB GAME 출처 이벤트 WORLD **4,761**, JP **75**, BR **4**, KR **3**, AU **3**, NZ **2**, CN **1**. GTA VI WORLD 2026-11-19 조회됨(플랫폼별 중복은 별도 이벤트). IGDB 시점 데이터 기준.
- 로컬 DB 적재 성공, **클라우드 DB 적재·실기기 UI·독립 검증·OTT 전수/이미지 수집 미실행**. iOS signing 미커밋 변경 보존, verifier 기준·계약·migration 불변.

## DATA-05 공식 API 실응답·로컬 적재 (2026-11-11)

- 키 4개는 backend Git 제외 .env에 설정, 추적 .env.example은 비어 있음. EPL 다음 미공개 시즌 404 처리, IGDB date 필드 출시일 처리 수정.
- backend npm test 63/63. 로컬 PostgreSQL 202611100001_ott_categories migration 적용 후 공식 수집 KOBIS 1,902/EPL 380/IGDB 1 성공. 동일일 재실행 3개 모두 already_collected_today. 로컬 event 전체 영화 1,904/OTT 6/게임 3/EPL 381(기존 데이터 포함).
- 클라우드 DB 미적재, OTT 전수·원격 일정 자동화·독립 검증 미완료. 원본 backend docs/tasks/DATA-04-daily-official.md. iOS 개인 signing 변경 보존.

## DATA-04 공식 일정 일일 수집 구현 (2026-11-11)

- backend 코드 6da3358. KOBIS 영화, football-data EPL, IGDB 게임 어댑터와 06:00 KST GitHub Actions 예약, OTT 카테고리/DB/API 모델 구현. backend 자체 테스트 62/62 통과. app의 OTT 카테고리 라벨을 추가했다. 작업 카드 backend docs/tasks/DATA-04-daily-official.md, app docs/ai/tasks/APP-DATA-04.md.
- **실제 원천 인증/운영 DB 적재/OTT 전체 자동 수집/클라우드 배포/독립 검증 미실행.** backend의 Git 추적 .env.example에 실키가 있어 커밋에서 제외했고 Git 제외 .env는 해당 키가 비어 있다. 개인 signing pbxproj 변경 보존. 키 안전 이전 후 실수집 검증 필요.
- 다음은 키 분리 → 원천별 소량 실수집/중복 재수집 검증 → OTT 제공처 확장 → 사용자가 요청한 무료 클라우드 배포 순서. verifier 승인 상태는 변경하지 않음.

## OPS-01 Render + Supabase 무료 배포 (2026-11-10)

사용자가 Render Free API + Supabase Free PostgreSQL/Storage를 확정했고 오늘 배포를 목표로 한다. backend `render.yaml`에서 Render 30일 만료 DB를 제거하고 `DATABASE_URL` secret을 입력받도록 변경. 연결 및 무료 과금 방지 절차는 backend `docs/demo-deployment.md`, 원본 작업 카드 `docs/tasks/OPS-01-render-supabase.md`, ADR-014. 실 Supabase/Render 생성·migration·공식 데이터 적재·폰 운영 URL 전환은 아직 미확인. iOS pbxproj 개인 설정은 유지.

# 현재 상태 · 새 개발 대화 시작점

## APP-DEMO-01 간소화·데모 준비 (2026-11-10)

- 사용자 요청: 하트/북마크를 화면 하트 하나로 통합(작품 존재 시 작품, 그 외 일정), 달력 하단 마지막 성공/개별 제공처 진단 제거. iOS unsigned Simulator 빌드 성공.
- backend `CATALOG_PROVIDER_ONLY=true`로 가상 일정과 가상 제공처 freshness를 목록·달력·미정 조회에서 제외. Render 무료 웹/DB Blueprint·GitHub CI 초안 및 `docs/demo-deployment.md` 준비. 새 Render DB는 미생성·미적재, 실제 공식 OTT 4건은 기존 로컬 DB에 수동 적재된 이력만 있음. 영화/게임/EPL 실수집 미완료.
- backend `tsc --noEmit` 성공, `npm test`는 기본 Node20 및 기존 dist unlink EPERM으로 시작 전 실패. 최신 Node24 환경의 전체 재검사 및 독립 검증 필요.
- **아직 클라우드 배포/자동 배포 활성화·실폰 앱 업데이트 없음.** 네이티브 Swift 수정은 새 빌드 설치 필요, 서버 데이터/응답만 배포 후 기존 앱에 반영 가능. app 카드 `docs/ai/tasks/APP-DEMO-01.md`. 기존 pbxproj 개인 서명 설정 미커밋 보존.

## APP-AUTH-12 계정 동기화 표시 (2026-11-10 최신)

- 사용자가 iPhone 실제 Google 로그인이 정상이라고 확인함. 서버 설정/찜 왕복·재실행 세션 복원은 별도 테스트 대상.
- app `docs/ai/tasks/APP-AUTH-12.md`: 진행 중 표시, 마지막 전체 조회 성공 시각, 최근 실패 표시. 로그아웃·계정 전환 시 기록 초기화. 로컬 필터 변경은 저장 버튼을 눌러야 계정에 반영된다는 설명 추가.
- 작성자 iOS Simulator unsigned Debug 빌드 성공. 실기기 설치/독립 검증/전체제품 PASS는 미실행. API·migration·acceptance 변경 없음.
- 다음은 실제 iPhone에서 저장→종료·재실행 복원 및 찜·계정 격리 확인.

문서 revision: CONTEXT-2026-11-10-24. 공통정책 SYNC-2026-11-10-02. 원본 app/docs/system, backend/verifier 동일사본. 확인일 2026-11-10 KST.

## 사용자 폰 HTTPS 확인 · 서명 Team 선택 대기 (2026-11-10, 최신)

사용자가iPhone Safari health표시를확인했다고보고. 허용CoreDevice조회에서기존페어링iPhone1개/개발자모드enabled 및읽기연결exit0 확인. 아직앱설치/정상Google로그인/기기간왕복은미실행. 프로젝트DEVELOPMENT_TEAM미지정이므로다음은사용자가Xcode에서본인Team선택후실제HTTPS주소buildoverride로서명빌드·설치. 개인Apple계정/새credential선택은자동으로가정하지않는다. 원본 APP-AUTH-11카드에기록,공개문서에기기식별자미복사.

## APP-AUTH-11 Mac HTTPS 확인·iPhone 단계 대기 (2026-11-10, 최신)

- app문서기록bb6b60b, 원본 docs/ai/tasks/APP-AUTH-11.md. 기존loopback API와LAN HTTPSproxy가실행중임을확인했고재시작/중단하지않았다.
- CA체인·IPhostname 검증을유지한실제LAN TLS health/options200, 비인증settings/잘못된idToken401 확인. 정상Google로그인·계정쓰기·폰왕복검사는아니다.
- 실제현재HTTPS주소를buildoverride한 unsigned iPhoneOS generic build성공, 실제번들Info값확인. 서명/폰설치는미실행이며sourceURL placeholder는그대로다.
- 공개CA .cer·지문·현재주소/설치안내를 app/work/iphone/(Git제외)에준비. 개인키는복사하지않았고Mac/iPhone신뢰설정은변경하지않았다. 현재자체서명로컬방식은기기소유자가CA프로파일설치후별도TLS신뢰를켜야한다(Apple공식안내 local-iphone-auth.md).
- 담당해제·사용자폰단계대기. 다음은동일Wi-Fi iPhone Safari health접속확인→Xcode실기기서명설치→Google로그인·재실행·설정/찜왕복. 서비스생존/IP는다음세션재확인. 신규코드/독립리뷰/제품통합PASS는없다.

## APP-AUTH-10 공개·계정 API 주소 통일 (2026-11-10, 최신)

- app 코드9f04c67fac1b2f554e84e7ea186b87ff76cc6bfa. 공유APIEndpointConfiguration으로env→Info.plist의동일HTTPS설정을공개달력/상세와계정로그인/설정/찜에적용했다. 기존PublicAPI의bundle설정무시·iPhone localhostfallback을수정했다. Simulator공개loopback과계정HTTPS경계는보존했다.
- 순수Swift회귀검사·unsigned Simulator전체빌드(기본/테스트HTTPSoverride)성공. 실제생성Info.plist의reserved테스트주소를양쪽mode resolver로대조성공. 첫swiftc cacheEPERM은별도/private/tmp module cache로해결했다.
- 별도Lagrange리뷰의case비교회귀를수정하고Swift/diff재검토통과. 실제iPhone/Google로그인/계정왕복/HTTPSproxy연결은미실행, 제품PASS아님. API·migration·acceptance불변. source의backendURL은아직placeholder다.
- 원본 app/docs/ai/tasks/APP-AUTH-10.md, 운영절차 docs/ai/local-iphone-auth.md, LEARN-0018. 담당해제. 다음은기존APP-AUTH09도구로실제MacLAN→backendHTTPS접속확인후기기소유자CA신뢰/로그인/설정·찜왕복이다. 계정기능코드는이미구현돼중복구현하지않는다.

## APP-AUTH-09 로컬 iPhone HTTPS 접속 준비 (2026-11-10)

- `scripts/dev-https.sh`/`scripts/dev-https.py`로 Mac 개인 Wi-Fi IP에서 HTTPS → 127.0.0.1:3000 프록시를 실행하는 개발 절차 추가. 세부내용 `docs/ai/local-iphone-auth.md`, 작업 카드 `docs/ai/tasks/APP-AUTH-09.md`.
- 인증서 발급과 IP 바인딩, 로컬 Syntax/iOS unsigned build 자체검사는 별도 카드 기록. 실제 Mac 네트워크/기기 인증서 신뢰, backend 기동·Google 로그인·기기간 설정/찜 왕복은 미실행. 독립 PASS 아님. API·migration/acceptance 변경 없음.

## APP-AUTH-08 Google iOS OAuth 클라이언트 연결 (2026-11-10)

- 사용자가 제공한 iOS OAuth Client ID를 앱 Debug/Release Xcode 빌드 설정에 반영하고 reversed callback scheme을 등록했다. backend 기존 비밀 .env의 키를 GOOGLE_IOS_CLIENT_ID로 변경하여 같은 audience를 설정했다(.env는 Git 제외).
- 원본 카드 app `docs/ai/tasks/APP-AUTH-08.md`. HTTPS backend URL은 여전히 placeholder로 남아 있으며 실제 Google 로그인·실기기 설정/찜 왕복·독립 검증은 미실행이다. API 계약·migration/acceptance 변경 없음.

## BE-AUTH-06 Google 실연결 준비 (2026-11-10)

- backend `docs/tasks/BE-AUTH-06.md`: `.env.example`과 `scripts/setup-local.mjs`가 생성하던 `GOOGLE_CLIENT_ID`를 실제 JWT 검사 코드가 읽는 `GOOGLE_IOS_CLIENT_ID`로 수정했다. 기존 `.env`는 직접 키 변경이 필요하다.
- backend `docs/local-development.md`에 Google Cloud iOS OAuth 등록(Bundle ID `com.joobang.godieor`), reversed callback scheme, 동일한 backend audience, 실기기용 HTTPS API 준비를 기록했다.
- 작성자 backend `npm test` Node24/허용 환경 **53/53 통과**. 최초 Node20 일반 실행은 `dist` unlink EPERM으로 실패했다. 실제 OAuth 클라이언트, HTTPS 서버, iPhone 왕복과 독립 검증은 아직 미실행이다. API 계약·migration/acceptance 불변.

## 최신 사용자 확정 (최우선)

**전용 macOS 계정 godieorbuild 검증 방식은 폐기했다.** 계정전환·su·비밀번호·전용 Darwin T 진단을 다음작업으로 재개하지 않는다. 기존Mac계정에서 검토한 고정소스의 로컬검사를 수행한다. 이 변경은 OS계정 삭제나 기존HOME ACL 수정이 아니다. 제품 개발/서명/출시를 전용계정·P5격리 과제에 종속시키지 않는다.

## 세 저장소 구현 상태

| 저장소 | 구현·확인 | 미완료 |
|---|---|---|
| app | SwiftUI 공개API client·월간달력·일별목록·상세·지역/시간대/OTT/기기필터, 상세최신상태/개최국/날짜응답경합 수정, 작성자 날짜→목록→상세 UI 확인 | 실Google/실기기 인증·기기간 동기화/전체독립UI검사 |
| backend | Nest controller→service→repository, Prisma Client우선·SQL예외정책, PostgreSQL23모델·migration, fixture7+공식OTT공지4건 수동반영 파이프라인 | 영화·게임·EPL 실연동/OTT자동전수수집, 실Google OAuth와 개인쓰기 통합런 검증 |
| verifier | evidencev1앱전용/v2전체조합binding, rawGit snapshot/build분리, 임시DB와단계로그, backend제한실행·iOS기존계정unsigned빌드 | 4개필수검사 후속·제품구현, 자동AI어댑터·전체제품통합run·승인 |

## BE-AUTH / APP-AUTH 구현 (2026-11-10 추가)

- 작업 카드 `docs/ai/tasks/APP-BE-AUTH-01.md`. backend Google JWT 서명·audience·issuer·만료 검증, 30일 SHA-256 opaque service session 발급/단일 폐기, 사용자별 설정 CAS(version 409)·작품/일정 찜 멱등 변경·서명된 계정별 페이지 커서 구현. 동시 최초 Google 로그인 P2002 재시도. iOS Google ASWebAuthenticationSession 코드+PKCE+nonce 검증, Keychain 저장/복원, 설정 저장/불러오기, 찜 UI 추가. API 계약/migration 변경 없음.
- 작성자 자체 검사: backend `npm test` 51/51 성공(JWT/세션/커서/설정 4 신규 subtest 포함), iOS `xcodebuild ... -derivedDataPath /private/tmp/godieor-auth-derived CODE_SIGNING_ALLOWED=NO build` 성공. 최초 기본 DerivedData 빌드 시 쓰기 권한 오류는 별도 writable DerivedData에서 재실행 성공. Google 실제 Client ID·실서버·실DB 왕복 및 독립 runner 미실행. 기기 필터 로컬 복원과 계정 설정 sync는 별개.
- 전용 Mac 계정 재개하지 않음. 구현 자체검사만 완료, 전체제품 PASS/review 승인 아님.

## APP-AUTH-02/03 보완 (2026-11-10)

- APP-AUTH-02(app d8358ec): iOS 계정 API 주소를 Debug/Release 빌드 설정의 HTTPS 주소로 주입하고, 찜 목록 페이지 충돌(409)에는 전체 목록을 최대 한 번 재조회한다. 등록 OAuth Client ID·reversed scheme과 실제 HTTPS 서버 주소는 아직 준비되지 않았다.
- APP-AUTH-03(`docs/ai/tasks/APP-AUTH-03.md`, 이번 변경): 계정 전환 중 이전 세션의 늦은 응답이 사용자/설정/찜 상태를 덮어쓰지 않도록 generation과 요청 시작 token을 고정한다. 로그아웃 시 로컬 세션을 즉시 정리하고 이전 bearer token을 사용하여 서버 폐기를 시도한다. 폐기 실패 시 서버 세션은 만료 전까지 남을 수 있다.
- APP-AUTH-03 자체 iOS unsigned build와 diff 검사를 기록하며 실네트워크 지연 재현/Google 인증/실DB·독립검증은 아직 수행하지 않았다. backend 기존 dist 테스트 45개 중 44개 통과, HTTP 테스트 1개는 로컬 listen EPERM으로 실행 실패했다. verifier acceptance/verdict는 변경하지 않는다.

## APP-AUTH-07 쓰기 API 세션 만료 처리 (2026-11-10)

- `docs/ai/tasks/APP-AUTH-07.md`: 설정 저장 및 찜 변경 API 401 응답에서 로컬 세션·계정·찜 상태 즉시 정리, 기존 세션 일치 확인으로 늦은 이전 요청 격리. APP-AUTH-06 계정 필터 초기화와 연계.
- 작성자 iOS unsigned build 성공, CoreSimulator 서비스 경고 관찰. 실제 Google/HTTPS 401 UI·다중 기기·독립검증 미실행, 계약/마이그레이션 변경 없음.

## APP-AUTH-06 기기 필터의 계정 경계 (2026-11-10)

- 앱 `docs/ai/tasks/APP-AUTH-06.md`: 계정 필터 소유자 표식 추가. 로그아웃·401·계정 전환 시 기본 필터로 초기화하고 재시작에서 정상 계정 복구 후 원격 설정을 재적용한다. 비로그인 임시 필터는 유지한다.
- 작성자 iOS generic Simulator unsigned build 성공. CoreSimulator 서비스 경고 관찰. 실 Google/HTTPS·401 UI·두 기기·독립 검증 미실행. 계약·migration·verifier acceptance 불변.

## APP-AUTH-05 계정 refresh 순서/찜 쓰기 경합 수정 (2026-11-10)

- 앱 `docs/ai/tasks/APP-AUTH-05.md`: 겹치는 refresh 중 최신 시작 요청만 계정 상태를 반영하고 설정 저장 중 시작한 remote settings snapshot이 완료된 저장을 덮지 않도록 revision 분리. 찜 저장 후 재조회를 pending 해제 이후 예약하여 APP-AUTH-04 후속 재조회의 스냅샷 누락을 수정.
- 작성자 로컬 iOS generic Simulator unsigned build 성공. CoreSimulator runtime 서비스 경고는 발생했으나 컴파일 완료. 실 Google/HTTPS 기기·실제 지연 HTTP 경합·독립 runner 미실행. API/migration 및 verifier acceptance 불변.

## APP-AUTH-04 앱 복귀 동기화와 찜 중복 요청 방어 (2026-11-10)

- 앱 `docs/ai/tasks/APP-AUTH-04.md`: 화면 active 복귀 시 로그인 계정 설정/찜 재조회, 찜 대상별 진행 요청 중복 차단. 느린 요청 중 로그아웃·계정 전환 때 이전 응답은 적용되지 않고, 이전 요청의 종료가 새 세션 잠금을 지우지 않도록 UUID로 구분. 쓰기 중 시작한 찜 snapshot은 최신 UI를 덮지 않도록 revision 검사, 쓰기 성공 후 추가 재조회.
- 작성자 자체 iOS generic Simulator unsigned build 성공. 실기기 Google OAuth/HTTPS 서버, 두 기기에서 실제 동기화, 지연 HTTP 재현, 외부 독립 검증은 미실행. 서버 계약·migration 변경 없음.

## BE-AUTH-04 계정별 저장소 자체검사 (2026-11-10)

- backend 원본 카드 `docs/tasks/BE-AUTH-04.md`: 실제 UsersRepository/UsersService를 fake Prisma 트랜잭션에서 호출해 두 계정의 설정 격리·CAS 409, 찜 멱등·계정별 버전, 페이지 커서 계정/버전 경계를 검증하는 2개 회귀 검사 추가. 기존 JWT 테스트에서 Base64URL 마지막 글자만 수정하는 비결정적 변조 방식은 서명 바이트 직접 변경으로 교정.
- 작성자 로컬 전체 backend 테스트는 허용된 HTTP bind 환경에서 `node --test tests/*.test.cjs` **53/53 통과**(기존 dist). 일반 sandbox 실행은 47개 중 45개 통과/HTTP listen EPERM 및 수정 전 불안정 JWT assertion 2개 실패; 수정 후 허용 환경 결과를 별도 기록했다. 실제 PostgreSQL, OAuth/HTTPS 기기간 동기화, 독립 검증은 수행하지 않았다. 새 계약·migration 없음.

## BE-AUTH-05 실제 임시 PostgreSQL 자체검사 (2026-11-10)

- 원본 backend `docs/tasks/BE-AUTH-05.md`. 기존 `scripts/check-refactor-db.cjs` 임시DB/migration 시나리오에 실제 Prisma AuthRepository/UsersRepository 검사 추가. Google subject 계정 생성·동일 사용자 다중 세션, 서로 다른 계정 설정 격리·CAS 409, 찜 멱등/삭제·페이지 커서 사용자/버전 결합, 특정 세션 폐기 후 다른 세션 유지 확인.
- Node24.19.0, `GODIEOR_TEST_POSTGRES_IMAGE=postgres:16-alpine npm run test:db` exit0; 기존 스모크도 통과, tmpfs DB 컨테이너 정리. `npm test` 53/53 성공. 기본 고정 PostgreSQL digest 이미지는 로컬에 없으므로 별도 명시 이미지로 실행했고 이 차이를 작업 카드에 기록. 고정 digest 실환경 재실행은 미완료.
- 실제 Google OAuth ID token 검증/HTTPS iPhone/기기간 왕복과 독립 verifier 결과는 미실행. 기준 draft/PENDING 유지, 전체제품 PASS 아님. 전용 Mac 계정 검증 방식 폐기 유지.

## 마지막 실제 실행

- verifier 코드 de0560faed63673f0f17904a825f1973a0fd9b5d, 브랜치 codex/int-01-secret-check. 최종문서HEAD는Git/전달본으로확인. 원본 verifier/docs/tasks/INT-01-secret-check.md, 정책 docs/secret-check.md.
- 마지막run /private/tmp/godieor-secret-05d7308f. app594b080/backendc5722cb(전체SHA evidence), verifier867c5b6+당시dirty/state hash. 최신SHA실행으로재라벨하지않는다.
- node/경계probe/iOSunsigned/dependencies/generate/tsc/backend47tests/migration/identity92·time76·filter57assertions/database-smoke/secret-check 모두exit0. 임시DB정리확인. 기존제품DB사용없음.
- scanner는source/fixtures/완료logs/bundle182inventory항목(범위교차)에서finding0/error0. 명시literalcredential·labelledPII정책이며모든개인정보/인코딩비밀부재증명이아니다. 값·원래파일명은출력하지않고path_id로기록. 정책/예외/범위는 docs/secret-check.md.
- code자체107개통과. 별도Hubble은5개오류지적수정후107개/23receipt재현을직접확인, 추가재현문제없음보고. 전체Nest/DB/iOS/scanner실환경은작성자실행이며독립제품승인아님.
- evidence는 ios-build/event-identity/time-semantics/secret-check PASS(componentscope). filter-intersection/settings-roundtrip/provider-contract/ios-user-flow 4개SKIPPED로전체ERROR. reviewPENDING/isolation_verified=false. 전체제품PASS/승인없음.
- 별도CUA+가상계약stub에서11/6날짜→목록→상세/가상표시/date_only확인. US/UTC/netflixON변경후프로세스종료/재실행유지확인, 마지막KR/Seoul/netflixOFF복원. 이것은로컬AppStorage component관찰이며계정서버왕복/전체UI판정PASS가아니다. app코드변경없음, 독립자동UIrunner연결은후속.
- 산출물 verifier/work/handoff/godieor-secret-05d7308f 및 ui-local-20261110(Git제외). 테스트server/app종료. 리뷰 reviews/2026-11-10-secret-check.md, LEARN-0017. INT-01A실행/모형기록은해당카드/LEARN-0016에보존.

## 현재 검증 방식

고정base/head·계약manifest·migration집합·acceptance·verifier상태 digest를 모든 결과에 묶는다. 원본snapshot/빌드사본 분리·로그hash·실패/미실행 기록은 유지한다. backend는 최소환경sandbox/일회용DB. iOS는 검증기소유 고정xcodebuild argv·generic Simulator·서명없음, 실행정책 local-reviewed다. Xcode project build phase는 실행되므로 검토한 자체프로젝트에 사용한다. 동계정실행을 OS격리로 주장하지 않는다.

P5 setsid후손수명정리/전체OS격리는 해결한것이 아니며 제품개발의 선행게이트에서 제외했다. 외부PR무인실행 환경은 별도범위다. 기준소유는 verifier/requirements/acceptance.yaml이며 draft, 승인자null을 유지한다. 변경을 제안할수는 있으나 승인하지 않는다.

## 이어받을 다음 작업

1. APP-AUTH-07 인증 쓰기 401 세션 정리까지 구현. BE-AUTH/APP-AUTH 초기 구현 및 BE-AUTH-05 일회용 PostgreSQL 자체 검사는 기존 카드에 기록(로컬 이미지 digest 차이). Google iOS OAuth Client값은등록·반영됐고 APP-AUTH-10 주소통일까지완료. Mac실제HTTPS연결까지APP-AUTH-11에서확인. 다음은사용자iPhone CA신뢰/Safari health와실기기 인증·설정·찜왕복 및 독립검증. 로그아웃 서버 폐기 실패·계정 삭제/세션 관리 정책은 후속 확인 필요.
2. 제품개발: 극장영화 등 데이터출처 최소샘플/범위·근거 확인과 실Google OAuth와 개인쓰기 통합런 검증 설계·구현. OTT는 연월일확인가능한 시즌최초공개만, 월/연도만 있는자료 제외. 자동전수coverage는 확인되지 않았다.
3. 새기능마다 자체검사·분리컨텍스트리뷰·고정SHA 인계. 현재 card 담당해제. 공통문서통합은 한세션만 한다.

## 고정 계약·환경·범위

API0.1.0-draft.2, app/docs/api/contract-reference.json·verifier/docs/contracts/reference.json을 참조한다. contractmanifest SHA256 8dfc69a8c6a5f9feb91f2d0cf6d661eec16a1aacb8e980b7abe880cd0b1f3b1e, 초기migration파일 SHA256 29ef8ef0d520f44b6a633e8f017144a3e2b2199189461a88ba99bc296c42f5b9. 기존계약pin의 package-lock과 현재backend lock차이는 기존에 기록된 상태이며 새계약으로 임의재고정하지 않는다. Node24.19.0/Nest12.4.0/Prisma7.10.1/Postgres16.14.

iOS/무료로컬우선, 한국/KST기본·국가/시간대선택, 기본영화+OTT, 게임/EPL설정추가, 2026년부터알려진미래, 하루1회갱신정책. 실제자동스케줄/전수수집과 정책은 구분한다. 작품별다른시장/플랫폼/시각 이벤트를 보존하고 date_only를UTC자정으로 만들지 않는다. 세부확정은 product/policies, 원본실행은 각작업카드가 소유한다.

과거전용계정 생성·ACL·인증실패·격리진단은 Git이력 및 VFY-03-dedicated-* 작업카드에 보존한다. 해당문서가 다음계정로그인을 요구하더라도 현재정책이 우선한다. 현재문서는 과거status4630795 등 이후 산재한 오래된요약을 정리한 것이다.

## 새 계정/모델 시작

AGENTS → 이파일 → handoff → 해당원본카드 순으로읽고 각저장소 HEAD/branch/dirty를 확인한다. 최신본읽기전 코드수정/인증반복을 하지 않는다. 웹전달은 scripts/export-context.py로생성하고 --check한다. 커밋은 영문type+한글설명, push/외부배포는 별도요청범위다.
## DATA-03 영화·게임·EPL 검토 일정 적재 경로 (2026-11-10)

- backend `16fb65f`에서 `publish:catalog` 수동 검토 JSON 적재 CLI와 stable event/content/team ID 보호를 구현. 합성 입력 단위 테스트 5/5, 전체 백엔드 58/58 통과. 백엔드 작업 카드 `docs/tasks/DATA-03-reviewed-catalog.md`.
- 실제 공식 영화·게임·EPL 데이터는 **아직 검토/적재하지 않음**. 현재 신규 실데이터 공개 API 조회, 운영 DB, 배포, 독립 검증도 미실행. 다음은 공식 출처 대조→입력 JSON→로컬 DB 적재 및 API 검증→사용자 배포 요청 시 Render+Supabase 연결.
- API 계약/마이그레이션/독립 승인 기준 변경 없음. 기존 iOS pbxproj dirty 설정 유지.
# DATA-06 모바일 게임 기기 필터 (2026-11-11)

- Android/iOS 기기 타입과 한국 IGDB 출시일 분류, backend 계약/DB migration 추가. iOS 게임 기기 선택 필터에 표시. backend 자체 테스트 63/63, unsigned Simulator 빌드 통과.
- 로컬/클라우드 migration 적용, 모바일 출시일 재수집, 폰 배포·실기기·독립 검증은 아직 미확인. backend 카드 `docs/tasks/DATA-06-mobile-platforms.md`, app 카드 `docs/ai/tasks/APP-DATA-06.md`.
- 개인 Xcode signing pbxproj 변경은 보존. OTT 전수·이미지 적재는 후속 작업으로 남음.

# DATA-08 게임 포스터 메타데이터 (2026-11-11)

- backend `docs/tasks/DATA-08-game-cover-metadata.md`: IGDB `game.cover.image_id`를 게임 콘텐츠의 기존 `poster_url`로 저장하는 경로 추가. 기존 값이 있는 콘텐츠는 이미지 미제공 시 보존.
- 작성자 backend 전체 테스트 63/63, 수집 어댑터 표지 메타데이터 회귀 테스트 5/5 성공. 로컬 API 포트 3000 연결 실패로 실제 응답과 iPhone UI 확인은 미실행. 실원천/DB 재적재·OTT/영화 이미지·클라우드 배포·독립검증 미완료.

# DATA-08 IGDB 실수집·포스터 확인 (2026-11-11)

- backend `docs/tasks/DATA-08-game-cover-metadata.md` 후속: 로컬 PostgreSQL에서 IGDB 강제 재수집 7개 지역 성공. 게임 작품 3,181건 중 포스터 URL **3,152건**(재수집 전 3,165건 중 0건), 제공처 이벤트 4,870건 확인.
- 로컬 API 작품 상세 `GET /v1/contents/:id`에 `posterUrl` 응답 확인. `GET /v1/events` 일정 목록에는 아직 포스터 URL이 없어 카드 직접 노출은 후속 계약/앱 작업 필요. 임시 API 종료.
- 실제 iPhone 카드 표시·이미지 CDN 확인·클라우드 DB 배포·영화/OTT 포스터·독립 검증 미실행. 앱 signing 미커밋 변경 보존. backend 카드에 실행 결과 기록.


## DATA-10 OTT 월간 공개 목록 후보 전환 (2026-11-11)

- 사용자 승인: OTT 기사 RSS 중심 후보 탐색을 보조로 낮추고 Netflix·TVING·Disney+·Coupang Play의 공개/편성 목록을 우선 검토. 날짜·한국 지역·시즌 최초 공개 근거가 없는 자료는 달력 게시 금지.
- backend `docs/decisions/015-ott-release-lineups.md`, `docs/tasks/DATA-10-ott-lineup-pipeline.md`: 수동 확인한 목록 JSON의 작품별 심사 후보 변환 스크립트 작성. 자동 사이트 수집·운영 적재는 아직 구현/실행하지 않음.
- backend `npm test`: build 및 66개 테스트 통과(합성 OTT 후보 검증 3개 포함). 현재 기존 게시 OTT는 7건이며 이번 작업으로 증가하지 않음.
- 1차 공개 페이지 확인: Netflix 한국 뉴스룸의 작품별 공식 날짜 근거 확인, Disney+ 한국 `공개 예정` 목록 페이지는 확인되지만 공개일 구조는 미검증. TVING Ads·Coupang Play 월간 전체 목록의 자동 수집 가능성은 미확인. 외부 자료의 2026 공개 표기도 실제 DB 반영 전 재확인.
- 다음: 사이트별 실응답/robots/이용조건 검토 → 다작품 파서 → 후보 staging 연결 → 한국 최초 공개 날짜 수동 심사 → 로컬 DB 검증·하루 1회 배치. 독립 검증/배포 미실행, 앱 개인 signing 수정 보존.
## DATA-11 OTT 작품별 검토 후보 staging (2026-11-11)

- backend `docs/tasks/DATA-10-ott-lineup-pipeline.md`: 수동 확인한 OTT 공개 목록을 작품별 staging JSON에 저장. 재수집 중복 방지, 변경 revision 증가, 기존 review 무효화, 파일 잠금·원자 저장·손상된 상태 방어. 제품 DB 게시 없음.
- backend `npm test` 빌드 및 70/70 통과(기본 sandbox에서 `dist` unlink EPERM 후 허용 재실행 성공). 공식 사이트 HTML 자동 수집·추가 OTT 게시·독립 검증·클라우드 배포는 미실행. 게시 OTT 7건 유지.
- 다음: Netflix/TVING 공식 공개 목록 구조와 접근 조건 실측, 플랫폼별 수집 어댑터 및 사람 검토→게시 연결. iOS 개인 signing 변경 보존.
## DATA-13 TVING Ads 예정작 후보 파서 (2026-11-11)

- backend `docs/tasks/DATA-13-tving-lineup.md`: TVING·Wavve 통합 예정작의 저장된 텍스트를 검토용 후보로 변환. 잠정 11건 로컬 staging(재실행 중복 0), 신규 DB 게시 0, 기존 OTT 게시 7건 유지. 실사이트 HTML·robots·약관·한국 최초 공개/이미지 권한 미확인.
- 자체 전체 75/75, 관련 10/10 성공. 독립 검증/클라우드 미실행, iOS signing 보존. 다음은 원문 대조 및 한국 공개일 개별 검토.
# DATA-17 Disney+·쿠팡플레이 공식 후보 추가 (2026-11-11)

- Disney 공식 기사에서 `재혼 황후` 2026-11-03 공개 후보 1건, 쿠팡 공식 추천 기사에서 날짜 미확인 작품 3건을 backend lineup JSON으로 보존하고 검토 staging 82→86건으로 확대. 중복 재실행 신규 0건.
- 4건 모두 한국 서비스 최초 공개 여부 미확인(`market=null`, `premiereConfirmed=false`), 제품 DB 신규 게시 0건. 로컬 OTT 게시 9건은 이전 DATA-16 기록이며 이번에 재조회하지 않음. backend 카드 `docs/tasks/DATA-17-disney-coupang-candidates.md`.
- 다음은 각 OTT 한국 최초 공개 날짜 검증/검토 후 게시 및 Render+Supabase 배포. 개인 iOS signing dirty 보존. 독립 검증/실폰/클라우드 미실행.
## DATA-19 OTT 11~12월 수집 공백 대조 (2026-11-11)

- StreamPick 월별 캘린더의 Netflix/TVING/Disney+ 35개 제공처별 작품 행과 backend staging 비교: 초기 88건 중 제목 미매칭 32행. 공식 한국 출처 2건(`천천히 강렬하게` 12/11, `스타일 워즈` 11/11 날짜만 확인) 보강 후 staging 90건, 참고 목록 제목 미매칭 30행. **새 제품 DB 게시 0건**, 9건은 이전 로컬 기록으로 이번 재조회 없음.
- backend `audit:ott-coverage`, `compare:ott-reference`와 개별 4개 Node 검사 PASS. 외부 목록은 발견용이며 자동 한국 최초 공개/수집률 근거가 아님. 외부 HTTP DNS 실패, Node20/dist EPERM으로 전체 테스트 불가. 수집 범위·게시 경로 개선 미완료. 원본 카드 `backend/docs/tasks/DATA-19-ott-coverage-audit.md`. iOS signing dirty 유지, 독립 검증/배포 미실행.

## DATA-20 TMDB 한국 OTT 메타데이터 적재 (2026-11-11)

- 로컬 PostgreSQL에 TMDB KR 제공처 검색 결과 고유 작품 568건·포스터 URL 568건 저장, 재실행 추가 INSERT 0건. Netflix/TVING/Disney+ 및 쿠팡플레이 TV 검색(쿠팡 영화 제공처는 TMDB 목록에 없음). 5페이지 제한의 작품 목록이며 11~12월 첫 공개 일정이 아니다.
- 검토된 OTT 날짜 이벤트는 기존 9건이고 이 적재로 추가된 달력 이벤트는 0건. 서버 자체 테스트 81/81 통과, 독립 검증·클라우드·실기기 미실행. 카드 `docs/tasks/DATA-20-tmdb-kr-catalog.md`, 비밀키는 .env에만 보존.


## DATA-22 한국 OTT 공식 공개일 2건 로컬 게시 (2026-11-11)

- `재혼 황후`(Disney+, 2026-11-03), `스마일 클리닉`(쿠팡플레이, 2026-12-03) 검토 후 로컬 `ott_reviewed` 9→11건. SELECT에서 KR/서비스/날짜/`date_only`/`instant_at=NULL` 확인, backend 자체 `npm test` 81/81 성공. 카드 `backend/docs/tasks/DATA-22-reviewed-disney-coupang-publish.md`.
- 공식 OTT 전체 커버리지, Render/Supabase, iPhone 실제 표시, 독립 검증 미완료. 기존 개인 iOS signing 및 backend .env.example dirty 유지.
## DATA-23 OTT 게시 커버리지 측정 (2026-11-11)

- backend 읽기 전용 `audit:ott-published` 도구 및 테스트 추가. StreamPick 4개 플랫폼 11~12월 참고 35행과 로컬 `ott_reviewed` 실제 DB 게시 9건(연중 11건)을 비교: 완전 일치 1, 날짜 일치·시즌 미확인 3, 날짜 불일치 0, 미게시 31. 31건을 검증된 한국 최초 공개 누락으로 간주하지 않음.
- DB 신규 게시 0. 원본 카드 `backend/docs/tasks/DATA-23-ott-published-coverage.md`. backend 자체 테스트 83/83. API·migration·acceptance 변경 없음. iOS signing 및 backend `.env.example` 개인 dirty 보존. 클라우드·실폰·독립 검증 미실행. 다음은 미게시 후보의 공식 한국 출처 수집·검증 후 로컬 게시와 비교 재실행.

## DATA-25 TMDB 시즌 날짜 역조사 (2026-11-12)

- backend에 StreamPick 35행을 제목별로 TMDB 역검색하고 시즌·1화 날짜, KR watch provider, 월별 날짜 검색을 구분하는 검토용 스크립트 추가. 기존 인기순 카탈로그 제목+서비스 일치 12/35. 신규 날짜 검사 9/9 통과.
- 실제 TMDB DNS `ENOTFOUND`로 라이브 35행 역대조 미실행. 보고서 `/private/tmp/godieor-tmdb-date-discovery.json`에 `liveError` 기록. 제품 DB 신규 게시 0; 기존 9건은 이전 기록이며 이번 재조회 없음. 다음 단계는 네트워크 복구 후 실응답과 공식 한국 최초 공개 근거 대조. backend 카드 `docs/tasks/DATA-25-tmdb-dated-discovery.md`. 독립 검증·클라우드 배포 미실행.

## DATA-25 후속: TMDB 캐시 공백·영화 역검색 (2026-11-12)

- 기존 TMDB 568건 캐시와 StreamPick 35행 오프라인 비교: 제목 미발견 22, 제공처 불일치 1, 시리즈 첫 날짜 불일치 8, 첫 날짜 일치 4. 제목+제공처 일치 12/35이며 한국 OTT 첫 공개일 12건 검증을 뜻하지 않음.
- backend `/search/movie`·영화 상세/한국 제공처 역검색 추가, 영화 글로벌 `release_date`를 검토 후보로 분리. 관련 12/12 테스트 PASS, 보고서 `/private/tmp/godieor-tmdb-date-audit-v3.json`. 원격 TMDB DNS 장애가 해소되었다는 근거 없어 이번 실행은 오프라인만 수행. 신규 DB 이벤트 0, 독립 검증·배포 미실행. 카드 backend `docs/tasks/DATA-25-tmdb-dated-discovery.md`.

## DATA-28 StreamPick 신작 누락 재검증 (2026-11-12)

- backend `docs/tasks/DATA-28-official-release-gap-check.md`: 누락 11개 TMDB 영화/시즌 첫 날짜 전부 일치. 한국 OTT 공식 목록 같은 날짜 5, 날짜 충돌 1(`오버액션 갱`: StreamPick 11/04, Netflix KR 11/05), TMDB 날짜+제공처만 1, 날짜만 4. Netflix 공식 목록 후보 4개 신규 스테이징, 총 98개, 게시 추가 0. 자체 테스트 108/108 통과. 기존 DB 9건은 과거 기록. 시즌 월별 후보 수집 연결과 공식 첫 공개 확인 필요.

## DATA-29 문무 TMDB 한국 메타데이터 검증 (2026-11-12)

- backend `docs/tasks/DATA-29-munmu-provider-gap.md`: TMDB `문무(301354)` 실 API 응답은 한국 제작·KBS2 방송·11/14 시즌1/첫 회, KR watch provider에는 wavve만 존재. 국내 방송/TVING 공식 공개일이 있어도 Netflix provider 미등재로 기존 대상 플랫폼 필터에서 빠지는 사례 확인. 국가/방송사/다른 KR 제공처 필드 보존, 검토 분류 보강, 자동 게시 0. Netflix 공개일은 미확정.

## DATA-30 공식 OTT + TMDB 교차 대조 및 플랫폼 카드 (2026-11-12)

- 공식 KR 플랫폼 목록의 항목이 TMDB 제공처 필터에 없어도 대조 후보로 남긴다. 동일 작품의 서로 다른 OTT/공개일은 별도 후보와 이벤트로 보존한다. 백엔드 `docs/tasks/DATA-30-official-tmdb-platform-events.md`, 111/111 테스트 통과, 신규 DB 게시 0. iOS 카드에 OTT 텍스트 배지 표시, unsigned iOS 빌드 성공. 실제 브랜드 로고/공식 월별 자동 수집/검토→게시 연결/독립 검증 미완료.

## DATA-31 공식 OTT 우선 TMDB 인계 (2026-11-12)

backend `b637ecb`: 한국 공식 OTT 목록을 시작점으로 플랫폼/날짜/시즌마다 TMDB 역검색하는 읽기 전용 보고서 추가. 같은 OTT의 별도 시즌 후보 분리. 기존 공식 KR 날짜 후보 14건, 실 TMDB 요청은 `fetch failed`로 14건 모두 조회 실패(게시 0). backend 전체 자체검사 114/114 PASS(포트 허용 환경). 기존 iOS 카드 OTT 텍스트 배지 유지, 이미지 로고 미적용. 원본 backend `docs/tasks/DATA-31-official-first-tmdb-enrichment.md`. 독립 검증/DB 게시/배포 미실행. 기존 dirty 파일 보존.
## DATA-38 한국 OTT 최초 공개 2건 검토·로컬 게시 (2026-11-12)

- 원본 카드 `docs/tasks/DATA-38-kr-premiere-reviewed-publish.md`. TVING `유일무이 로맨스` 11/09, Disney+ `스타일 워즈` 11/11 최초 공개 교차 검증 후 로컬 `ott_reviewed` 매핑 11→13건 게시. 11~12월 DB 내 11건, 신규 두 건 `published_match` 직접 감사.
- StreamPick-only 11건 분류는 첫 공개 후보 2, 공식 목록만 4, 날짜 불일치 1, TMDB 날짜+KR 제공처 1, TMDB 날짜만 3. 전체 건수 일치·클라우드 배포·독립 검증 주장 없음. 백엔드 `npm test` 129/129 통과. 기존 dirty 변경 보존.
## DATA-57 · TMDB 독립 발견 범위 확대/비교 원인 분리 (2026-11-16)

- backend 원본 `docs/tasks/DATA-57-tmdb-parity-root-causes.md`. 기존 StreamPick 참조 52행: 정확 게시 26, 게시 날짜 차이 2, TMDB 시즌/영화 제공처 힌트만 7, 시리즈 제공처 힌트만 14, 플랫폼 미확인 1, 시즌 미발견 2. 과거 독립 TMDB 후보 49/52은 **게시 근거 49건을 의미하지 않음**.
- backend에 KR 제공처 없는 글로벌 TV 방영일 발견 경로 및 coverage 진단, 참조행을 후보 seed로 사용하지 않는 역감사 CLI를 추가. Node24 관련30/30·`.test.mjs` 전체154/154 통과; CJS 포함 220개 중 219통과·HTTP listen EPERM 1, `npm test` 빌드 삭제 EPERM. 읽기 전용 52행 분석 성공. 실네트워크 재수집/DB 게시/독립 검증은 이번 작업 미실행, 실제 누락 수량 감소는 미측정.
- 제품/계약/migration/앱 화면/검증 기준 변경 없음. 기존 개인 dirty 보존. 다음은 새 수집 경로 실측 → 공식 KR OTT 최초일 증거 연결 → review/publish → DB/API/참조 재집계.

## DATA-58 · TMDB 글로벌 방영일 분할 검색 (2026-11-16)

- backend 원본 `docs/tasks/DATA-58-tmdb-sharded-independent-discovery.md`. 월별 글로벌 방영일 검색 155/55페이지가 최대20페이지에서 잘리던 문제를 날짜 구간 자동 분할로 개선. 독립 검색 평가 코드와 분할 실패·중복 반례를 추가했다.
- 기준 52개 한국 OTT 참조 행 중 기존 게시 정확26, 시즌 미발견2 유지. 실 TMDB 상세에서 스폰지밥 시즌20과 몰몬교 주부들 시즌6은 시즌 배열에 없음. TMDB 시리즈 ID 확인을 해당 시즌 검증으로 간주하지 않는다.
- backend 자체 Node24 관련32/32·mjs 전체157/157 통과(이후 감사 도구 수정 재검사 별도). TMDB 실 재수집 결과 20페이지 상한 2,825작품/잘림12, 100페이지 상한 3,303작품/잘림0/API오류0. Coupang 영화 제공처 목록 미등재로 complete=false. 과거 참조 후보 ID 49행 작품 재발견은 첫 공개 검증이 아니며 게시 정확26/52 유지. DB/API 게시·독립 verifier·실기기·클라우드 미실행, 계약·migration·승인 상태 불변. app 개인 iOS signing dirty 보존.
## DATA-60 · 시즌 과거 글로벌 방영일 후보 누락 보완 (2026-11-16)

- backend `3d92ba9`: 글로벌 첫 방영일이 조회월 이전인 경우 KR 시리즈 제공처가 있으면 최근 2년·최신 2시즌을 검토 후보로 보존. 한국 최초일 `dateHint=null`, 자동 게시=false. Node24 전체 164/164 통과. 제품 게시0; 기존 52행 정확26·날짜차이2·미게시24 불변.
- Netflix 한국 신규공개는 자동 수집 지원. TVING Ads는 TVING/Wavve 혼합으로 저장 원문 파서만 지원. Disney+ 공개예정은 일반 회차 혼합으로 목록 자동수집 미완성.
- 다음: 공식 공개 일정→TMDB 정체성·시즌 연결→공식 최초일 확인→검토·게시 경로 실측. 공통 revision DATA-60-2026-11-16; 계약·migration·verifier 기준·독립 PASS 불변.

## DATA-61 · TVING Ads 실페이지 수집→검토 저장 자동화 (2026-11-16)

- backend 원본 `docs/tasks/DATA-61-tvingads-live-collection.md`. 공식 TVING Ads HTML의 날짜 카드 6개 수집, 기존 후보 규격 검증과 검토 staging 병합 연결. 동일 원문 반복 적재 신규0, 변경0, 동일6. Node24 전체 167/167 통과.
- TVING·Wavve 합동 제공 정보여서 플랫폼별 한국 첫 공개는 미확정, 자동 게시0. 기존 참조 정확26/52·날짜차2·미게시24는 이번 작업에서 재측정하지 않음. 계약·migration·독립 승인 불변.
- 다음: 공식 플랫폼/한국 최초일 증거와 TMDB 시즌 정체성 연결 후 게시 확인. 공통 revision DATA-61-2026-11-16.

