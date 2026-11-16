# DATA-56 실제 실행과 해석 경계

사용자가 애니를 OTT에 포함하도록 확정했다. 일반 회차는 제외한다. 애니는 전체참조6행/미일치5행이며 초기질문의5는미일치행수로바로잡았다. 승인기준/verdict/독립승인상태는변경하지않았다.

- 서버/DB/API/앱: animation+명시animationFormat movie|series,영화시즌금지. 새migration202611160001 적용,과거migration불변. draft.5 manifest·소비자지문일치검사. 실제코드SHA는fixed/ios-binding에보존.
- 1차공식fresh 연결에있는애니3개를보정한뒤 **기존70개 전수대조**에서배스X마키나1개를추가발견해총4개보정했다. 3개만보정하고종료하지않았다. 실제publish3보정→추가1보정→반복의실행이력은각publish로그에보존,하나의DB트랜잭션이었다고주장하지않음. 신규이벤트0/총70/기간68,기존ID·날짜·시즌·플랫폼유지/다른66전체행·이력불변. db-http/curated아티팩트참조.
- 배스의기존review에는이미Netflix공식애니발표근거가있었다. genre16·같은제목/시즌/날짜와대조해분류보정,공식한국목록도11/03재조회(bas-official-refresh). 그검토를새독립승인으로쓰지않음.
- 초기검사도구가/options를잘못호출해404,그다음상세event래퍼를놓쳐undefined를검사해실패했다. 실제/catalog/options/detail.event로수정후after/repeat성공. 제품API를바꿔검사에맞추지않음. 기존pg동시query향후비호환경고보존/미해소.
- 전체현재트리218/218,고정46751285a88f96ac88ea719a4e5daff791d96a5a소스에서비밀없는Prisma생성→빌드→전체218/218. 기존node_modules를연결했으며OS격리주장없음.
- ios-binding/ios-build:고정8b5e17d549ff91011be4ebe8653e5d149c1033cd unsignedSimulator build성공. 개인pbxproj제외. 실폰UI확인아님. tests/AnimationChecks.swift는별도저작가상입력으로해석/배지/날짜보존확인.
- ddl-parity:일회용고정PostgreSQL에서참조DDL/전체migration의분류경계18/18. 전체DDL동일성/새독립runner실행아님. 컨테이너정리됨.
- pipeline:애니범위hold해제+형태힌트필드도입후현재120/누적124ID/48ready,0신규/120revision. **120revision은새힌트필드도입에따른후보스키마변화도포함하며120작품의날짜변경/게시증가를뜻하지않음.** 동일실제관측replay0신규/0수정. errors0이어도Coupang영화provider미등재로complete=false/exit2.
- revalidated-batch:48fresh/70existing/blocked0,신규고정키0. 직접게시명령아님.
- parity/case-matrix:52참조/68게시/정확26/미일치26,실제gateexit2. 애니6행전체포함·그중5미일치,시즌미발견/목표OTT날짜미확인을숨기지않음.
- homepage-discovery/shetland:범위응답전읽기전용진단. 114작품중homepage35/OTT공식19,공식셰틀랜드페이지는시즌1/명시날짜없음. 자동공식경로확장구현/새시즌일자확인완료가아님. 원문전체와인증설정은커밋하지않음.

독립review/새통합runner·실Google/폰/클라우드는미실행. 이전ERROR/4SKIPPED와미승인acceptance유지. 전체제품PASS/OS격리/전체일정완전성을주장하지않는다.
