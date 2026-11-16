## DATA-63 · 공식 OTT 파이프라인 실제 실행 인계 (2026-11-16)

- backend `docs/tasks/DATA-63-official-pipeline-orchestration.md` 원본. 수집→후보→review 매핑→로컬 DB 70건 게시→52행 감사 통합 실행 성공. 신규 TVING 영화 후보2, 검토 매핑 추가0, 참조 26/52 일치·날짜차이2·미게시24. 날짜 검증 없는 자동 승인/게시 금지. TMDB provider 커버리지 미완전. 테스트178/178, 독립 runner 미실행. revision DATA-63-2026-11-16.

## DATA-62 · TVING 공식 예정작 후보 연결 (2026-11-16)

- backend 카드 `docs/tasks/DATA-62-tving-official-review-bridge.md`가 원본. TVING 공식 예정작 보고서9건을 DB 게시용 후보 저장소로 연결: created5, reviewed보존4, 신규 게시0. 기존검토70 DB 재게시 성공·테스트169/169. 다음은 신규 후보 한국 최초 OTT 공개일 검증·검토키 생성 후 게시. 클라우드·독립 승인 없음. 공통 revision DATA-62-2026-11-16.

## DATA-59 · StreamPick 첫 공개 재검증 인계 (2026-11-16)

- backend 원본 `docs/tasks/DATA-59-first-release-parity-semantics.md`, 증거 `docs/tasks/evidence/data59/first-release-parity-2026-11-16.md`. 52 첫 공개 행과 로컬 68 게시 중 정확26·날짜차이2·미게시24. 일반 회차 제외. 신규 게시0.
- backend 파서·비교·보고서 개선, Node24 162/162·Python12/12, DB 읽기 성공. StreamPick 실시간 DNS 실패, 참조 저장본만 사용. 다른 dirty 및 앱 개인 서명 유지, 독립 runner/클라우드/폰·계약/승인 변경 없음.
- 다음 담당: 24건 한국 공식 목표 OTT 시즌별 최초일 증거→검토·게시→DB 재집계. 날짜 차이 2건 공식 KR 원천 우선 유지. 공통 revision DATA-59-2026-11-16.

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

## DATA-47 인계 (2026-11-13)

- app `docs/system/ott-handoff-2026-11-12.md`를60건기준으로갱신. backend 원본 `docs/tasks/DATA-47-netflix-official-recovery.md`, 공식16건복구/실TMDB/5개curated review·62mapping/SQL·HTTP증거 저장. 문서 `docs/reviewed-publish.md`에후보분류와게시지원경계추가, verifier LEARN-0011에구현담당관측연결(독립승인아님).
- 실제KR11~12월OTT55→60, SQL·임시API신규5건확인, 재게시증가0, Node22 npm test154/154(기존dirty포함). 다큐1건은review/Canonical/API 유형미지원으로보류, 실패6건배치는저장전거부·state/57매핑불변·DB게시미실행. 기존16건전체를계속조회실패로표시하지말고최종상태표확인. 다음: 다큐지원영향검토/PAW정체성/날짜의미/다른OTT확대. 승인기준·앱·계약·migration불변, 클라우드/실폰/Node24/독립검증미실행. 개인서명/환경/미추적도구보존. 담당codex-data47-01해제.

## DATA-46 인계 (2026-11-13)

- app `docs/system/ott-handoff-2026-11-12.md`를 최신55건 기준으로 갱신. backend 원본 카드 `docs/tasks/DATA-46-netflix-search-disambiguation.md`, `scripts/disambiguate-netflix-tmdb.mjs`와 공식배우/국가 입력·실TMDB보고서·2건curated review·57개mapping 저장. 앨런11/12(시즌null), 고르돈11/18(시즌1) 수동 게시.
- 실제11~12월KR OTT53→55, SQL·임시HTTP신규2건 확인, 재게시중복0, Node22 npm test154/154(기존dirty포함). 미실행: 권장Node24/독립검증/클라우드/실폰. 기존검색잘림4건은2게시/2날짜차이로 정리; Mike는미발견, Nate는상세날짜·출연진 부족. 다음은 이보류건과공식상세실패16건/입점일의미 검토. 앱코드/계약/migration/verdict 불변, 개인서명/환경/미추적감사도구 보존. 담당codex-data46-01 해제.

## DATA-45 인계 (2026-11-12)

- app `docs/system/ott-handoff-2026-11-12.md`에서 최신 사실·다음 순서 확인. backend 원본 카드 `docs/tasks/DATA-45-netflix-official-identities.md`, 공식ID별44건 관측/영문제목대조 CLI/실TMDB결과/11개curated review 및55개mapping 저장. title2는 원제로 사용하지 않으며 redirect/예고편만으로 시즌·한국 첫날 확정 금지.
- 실제로컬11~12월KR OTT42→53, Netflix11월35→46. SQL/임시HTTP신규11건 확인, 재게시중복증가0, Node22 npm test149/149(기존dirty포함). 독립verifier/클라우드/실폰/Node24 미실행. 다음: 상세실패16건, TMDB미발견2, 검색잘림4, 날짜차이11 확인 후 근거가 있는 배치만 review→publish. API/앱코드/계약/migration/승인기준 불변, 기존서명/환경/미추적 도구 보존. 담당codex-data45-01 해제.

## OTT 작업 최신 인계 (2026-11-12)

- 새 에이전트는 app `docs/system/ott-handoff-2026-11-12.md`에서 DATA-43 로컬 게시·DATA-44 미분류 분석·남은 공식 제공일 검토·다음 실행 명령을 확인한다. 신규 게시/DB 재측정 없이 문서만 정리한 인계다.

## DATA-44 인계 (2026-11-12)

- backend `docs/tasks/DATA-44-netflix-review-backlog.md`에75건/미분류44건 재현 분류와 행별 후속 검토표. `scripts/classify-ott-review-backlog.mjs`, `data/reference/netflix-kr-*-2026-11-12.json` 및 검토 매핑 snapshot 사용. 검색미발견33/후보날짜이전10/이후1, 기존검토2+시즌미확인1+매핑미일치41. 날짜차이를 입점/재공개로 단정하지 않음.
- 최종Node22 npm test145/145 통과(기존dirty/미추적포함working tree), 권장Node24·독립검증미실행. 웹/DB이번조회0·신규게시0, 이전로컬42건은재측정아님. 다음은33건공식videoID원제/종류확인→11건정체성/플랫폼날짜의미→알리시아의법시즌확인. 앱코드/계약/migration/verdict변경없음. 공통문서이번머리말만선택커밋, 기존본문dirty/signing/다른도구보존. 담당codex-data44-01해제.

## DATA-43 인계 (2026-11-12)

- backend Netflix KR 75개 중 TMDB 영화/시즌 날짜 단일 매칭을 수동 교차검토해 신규 25건 review/매핑/로컬 DB 게시. 공식 11~12월 4OTT 게시 17→42건, 전체 reviewed mapping 19→44. Node22 npm test 138/138 통과. 문무·나인 투 식스·전지적 집착 시점 한국 OTT 최초 제공일 미확인 유지.
- 원본 카드 backend/docs/tasks/DATA-43-netflix-reviewed-batch.md 및 curated review JSON. 다음은 Netflix KR 공식 75건 나머지 44건 유형 분류와 OTT 입점일 구분, TVING/Disney/Coupang 공식 수집 확대. 기존 상태 dirty·signing 보존. 검증/클라우드/실폰 미실행.

## DATA-27 StreamPick 11건 TMDB/국내 공식 근거 대조 (2026-11-12)

- backend `docs/tasks/DATA-27-streampick-tmdb-provenance.md`: StreamPick-only 신작 11/11 TMDB 날짜 일치, KR 제공처 일치 6/11. 한국 공식 OTT 같은 날짜 단서 `유일무이 로맨스`·`스타일 워즈` 2건은 최초 공개 미확정. 현재 분류: TMDB 날짜+제공처만 5, 날짜만 4, 한국 공식 공개일 단서 2. 자동 게시 0. DB 기존 9건은 과거 조회값이며 이번 DB 재조회 없음. backend 전체 테스트 105/105 통과, 독립 검증/배포 미실행.
- 다음: 시즌 날짜 기반 누락 후보 배치 연결, 공식 첫 공개 검증, reviewed 게시 뒤 DB 재집계. 기존 dirty 및 앱 signing 보존.

## DATA-26 StreamPick 전체 달력/로컬 DB 건수 차이 (2026-11-12)

- StreamPick 실제 HTML 캘린더(11~12월) 전체 885 이벤트 = 회차 849 + 신작 36. 대상 4 OTT 연결행 신작 15(Netflix 10, TVING 3, Disney+ 2, Coupang 0), 회차 703. 한국 OTT 최초 공개만 게시하는 현재 분류와 `episode`를 섞어 집계하면 큰 차이 발생.
- 로컬 DB 9건 vs StreamPick 신작 15건: 날짜·제목·플랫폼 일치 4, StreamPick에만 있는 신작 후보 11, DB에만 있는 5. 후보는 미검토이므로 신규 게시 0. backend `docs/tasks/DATA-26-stream-count-gap.md` 원본, `scripts/audit_streampick_calendar.py` 감사 도구, 2/2 자체검사 통과. 추후 11개 후보 공식 KR 근거 확인 및 회차 기능 범위 결정 필요. 독립 검증·배포 미실행.

## DATA-25 TMDB 역대조 인계 (2026-11-12)

backend `docs/tasks/DATA-25-tmdb-dated-discovery.md`: StreamPick 2026년 11~12월 샘플 35행 중 TMDB 시즌/영화 공개일 단서 31행, KR 제공처까지 일치 25행. TMDB의 `'한국어 제목' - English title` 래핑 2행 누락 수정, 4행은 시즌 API 404 2행 및 제목 검색 미발견 2행. 월별 KR 제공처 discover 211 고유 TMDB ID는 참고 후보이며 한국 OTT 최초 공개 이벤트 수가 아니다. 자체 테스트 14/14, DB 게시 0. 기존 3개 저장소 공통 문서 변경은 동일 사본 유지, 기타 dirty는 보존. 다음은 한국 공식 최초 공개 근거 확인, 월별 후보 수집과 검토/게시 연결. 독립 검증·배포 없음.

## DATA-24 인계 (2026-11-11)

TMDB 카탈로그 568개는 달력 게시와 별개다. 검토 완료 KR OTT 포스터를 제목·플랫폼·종류·단일 TMDB 매칭으로 보완, 로컬 DB 포스터 2개 UPDATE. 신규 일정 0, 11~12월 기존 9건, 테스트 86/86. 카드 `docs/tasks/DATA-24-tmdb-reviewed-poster-link.md`. 다음은 공식 공개일 후보 검토·게시 연결. `.env.example` 실키 및 개인 signing dirty 보존, 독립 승인·클라우드 미실행.

## DATA-18 인계 (2026-11-11)

backend 공식 KR 공개 후보 2건(`재혼 황후` 11/03·`스마일 클리닉` 12/03) 추가, staging 86→88, 재실행 중복 0, 테스트 75/75. 신규 게시 0, DB 재조회/독립 검증/클라우드 배포 미실행. 원본 backend `docs/tasks/DATA-18-kr-ott-premiere-evidence.md`. 다음 담당은 reviewed candidate 수동 검토 연결 후 실제 DB 게시 여부 확인. iOS signing 미커밋 보존.

## DATA-16 인계 (2026-11-11)

- backend `docs/tasks/DATA-16-netflix-reviewed-publish.md`: Netflix 한국 기사 후보 두 건을 `work/ott-candidates`에서 구현 담당 검토, `data/curated/ott-reviewed-mappings.json`에 신규 고정 키 8·9 추가. `npm run publish:reviewed -- --file data/curated/ott-reviewed-mappings.json` 성공(9건). 직접 로컬 DB SELECT에서 신규 `가능한 사랑`(2026-11-06)/`푸른길`(2026-11-20) 확인. 각각 `date_only`, `instant_at=NULL`, `KR`, `netflix`. `npm test` 75/75.
- 로컬 후보 상태·DB는 Git 제외; 다른 장치 또는 클라우드에 동일 9건을 적용하려면 공식 후보 수집/검토 상태 복원 필요. 구현 담당의 검토는 독립 승인 아님. 앱 개인 signing 미커밋 파일 보존, 배포/실폰/독립 검증 미실행. 다음은 TVING·Disney+·Coupang Play 공식 일정 확장 또는 Render+Supabase 실제 배포.

## DATA-15 인계 (2026-11-11)

- 한국 Netflix 뉴스룸의 2개 공식 작품별 날짜를 확인해 backend 공식 lineup JSON 후보로 추가. stage 80→82건, 동일 파일 재실행은 unchanged=1, 신규 published=0. backend `npm test` 75/75. 상세 `backend/docs/tasks/DATA-15-netflix-korean-confirmed.md`.
- **다음** 후보를 DB candidate 검토·매핑하고 실제 로컬 DB에 게시 후 개수를 SQL로 확인. 현재 staging과 `publish:reviewed`는 별도 경로. 독립 검증/Render·Supabase 배포 없음. 앱 개인 서명 dirty 변경 유지.

## DATA-14 handoff (2026-11-11)

- Netflix Tudum dated titles 69 stored as review-only metadata in backend data/lineups/netflix-2026-11-tudum-observed.json; 69 created and 69 unchanged on replay; staging total 80 including earlier TVING tentative 11, 0 new published.
- Next: verify each title against Korean service availability and first-release date before publication; confirm image rights before using posters. Backend self-test 75/75, no verifier approval, no cloud deployment.

## DATA-12 인계 (2026-11-11)

- Netflix Tudum 월간 **저장된 텍스트/Markdown**의 날짜별 복수 작품을 검토용 JSON으로 변환하는 `parse-netflix-tudum.mjs` 추가. 입력 JSON은 기존 `stage-ott-lineup.mjs`와 연결. 실제 공식 HTML 자동 다운로드/TVING 파싱이 아니며 한국 최초 공개·게시를 주장하지 않는다.
- 로컬 DNS 오류로 Netflix/TVING 공식 HTML·robots 응답 확인 실패. 웹 검색에서 Netflix 2026년 11월 공식 다작품 목록 확인. 실수집 0건, 기존 OTT 게시 7건. backend 작업 카드 DATA-12와 ADR-015에 경계 기록.
- `node --test` 관련 9/9, 전체 `npm test` 72/72 성공(첫 sandbox dist unlink EPERM). app 사용자 Xcode signing dirty 유지. 추가 독립 검증/배포 없음.
- 다음은 공식 사이트 접근 허용·HTML 구조 실측 후 Netflix/TVING 자동 후보화와 한국 날짜 검토.

## DATA-09 OTT 7건 로컬 게시 인계 (2026-11-11)

- backend 원본 `docs/tasks/DATA-09-ott-reviewed-expansion.md`, `docs/reviewed-publish.md`, `docs/demo-deployment.md`를 참고. 세 공식 후보 수동 검토 후 기존 네 건 포함 `ott_reviewed` 7건 로컬 게시(exit0). 최초 STALE_MAPPING은 재검토 후 해결. 작성자 로컬 실행 결과, 전체제품 PASS 아님.
- backend 첫 상태 b6e55456e, app 998465ed49b7. Git 변경은 신규 작업 카드·공식 매핑·문서; 앱 개인 `project.pbxproj` dirty는 기존 사용자 설정으로 별도 보존. API 계약·migration/verifier 승인기준은 미변경.
- 다음은 실제 Render+Supabase Free 계정 연결 확인 → DB migration 및 실수집/OTT 검토 재게시 → 공개 API·Google 계정 설정·찜 왕복 테스트 → 동일 Render HTTPS URL로 앱 재빌드/실기기 설치. 외부 배포와 포스터·OTT 자동 전수 수집은 아직 미실행.

## DATA-07 세계 게임 출시일 확대 (2026-11-11)

- backend `docs/tasks/DATA-07-global-game-releases.md`: IGDB WORLD에 북미·유럽·아시아·전세계 출시 지역 포함. KR/JP/AU/NZ/CN/BR 개별 지역 유지, 날짜별 페이징·요청 간격·대량 DB 게시 시간 조정.
- 작성자 `npm test` **63/63 통과**, 실제 `npm run collect:daily` 성공. 로컬 DB GAME 출처 이벤트 WORLD **4,761**, JP **75**, BR **4**, KR **3**, AU **3**, NZ **2**, CN **1**. GTA VI WORLD 2026-11-19 조회됨(플랫폼별 중복은 별도 이벤트). IGDB 시점 데이터 기준.
- 로컬 DB 적재 성공, **클라우드 DB 적재·실기기 UI·독립 검증·OTT 전수/이미지 수집 미실행**. iOS signing 미커밋 변경 보존, verifier 기준·계약·migration 불변.

## OPS-01 Render + Supabase 무료 배포 (2026-11-10)

사용자가 Render Free API + Supabase Free PostgreSQL/Storage를 확정했고 오늘 배포를 목표로 한다. backend `render.yaml`에서 Render 30일 만료 DB를 제거하고 `DATABASE_URL` secret을 입력받도록 변경. 연결 및 무료 과금 방지 절차는 backend `docs/demo-deployment.md`, 원본 작업 카드 `docs/tasks/OPS-01-render-supabase.md`, ADR-014. 실 Supabase/Render 생성·migration·공식 데이터 적재·폰 운영 URL 전환은 아직 미확인. iOS pbxproj 개인 설정은 유지.

# 계정·모델 사이에서 작업 이어받기

## APP-DEMO-01 인계 (2026-11-10)

사용자 우선순위는 UI 소규모 수정 → 검증된 실데이터 → 클라우드 데모 → 자동 배포. app ContentView의 두 찜 버튼을 하나의 하트로 합쳐 contentId가 있으면 작품 찜, 없으면 일정 찜으로 저장하고 캘린더 아래 개별 제공처/마지막 성공 정보를 숨겼다. backend `CATALOG_PROVIDER_ONLY`는 이벤트 조회(날짜/미정)와 freshness에서 fixture를 필터링한다. Render Blueprint/CI/운영 절차 초안 작성, 외부 리소스 미생성. 이 환경에서 iOS unsigned 빌드 성공·backend `tsc --noEmit` 성공, `npm test`는 Node20과 기존 dist 쓰기 EPERM으로 미통과. 공식 OTT 4건 실데이터는 과거 로컬 적재뿐이며 새 클라우드 DB에 아직 없다. 앱 프로젝트 기존 서명/HTTPS 설정 dirty 보존. 원본 카드 app `docs/ai/tasks/APP-DEMO-01.md`, backend 배포 절차 `docs/demo-deployment.md`. API 계약·migration·verifier acceptance 변경 없음, 승인/PASS 주장 금지. 다음은 Node24 전체 검증, 공식 데이터 재검토 후 새 DB 적재, Render/GitHub 연결과 실기기 HTTPS 빌드 및 사용자 확인이다.

## APP-AUTH-12 최신 인계 (2026-11-10)

사용자가 iPhone Google 로그인이 정상이라고 확인. APP-AUTH-12에서 계정 설정·찜의 원격 전체 조회 진행/성공 시각/실패 UI와 로컬 필터 저장 안내를 추가했다. 작성자 unsigned iOS Simulator Debug 빌드 성공. 실기기 신규 UI, 재실행 세션 복원, 설정/찜 다른 기기 왕복, 독립 검증은 미실행. 기존 Xcode signing/API override 미커밋 변경은 보존한다. 다음 세션은 app 카드와 Git 상태를 확인하고 iPhone 실험으로 진행한다. 전용 macOS 계정 방식은 폐기 상태 유지.

revision: `CONTEXT-2026-11-10-20`. 원본 app `docs/system/`, backend/verifier에는 동일 사본.

## APP-AUTH-08 인계 (2026-11-10)

사용자 제공 Google iOS OAuth 공개 Client ID를 app Xcode Debug/Release에 반영하고 callback URL scheme을 역순 ID로 등록. backend 로컬 .env도 같은 GOOGLE_IOS_CLIENT_ID로 설정(비밀 변수 내용 공개/커밋 금지). 앱 카드 `docs/ai/tasks/APP-AUTH-08.md`. 실제 HTTPS API URL 준비 후 iPhone Google 계정 로그인·설정/찜 동기화·세션 복원을 시험해야 하며 독립 검증/전체 PASS는 미실행. 전용 Mac 계정 폐기 유지.

## BE-AUTH-06 인계 (2026-11-10)

backend `docs/tasks/BE-AUTH-06.md`에서 초기 `.env` 생성 키를 실제 사용 키 `GOOGLE_IOS_CLIENT_ID`와 맞췄다. 기존 `.env`는 수동으로 수정한다. Google Cloud iOS OAuth Client ID/역순 callback scheme과 iPhone이 접근 가능한 HTTPS API URL이 사용자 준비 사항이다. backend 작성자 테스트 Node24 환경 53/53 통과; 기본 Node20 sandbox의 dist unlink EPERM 기록. Google 실제 로그인, 기기간 동기화, 독립 verifier 미실행. 전용 macOS 계정 폐기 유지, 계약 및 migration/acceptance 변경 없음.
공통 문서는 `SYNC-2026-11-10-02`이다. APP-01 통합 및 독립 검증 대기 상태를 반영했고 OTT 날짜 정책/API 스키마는 유지한다. 별도 맥락 저장소·DB·서버 없이 기존 문서를 사용한다.


## 2026-11-10 신규 계정 구현 인계

APP-BE-AUTH-01 카드에 Google/서비스세션/서버설정·찜 코드와 검증을 기록했다. backend 51 테스트 및 iOS unsigned build 자체 성공. 실 Google OAuth/실DB·기기간 왕복/독립 통합 검증은 아직 수행하지 않았다. 등록된 OAuth client/HTTPS 접근 준비가 필요하며 verifier verdict/acceptance는 건드리지 않는다. 원본 문서는 app/docs/system이고 backend/verifier 사본은 동일 revision. 전용 Mac 계정 방식은 계속 폐기 상태다.

APP-AUTH-02(app d8358ec)은 HTTPS 계정 API 주소 빌드 주입과 찜 cursor 충돌 재시도. APP-AUTH-03(app `docs/ai/tasks/APP-AUTH-03.md`)은 계정 전환 중 지연 응답 차단과 로그아웃 시 로컬 즉시 정리/기존 token으로 서버 폐기를 추가한다. 요청 시작 bearer token을 연속 API 호출에 고정한다. 기존 backend dist 테스트 44/45(1개 listen EPERM), iOS unsigned build는 별도 기록. 실기기 Google OAuth/실DB·계정격리/독립 검토는 여전히 대기이며 서버 로그아웃 폐기 실패는 잔여 위험이다.

BE-AUTH-04(backend `docs/tasks/BE-AUTH-04.md`)는 UsersService/Repository 경로의 계정 격리·설정 CAS·찜 멱등/커서 회귀 검사 2개를 추가하고 JWT 변조 테스트의 Base64URL 마지막 문자 비결정성을 수정했다. 허용된 HTTP 바인딩 환경에서 전체 backend 기존 dist 검사 53/53 통과, 일반 sandbox에서는 listen EPERM을 관찰했다. fake Prisma 기반 작성자 자체 검사이며 실제 DB/Google OAuth/HTTPS/독립 검증 결과로 확대하지 않는다. API 계약·migration 불변, 전용 Mac 계정 방식 폐기 유지.

## APP-AUTH-07 인계 (2026-11-10)

앱 `docs/ai/tasks/APP-AUTH-07.md`: 설정 PUT·찜 PUT/DELETE의 401에서 해당 요청 세션이 현재와 일치하면 Keychain/화면 상태 즉시 정리, 계정 필터는 APP-AUTH-06 경로로 초기화. 늦은 다른 세션의 401은 무시. iOS unsigned build 성공, 실제 Google/HTTPS 401 UI·두 기기·독립검증 미실행. API/migration/acceptance 변경 없음.

## APP-AUTH-06 인계 (2026-11-10)

앱 `docs/ai/tasks/APP-AUTH-06.md`: 계정 소유 필터 표식을 저장하고 로그아웃·401·계정 변경 시 기본값으로 복원한다. 재시작 중 이전 계정 필터는 Keychain 복원 전에 초기화하고 성공한 계정 설정만 재적용한다. iOS unsigned build 성공, CoreSimulator 서비스 경고 관찰. 실 Google/HTTPS·두 기기·독립 검증 미실행. 계약 및 migration 불변.

## APP-AUTH-05 인계 (2026-11-10)

앱 `docs/ai/tasks/APP-AUTH-05.md`: 여러 refresh 중 최신 시작 응답만 반영하고 설정 저장과 refresh 응답의 충돌을 revision으로 방지. 찜 쓰기 완료 후 pending 해제 → 서버 재조회 순서로 바꿔 APP-AUTH-04의 후속 재조회 누락을 수정. iOS unsigned build 성공, 실행 중 CoreSimulator runtime 경고 관찰. Google 실로그인/실기기 지연 응답/2기기 동기화/독립 검토 미실행, 계약 및 마이그레이션 변경 없음.

## APP-AUTH-04 인계 (2026-11-10)

앱 `docs/ai/tasks/APP-AUTH-04.md`에 화면 active 복귀 시 원격 설정/찜 refresh, 찜 같은 대상 중복 mutation guard 및 snapshot 경합 방어를 기록했다. iOS 서명 없는 빌드 성공. Google 실로그인·HTTPS 실제 기기/두 기기 왕복/외부 리뷰는 미완료. API/migration 불변.

## BE-AUTH-05 실제 DB 인계 (2026-11-10)

backend `docs/tasks/BE-AUTH-05.md` 원본에서 작성자 실행 결과 관리. 임시 PostgreSQL에서 실제 Prisma 계정/서비스세션 발급·폐기, 사용자별 설정 CAS 409, 찜 멱등/커서 계정·버전 경계 자체검사 통과. `npm test` 53/53, `test:db` exit0. 다만 고정 digest 이미지가 로컬에 없어서 `GODIEOR_TEST_POSTGRES_IMAGE=postgres:16-alpine`을 명시해 로컬 이미지로 실행했으며 고정 이미지 재검증 필요. 운영 DB 사용 없음, 임시 컨테이너 제거. 계약/migration 변경 없음. Google 실인증·HTTPS iOS·멀티기기 왕복·독립 검증 미실행, verifier draft/PENDING 그대로다.

## 2026-11-11 DATA-04 작업 인계

backend 6da3358 공식 제공처 일일 수집 코드 및 app OTT 분류 응답 표시 구현. 테스트 backend 62/62, 앱 unsigned build 종료 0(CoreSimulator 경고). 실제 인증/DB 반영 및 OTT 전수 수집 검증은 남았다. backend 추적 .env.example에 사용자 실키가 있어 미커밋이며, 무시된 .env의 제공처 키는 비어 있다. 키 이전 전 git add -A 금지. 개인 iOS pbxproj 변경 보존. 상세 기록 backend docs/tasks/DATA-04-daily-official.md와 app docs/ai/tasks/APP-DATA-04.md. 독립 verifier 판단은 변경 없음.

## 시작

1. 역할(설계/구현, 독립 검토)을 확인하고 작업 저장소 `AGENTS.md`를 읽는다.
2. 구현 세션은 `status.md`와 정책/작업 원본을 읽고 각 저장소의 HEAD·branch·dirty 상태를 확인한다.
   디스크 파일이 웹 전달본/기준 SHA와 다르면 차이를 확인하고 오래된 전달본의 상태를 그대로 적용하지 않는다.
3. 현재 작업 카드와 사용자 요청을 확인한다. 관련 없는 선행 작업을 다시 구현하거나 미정 정책을 승인하지 않는다.
4. 코드/문서 수정 전 작업 카드를 만들거나 이어받는다. 작업 ID, requirement ID(없으면 이유), 담당 세션의 식별명,
   상태, 기준 SHA, 작업 브랜치/worktree, 수정 범위, 완료 조건, 예상 실패 사례를 적는다.
   개인 이메일/토큰 대신 `codex-context-01` 같은 임의 세션 이름을 쓴다.

작업 카드 원본은 작업 저장소 `docs/tasks/` 또는 app의 기존 `docs/ai/tasks/`에 둔다.
상태 문서는 카드 위치를 연결한다. 같은 기록을 세 저장소에 복제하지 않는다.

## 계정 전환과 동시 수정

- 순차 전환: 이전 세션이 카드에 중단 위치·미커밋 파일·다음 행동·실행/미실행 검사를 남기고 담당을 해제한다.
  다음 세션은 Git 상태와 비교한 뒤 담당을 인계받는다. 기존 변경을 임의 reset/stash/덮어쓰기 하지 않는다.
- 동시 개발: 서로 다른 작업과 `codex/` 브랜치, 별도 worktree를 사용한다. 동일 checkout에서 동시에 수정하지 않는다.
  카드에 같은 파일/계약 변경이 겹치면 구현을 나누거나 순차 진행하고, 통합 시 변경과 검사를 다시 확인한다.
- 공통 `status.md`, 정책/계약은 한 세션이 통합한다. 다른 세션은 자기 카드에 변경 제안을 기록한다.
  카드의 담당 표시는 잠금 장치가 아니다. 작업 시작 전 실제 실행 중인 세션과 파일 변경을 확인한다.
- 다른 장치에서는 로컬 미커밋 파일이 전달되지 않는다. 사용자 요청 범위의 push/pull 또는 파일 전달 후 SHA를 확인한다.

## 종료·중단

1. 카드에 실제 변경, 사용자 확정/구현 제안, 실제 명령·결과, 미실행 검사·남은 문제를 기록한다.
2. 정책/ADR/학습 기록은 해당 원본을 갱신하고 연결한다. 가설·예방 설계·실제 실패를 구분한다.
3. `status.md`의 현재 상태·작업 목록·다음 행동을 갱신하고 status/handoff 사본을 함께 동기화한다.
   제품 정책을 바꾸면 기존 architecture/plan/policies도 동일 SYNC revision으로 갱신한다.
4. README·로드맵의 현재 상태 요약이 원본과 충돌하지 않는지 확인한다.
5. 검토 가능한 단위로 영문 타입 + 한글 설명의 커밋을 만든다(`docs: 인계 문서 갱신` 등). 자기 커밋 SHA를 같은 커밋 안에 넣으려 하지 말고,
   최종 SHA는 Git 이력과 커밋 후 생성하는 웹 전달본에서 확인한다. 담당을 해제하고 다음 행동을 남긴다.

## 커밋 메시지 형식

`type(scope): 한글 설명`으로 쓴다. scope는 선택이다. 타입은 `feat`, `fix`, `docs`, `chore`, `test`,
`refactor`, `build`, `ci`, `perf`, `revert` 등 영어로 쓰고 변경 설명은 한글로 적는다.
기능 추가는 `feat: 월간 달력 추가`, 문서 수정은 `docs: 커밋 규칙 보완`, 검사는 `test: 날짜 경계 검사 추가`처럼 쓴다.
기존 커밋은 재작성하지 않는다. 이 규칙은 commit 권한을 push·배포 권한으로 확대하지 않는다.

## ChatGPT 웹에 전달

세 저장소를 같은 상위 디렉터리에 둔 상태에서 app에서 실행한다. Python 3.9 이상, 외부 패키지 불필요.

```sh
python3 scripts/export-context.py
python3 scripts/export-context.py --check
```

생성물은 app `work/context/chatgpt-context.md`다(Git 제외). 커밋 후 생성하고 `--check`로 최신 여부를 확인한 뒤
ChatGPT 웹 대화/프로젝트에 업로드한다. 기본 형제 경로가 다르면 `--backend /경로 --verifier /경로`를 사용한다.
명시한 공개 문서 목록과 작업 카드 디렉터리(app `docs/ai/tasks/`, backend/verifier `docs/tasks/`),
backend ADR 디렉터리 `docs/decisions/`의 바로 아래 `.md` 파일만 합친다. 새 카드는 다음 생성에 자동 포함된다.
필수 파일 하나라도 없거나 공통 사본이 다르면 생성에 실패한다.
각 출처의 SHA-256과 세 저장소 HEAD·branch·dirty 상태, UTC 생성 시각을 포함한다.
제품 실행 여부·승인 여부를 검사하는 도구는 아니다. 키·대화 원문·.env·실행 로그는 수집하지 않는다.

웹에서 다음과 같이 요청한다.

> 첨부 문서의 생성 시각·커밋·dirty 상태를 확인하고 현재 상태부터 읽어라.
> 포함된 문서만 읽었다고 말하고 미포함 링크를 읽었다고 가정하지 마라.
> 사용자 확정·기술 제안·미정·작성자 실행·독립 검증을 구분해 논의해라.
> 코드가 없는 전달본만으로 구현 정확성이나 검증 PASS를 선언하지 마라.

웹 대화는 로컬 파일을 자동 갱신하지 않는다. 웹에서 합의한 변경은 관련 작업 카드에
날짜·제안/사용자 확정 여부·이유·적용할 원본 위치를 남겨 Codex에 전달한다.
Codex는 현재 파일/정책과 대조해 반영하고 새 전달본을 생성한다. 예전 파일을 함께 업로드했다면 최신본을 명확히 지정한다.
전체 대화 원문 보관은 필수가 아니다. 작업에 영향을 준 결정·반례·미해결 질문을 남긴다.

## 독립 검토 예외

독립 reviewer에게 구현용 웹 전달본·구현 대화·작성자 학습 해설을 주입하지 않는다.
기존 verifier 절차에 따라 요구사항/기준, 고정 app/backend SHA, 계약/migration digest,
변경 사실과 공식 근거를 제공한다. 현재 상태 문서는 검증 가능 범위/원본 위치 확인용이고 결과의 정답이 아니다.
구현 담당이 기록을 공유했다는 이유로 acceptance나 verdict를 승인할 수는 없다.


## 현재 실행·인계 정책 (2026-11-10)

전용macOS계정 방식은 사용자지시로폐기했다. godieorbuild로그인·su·비밀번호·ACL확장/복구를 다음필수작업으로 요구하지 않는다. OS계정자체는이작업에서삭제하지 않았다. 현재코드 verifier de0560f 및 docs/local-verification.md를 따른다.

기존계정에서 검토한고정source로 iOS서명없는빌드와 backend/임시DB 검사를수행한다. iOS local-reviewed와 backend sandboxed를구분, isolation_verified=false 유지. 증거binding/독립리뷰/실패·미실행표시/승인기준을 유지한다. 로컬실행성공과 전체제품PASS를구분한다.

새대화 요청:
> 세저장소 AGENTS와 app/docs/system/status.md·handoff.md, verifier/docs/tasks/INT-01-secret-check.md·docs/secret-check.md·docs/local-verification.md를읽고 Git상태를확인해라. 전용Mac계정방식은폐기됐다. 검사107개/고정run의iOS·backend·API·DB·literal비밀검사는성공했지만 필터/계정설정/제공처/UI흐름4개미완료로전체ERROR다. 가상UI로로컬설정복원은확인했으나 Google/계정서버코드는구현됐으나실Google/실단말왕복은미확인이다. 다음작업은최신APP-AUTH-09/10카드를읽고실제HTTPS기기연결부터확인해라. 이미구현한인증/동기화를중복구현하지마라. 기준승인/전체PASS를만들지마라.

## APP-AUTH-09 인계 (2026-11-10)

Mac 로컬 API(127.0.0.1:3000)를 같은 Wi-Fi 테스트 iPhone에 TLS로 노출하는 개발 도구를 app/scripts에 추가했다. 인증서 설치·실제 주소 설정 절차는 `docs/ai/local-iphone-auth.md`, 카드 `docs/ai/tasks/APP-AUTH-09.md`. 실기기 연결·Google 로그인·서버 동기화·독립 검증은 미실행. 전용 Mac 계정 방식 재개하지 않음.

## APP-AUTH-10 최신 인계

공개/계정API주소해석을 app9f04c67에서통일. Swift주소회귀와실제번들Info값검사·iOSunsigned빌드성공, 분리컨텍스트재검토완료. 실제Google/iPhone/HTTPSproxy는미실행. 다음세션은 APP-AUTH-10→09→local-iphone-auth 문서를읽고실제주소·backend가동을확인한다. 전용Mac계정방식재개/인증코드중복구현금지. 키/인증서신뢰·실폰조작은사용자범위와구분하고실행하지않은성공을선언하지않는다.

## APP-AUTH-11 최신 인계: 사용자 iPhone 단계

Mac실제HTTPS CA/hostname검증·health/options200·비인증/invalidtoken401 및unsigned iPhoneOS build성공. 원본 app/docs/ai/tasks/APP-AUTH-11.md. 공개CA와구체적인현재주소는app/work/iphone/에있고개인키를공유하지않는다. 서버는기존사용자프로세스를유지했다.

사용자가동일Wi-Fi iPhone에개발CA프로파일설치후일반→정보→인증서신뢰설정에서해당CA를직접신뢰하고Safari health를확인해야한다. Mac계정분리·GoogleClient재등록·기존서버재시작을자동선행작업으로만들지마라. 실제폰/정상Google로그인/기기간왕복은미확인. 원본IP/서버생존은재확인하고인증서경고를우회하지않는다.

## 사용자 폰 health 확인 후 재개

폰Safari health는사용자확인완료. CoreDevice읽기연결/개발자모드확인. 다음실행전Xcode의DEVELOPMENT_TEAM본인계정선택이필요하며아직미지정이다. 사용자Team설정후서명빌드·설치·Google로그인으로진행한다. 폰인증서설치나기존서버준비를다시첫단계로돌리지말고실행하지않은정상로그인/동기화성공을선언하지않는다.
## DATA-03 인계 (2026-11-10)

- backend `16fb65f`: `npm run publish:catalog -- --file <절대경로>`로 검토된 영화·게임·EPL Canonical JSON을 provider-origin으로 적재하는 경로 구현. 입력 전체 선검사, 중복 키 거부, 기존 작품/팀/시장 정체성 preflight 보호. 작업 카드 backend `docs/tasks/DATA-03-reviewed-catalog.md`.
- 작성자 `npm run build` 성공, 신규 5/5 및 기존 포함 58/58 테스트 통과. 첫 기본 sandbox build는 기존 dist 삭제 EPERM, 허용 실행에서 성공. 실제 공식 데이터/DB 재적재/API end-to-end/독립 검증은 미실행.
- 다음 단계는 공식 1차 출처 기반 영화·게임·EPL 레코드의 수동 근거 검토와 로컬 적재. Render+Supabase 배포는 아직 하지 않음. app iOS 프로젝트 signing/HTTPS 미커밋 설정 그대로 보존.
## DATA-05 공식 수집 로컬 검증 인계 (2026-11-11)

backend .env에 공식 제공처 키 4개가 설정됐고 추적 .env.example 키는 비어 있음. EPL 2027시즌 미공개 404 처리와 IGDB 한국 출시일 date 타임스탬프 파싱 수정. backend 자체 테스트 63/63 성공. 로컬 PostgreSQL에 기존 OTT 카테고리 마이그레이션 적용 후 KOBIS 1,902/EPL 380/IGDB 1건 적재, 같은 날 재실행 모두 skip. 클라우드 DB/OTT 자동 전수/독립 검증 미완료. backend docs/tasks/DATA-04-daily-official.md 참조. iOS 개인 signing 변경 보존.
# DATA-06 모바일 플랫폼 인계 (2026-11-11)

backend IGDB KR 출시일에서 iOS/Android 분류를 지원하고 game_device enum migration과 OpenAPI options/settings를 확장했다. iOS 동적 필터·상세 기기명 표시도 변경했다. 자체 backend 63/63, unsigned Simulator 빌드 성공. 로컬 DB migration 적용 및 IGDB 강제 재수집 성공(3건, iOS/Android 각 1건 확인). iPhone 설치/클라우드 migration·서버 배포·독립 검증은 미완료. app 개인 pbxproj 서명 설정은 건드리지 않았다. 원본 카드 backend `docs/tasks/DATA-06-mobile-platforms.md`, app `docs/ai/tasks/APP-DATA-06.md`. 후속은 migration 적용 후 IGDB 재수집, 모바일 필터/계정 저장 확인. OTT 전수·이미지 적재는 별도 미완료.

# DATA-08 게임 포스터 후속 인계 (2026-11-11)

- backend `docs/tasks/DATA-08-game-cover-metadata.md` 기준 IGDB 커버 이미지 ID → 기존 `content.poster_url` 경로 구현. 앱 API 계약/DB migration/verifier acceptance 변경 없음.
- 실제 IGDB 강제 재수집·DB poster 수 확인·API/폰 카드 표시 점검이 다음 행동. 로컬 API 3000 미기동, iOS 개인 signing 미커밋 파일 유지. OTT/영화 포스터와 운영 배포 미완료.

# DATA-08 IGDB 로컬 포스터 실수집 인계 (2026-11-11)

- backend `docs/tasks/DATA-08-game-cover-metadata.md`: IGDB만 강제 재수집, WORLD/KR/JP/AU/NZ/CN/BR 7개 범위 성공. DB 작품 3,181건 중 `poster_url` 3,152건 확인.
- 임시 로컬 API(3099) `GET /v1/events` 게임 30건과 작품 상세의 실제 `posterUrl` 조회 성공. 이벤트 목록 응답에는 포스터가 없음. 후속은 카드 이미지 API/앱 연동, 영화·OTT 이미지 원천, 실제 iPhone/클라우드 확인.
- app `ios/GODIEOR.xcodeproj/project.pbxproj` 사용자 개인 서명 변경 유지. verifier 기준/verdict 변경 없음, 독립 검증 미실행. 계약·migration 변경 없음.



## DATA-10 OTT 공개 목록 인계 (2026-11-11)

- backend ADR `docs/decisions/015-ott-release-lineups.md`, 카드 `docs/tasks/DATA-10-ott-lineup-pipeline.md` 및 `scripts/prepare-ott-lineup.mjs` 참고. 현재 CLI는 **수동 검토된 목록만** 미게시 후보로 변환하며 사이트 자동 스크레이핑/DB 게시 기능이 아님.
- 기본 `npm test`에 `tests/*.test.mjs` 포함, 빌드와 전체 66/66 검사 성공. 소스 날짜/국가 근거와 최초 공개 여부를 다시 심사해야 한다. 운영 OTT 게시 7건은 그대로다.
- 차기 구현은 Netflix·TVING 우선 실제 페이지 구조/접근 및 복수 작품 파싱, 검토용 staging/공식 증거 첨부, 이미지 출처 관리. Disney+·Coupang Play도 접근 가능성을 실측해야 한다. 실제 적재/배포 및 verifier 독립 승인 없음. app `ios/GODIEOR.xcodeproj/project.pbxproj` 개인 signing dirty 유지.
## DATA-11 OTT 후보 staging 인계 (2026-11-11)

- backend `scripts/stage-ott-lineup.mjs`가 검토용 후보 state를 저장하며 동일 작품 재수집·날짜 변경 시 revision과 review 상태를 관리한다. 원본 카드 backend `docs/tasks/DATA-10-ott-lineup-pipeline.md`.
- `npm test` 빌드 및 70/70 통과, 실제 서비스 HTML 파싱·DB 게시·운영 배포·독립 verifier 실행은 아직 미완료. 기존 게시 OTT 7건 유지.
- 다음 담당은 Netflix/TVING 공식 목록의 구조·접근 조건부터 확인하고 사람 검토 단계를 거치는 어댑터를 구현한다. iOS 개인 Xcode signing 변경은 커밋하지 않는다.
## DATA-13 인계 (2026-11-11)

- backend `scripts/parse-tvingads-lineup.mjs`는 저장된 TVING Ads 텍스트를 예정작 후보 JSON으로 파싱한다. 잠정 후보 11건, 반복 실행 중복 0건, 신규 게시 0건/기존 게시 OTT 7건. 원본 HTML·robots·약관·한국 최초 공개/포스터 권한 미확인.
- 전체 자체검사 75/75, 관련 10/10. API 계약·migration·verifier acceptance 불변, 클라우드/독립 검증 미실행. 다음은 실제 원문 근거 대조·이용 조건 확인 후 개별 심사. iOS 개인 signing 변경 유지.
# DATA-17 OTT 후보 확장 인계 (2026-11-11)

- backend `docs/tasks/DATA-17-disney-coupang-candidates.md`에서 Disney 공식 기사 1건과 쿠팡 공식 추천작 3건을 검토용 staging으로 추가. 기존 82→86건, 재실행 중복 0, 제품 게시 0. 4건 모두 시장/한국 첫 공개 미확인; 쿠팡 3건 공개 날짜 null. 실 DB 게시 9건은 DATA-16 이전 결과.
- 후속은 한국 현지 최초일 증빙 확보와 검토 후 게시, 신뢰할 수 있는 여러 작품 공식 목록 탐색, Render/Supabase 배포 준비. 독립 verifier PASS/운영 반영 아님. 개인 iOS signing 변경 보존.
## DATA-19 인계 (2026-11-11)

11~12월 StreamPick 비교표 35개 제공처별 행을 발견용 참고자료로 저장하고 staging과 제목/날짜 대조 도구 추가. backend 기존 후보 88→90(`천천히 강렬하게` 한국 최초 공개 확인, `스타일 워즈` 한국 스트리밍 날짜만 확인); StreamPick 35행 중 여전히 제목 미매칭 30행. 신규 DB 게시 0, 전체 월별 자동 수집 미완료. 개별 테스트 4/4 PASS, 전체 npm test 환경 EPERM/Node20 미통과. 다음은 공식 KR 일정 확장·후보→검토/게시 연결·실 DB 조회·Node24 전체 검증. backend 카드 `docs/tasks/DATA-19-ott-coverage-audit.md`; 앱 signing 보존. 계약/마이그레이션/독립 승인 변경 없음.

## DATA-20 TMDB 한국 OTT 메타데이터 인계 (2026-11-11)

backend `scripts/ingest-tmdb-catalog.mjs`, `docs/tasks/DATA-20-tmdb-kr-catalog.md`: 로컬 DB 고유 작품 568건·포스터 568건, 반복 적재 신규 0건, backend 자체 테스트 81/81 성공. 국내 OTT 공개일 확인/신규 달력 게시 0건(기존 9건 유지). 서비스별 매핑은 아직 로컬 수집 보고서에만 있으며 클라우드/앱 API 미반영. 다음은 한국 첫 공개 공식 날짜 근거 확보→검토된 이벤트 게시→실DB/API/폰 확인이다. 승인·독립 PASS 아님. Xcode 개인 signing dirty 유지.


## DATA-22 인계 (2026-11-11)

backend 매핑에 Disney+ `재혼 황후` 11/03, Coupang Play `스마일 클리닉` 12/03 KR 최초 공개 2건 추가. 로컬 DB `ott_reviewed` 9→11, SQL로 신규 두 행 날짜·서비스·KR·date_only·instant_at NULL 확인, 자체 `npm test` 81/81. 상세 `backend/docs/tasks/DATA-22-reviewed-disney-coupang-publish.md`. 클라우드·폰·독립 검증 미실행. 다음은 한국 4대 OTT 공식 자료 확대/DB·API·폰 실확인. 기존 앱 signing 및 backend .env.example dirty 보존.
## DATA-23 OTT 실게시 비교 인계 (2026-11-11)

- backend `docs/tasks/DATA-23-ott-published-coverage.md`: `npm run audit:ott-published`로 StreamPick 발견 참고행 35개와 로컬 KR 검토 게시 OTT(11~12월 9건) 비교. 완전 일치 1, 시즌 확인 안 됨 3, 날짜 불일치 0, 미게시 31. 31건의 한국 첫 공개를 확인한 것은 아니며 임의 자동 게시 금지.
- backend 자체 테스트 83/83. DB 게시 0/클라우드·iPhone·독립 검증 미실행. backend `.env.example`, app pbxproj 기존 dirty 보존. 다음은 공식 한국 플랫폼·날짜·시즌 근거 확인 후 reviewed publish 및 동일 재감사. 승인/acceptance/계약 변경 없음.

## DATA-25 인계 (2026-11-12)

TMDB `first_air_date`/`release_date`만으로 시즌 공개를 찾던 568건 인기순 카탈로그를 보완하기 위해 backend에 날짜 기반 discover + StreamPick 35행 제목 역검색/시즌·1화 날짜 확인을 구현했다. 기존 카탈로그의 제목·서비스 일치는 12/35, 새 코드 검사는 9/9. TMDB DNS `ENOTFOUND`로 실제 35행 역대조는 미완료. 실행 결과 `/private/tmp/godieor-tmdb-date-discovery.json`, 원본 backend `docs/tasks/DATA-25-tmdb-dated-discovery.md`. 제품 신규 게시 0; 다음은 DNS 가능 환경에서 `node --env-file=.env scripts/tmdb-date-discovery.mjs --live` 실행 후 공식 KR 최초 공개일 검토. `.env.example`, `package.json`, iOS signing 및 기존 미추적 파일 보존. 독립 승인/배포 없음.

## DATA-25 추가 인계 (2026-11-12)

TMDB 568개 캐시 vs StreamPick 35행: 제목 미발견 22·제공처 불일치 1·첫 방영일 불일치 8·일치 4. 시즌 없는 참조를 위한 영화 검색/상세/한국 provider 경로와 별도 글로벌 영화 개봉일 판정 추가. backend 관련 테스트 12/12 PASS; `/private/tmp/godieor-tmdb-date-audit-v3.json` 오프라인 결과. 실제 TMDB 역조회는 네트워크 DNS 장애가 해소된 증거가 없어 재실행하지 않았으므로 실시간 커버리지 불명. 공식 한국 플랫폼 공개일 검증·DB 게시·verifier 실행·배포 미완료. 원본 카드 backend `docs/tasks/DATA-25-tmdb-dated-discovery.md`. 기존 dirty `.env.example`, `package.json`, iOS signing, 다른 스크립트 유지. 계약·마이그레이션·승인 기준 변경 없음.

## DATA-28 신작 누락 11개 인계 (2026-11-12)

backend `docs/tasks/DATA-28-official-release-gap-check.md`에 분류·근거·남은 작업 기록. Netflix 한국 신규 4개 검토 후보, 공식 날짜 충돌 1개 분리. 기존 OTT 게시 데이터 변경 없음. TMDB의 글로벌 날짜와 한국 플랫폼 첫 출시 확인 구분. 독립 승인/배포 없음.

## DATA-29 문무 제공처 필터 인계 (2026-11-12)

backend `docs/tasks/DATA-29-munmu-provider-gap.md` 참조. 한국 제작·KBS2 첫 방송(11/14)에도 TMDB KR 제공처는 wavve만 있고 Netflix는 없음. backend 누락 조사 결과에서 한국 제작/방송사/다른 제공처 단서 보존, target OTT 공개 증거 확정은 보류. 독립검증·운영 게시 없음.

## DATA-30 공식 소스+TMDB 및 OTT 표시 인계 (2026-11-12)

- backend 대조는 TMDB 결과에 없는 공식 KR OTT 목록도 플랫폼/날짜별 검토 후보로 보존. 제품 자동 게시 없음. iOS 일간 카드/월간 미리보기에 OTT 브랜드 텍스트 배지 추가, 스키마·API 계약·마이그레이션 불변. backend 전체 111/111, app unsigned iOS build 성공. verifier 독립 실행 없음. 원본 backend `docs/tasks/DATA-30-official-tmdb-platform-events.md`. 다음은 공식 월별 목록 실수집/첫공개 확인 및 reviewed 등록 후 실제 일정 검증.

## DATA-31 공식 OTT 우선 TMDB 인계 (2026-11-12)

backend `b637ecb`: 한국 공식 OTT 목록을 시작점으로 플랫폼/날짜/시즌마다 TMDB 역검색하는 읽기 전용 보고서 추가. 같은 OTT의 별도 시즌 후보 분리. 기존 공식 KR 날짜 후보 14건, 실 TMDB 요청은 `fetch failed`로 14건 모두 조회 실패(게시 0). backend 전체 자체검사 114/114 PASS(포트 허용 환경). 기존 iOS 카드 OTT 텍스트 배지 유지, 이미지 로고 미적용. 원본 backend `docs/tasks/DATA-31-official-first-tmdb-enrichment.md`. 독립 검증/DB 게시/배포 미실행. 기존 dirty 파일 보존.
## DATA-38 인계 (2026-11-12)

- backend 카드 `docs/tasks/DATA-38-kr-premiere-reviewed-publish.md`, 기준 `9e5e48b`. 공식 한국 첫 공개 TVING 11/09 `유일무이 로맨스`, Disney+ 11/11 `스타일 워즈` 두 건 수동 검토 후 `ott_reviewed` 로컬 게시 13건. 11~12월 DB 11건 중 두 건 날짜·시즌 일치. `npm test` 129/129, 독립 verifier/클라우드 미실행.
- 이후 작업: Netflix 한국 최초 공개 미확정 4건, 공식 날짜 충돌 `오버액션 갱`, TMDB 단독 4건 원천 OTT 확인. 기존 문서 dirty는 이전 사용자 변경으로 보존.
## DATA-57 인계 (2026-11-16)

- 원본 backend `docs/tasks/DATA-57-tmdb-parity-root-causes.md`. 후보 독립 발견과 게시 근거 격차를 52행으로 분리; KR provider 미등록 글로벌 TV 날짜 발견 경로를 확대했다. 52행 중 게시 정확26/날짜충돌2/provider 단서21/플랫폼미확인1/시즌미발견2. 과거 후보 매칭49.
- backend Node24 관련30/30 및 `.test.mjs`154/154 성공. CJS 포함 220개 중 219통과·HTTP listen EPERM 1, `npm test` 기존 dist 삭제 EPERM. 실 TMDB 확장 경로, DB/API, 독립 verifier 미실행이므로 후보 증가/정확 게시 증가 미주장. 계약·migration·acceptance 변경 없음.
- backend 수정 파일은 `scripts/tmdb-date-discovery.mjs`, `scripts/collect-tmdb-release-candidates.mjs`, `scripts/audit-tmdb-parity-causes.mjs`, `tests/tmdb-date-discovery.test.mjs`, `tests/tmdb-parity-causes.test.mjs` 및 작업 카드. 개인 dirty 및 기존 미추적 파일 제외. 다음 작업: 실제 TMDB 재수집/coverage 점검 후 공식 공개 증거로 게시 판단.

## DATA-58 인계 (2026-11-16)

- 원본 backend `docs/tasks/DATA-58-tmdb-sharded-independent-discovery.md`. 요구: OTT 신작/시즌 자동 발견→한국 공식 최초 공개 근거→검토 후 게시. StreamPick 참조 52행은 사후 평가 전용.
- 이전 실 TMDB 독립 월별 821작품 후보/월별 페이지 잘림 2구간. 글로벌 조회를 날짜 분할하고 상한 100페이지로 실측한 결과 3,303작품, 잘림0, API오류0. Coupang 영화 provider 미등재로 전체 완전성은 미확보. 과거 후보ID 49행은 다시 발견했지만 시즌/OTT 날짜 검증은 별도다.
- backend Node24 관련32/32, mjs 전체157/157 자체 통과. 새 실제 분할 수집의 결과는 backend 작업 카드에 갱신. 제품 DB 게시/독립 runner/클라우드 미실행. API 계약·migration·verifier 기준 불변, 기존 app signing 및 backend 개인 dirty 제외. 다음은 분할 결과의 시즌 후보화와 공식 KR 최초 공개일 교차검증.
## DATA-60 · 시즌 과거 글로벌 방영일 후보 누락 보완 (2026-11-16)

- backend `3d92ba9`: 글로벌 첫 방영일이 조회월 이전인 경우 KR 시리즈 제공처가 있으면 최근 2년·최신 2시즌을 검토 후보로 보존. 한국 최초일 `dateHint=null`, 자동 게시=false. Node24 전체 164/164 통과. 제품 게시0; 기존 52행 정확26·날짜차이2·미게시24 불변.
- Netflix 한국 신규공개는 자동 수집 지원. TVING Ads는 TVING/Wavve 혼합으로 저장 원문 파서만 지원. Disney+ 공개예정은 일반 회차 혼합으로 목록 자동수집 미완성.
- 다음: 공식 공개 일정→TMDB 정체성·시즌 연결→공식 최초일 확인→검토·게시 경로 실측. 공통 revision DATA-60-2026-11-16; 계약·migration·verifier 기준·독립 PASS 불변.

## DATA-61 · TVING Ads 실페이지 수집→검토 저장 자동화 (2026-11-16)

- backend 원본 `docs/tasks/DATA-61-tvingads-live-collection.md`. 공식 TVING Ads HTML의 날짜 카드 6개 수집, 기존 후보 규격 검증과 검토 staging 병합 연결. 동일 원문 반복 적재 신규0, 변경0, 동일6. Node24 전체 167/167 통과.
- TVING·Wavve 합동 제공 정보여서 플랫폼별 한국 첫 공개는 미확정, 자동 게시0. 기존 참조 정확26/52·날짜차2·미게시24는 이번 작업에서 재측정하지 않음. 계약·migration·독립 승인 불변.
- 다음: 공식 플랫폼/한국 최초일 증거와 TMDB 시즌 정체성 연결 후 게시 확인. 공통 revision DATA-61-2026-11-16.

## DATA-63 · 공식 OTT→TMDB 파이프라인 실행 경계 (2026-11-16)

- backend 원본 카드 `docs/tasks/DATA-63-official-pipeline-orchestration.md`. Netflix/TMDB/TVING 검증 후보→기존 review 70매핑 DB 게시→현재 StreamPick 첫 공개52행 DB 감사 묶음 추가. TMDB 미완전(exit2)/TVING 부분 오류(exit2)/parity 미달(exit2)은 명시 보고, 기존 게시가 중단되지 않게 변경. 단 TVING 부분 보고서는 staging 제외. 자체 Node24 174/174. 실제 DB 68행, 정확26/52·날짜차이2·미게시24 확인; 신규 게시0. 새 작품 자동 review→opaque mapping 생성이 여전히 없으므로 사용자 목표 미완료. 앱 iOS 개인서명 dirty 및 기존 backend dirty 보존; 독립검증·클라우드 배포 없음. 공통 revision DATA-63-2026-11-16.

## DATA-64 · TVING Ads 공식 보충 소스 연결 (2026-11-16)

- backend 원본 `docs/tasks/DATA-64-tvingads-pipeline-integration.md`: 통합 파이프라인에 TVING/Wavve Ads 6건 수집·후보 staging 연결, 첫 공개 자동 확정은 금지. Netflix 78건·TVING 11건·Ads 6건 실제 수집 후 기존 reviewed70 로컬 DB 재게시. StreamPick 최초공개 기준 정확26/52, 날짜차이2, 미게시24(신규 게시0). 최근 TMDB 1215행 스냅샷 재사용 결과이며 discoveryComplete=false. Node179/179 통과, 독립 검증/클라우드 미실행. 갱신 revision DATA-64-2026-11-16.

