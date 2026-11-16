# DATA-55 근거와 해석 범위

- upcoming-live: 첫 실제 적용에서 tvN fallback의 null모듈을 처리하지 못해 보조조회 실패/신규제안0이었다. errors0은 최상위원문오류0이라는 뜻이고 보조실패는 행의 supplementalIdentityError에 보존됐다. null반례를추가하고수정했다.
- upcoming-final: 공식공개예정9개전부 검토, 기존4/신규식별제안1/식별미확정2/공연1/정확날짜없음1. TVING명시11/27+tvN의5인+TMDB340978시즌1·첫회11/27을 작성자검토했다. 후보 publishingAllowed=false와 별도의 작성자review를 구분한다.
- upcoming-after-review: 같은9개재조회, 기존5/미확정2/공연1/날짜없음1·신규제안0. 기존다른공식출처1도 기존5에 포함. 단순재조회날짜차이는 제품변경으로 세지 않음.
- probe: 실제 TMDB별칭/제목검색. 톈시웨이·펜타곤 문제를 해결했다고 주장하지 않음. 아불시대사 검색도 미해결. 그룹명을멤버로추측하지않았다.
- source-hashes: 구조분석용으로 별도내려받은 공식tvN목록/프로그램원문의지문. 최종수집기응답과바이트동일을주장하지않음. 출연진은 upcoming보고서에선택보존. 전체HTML/인증정보는커밋하지않음.
- official-refresh/pipeline-live: 실제50개공식연결49matched/1날짜없음. 현재120행/누적124ID·45ready,errors0이지만Coupang영화provider미등재로수집exit2/incomplete. 새TVING플랫폼후보ID1추가,기존unassigned ID는누적이력에남음.
- revalidated-batch: 기존70매핑중45fresh,blocked0/newMappingsAssigned0. 자동승인이나70개전체새검증아님.
- replay: 같은실제관측재처리0신규/0revision/120불변. 네트워크두번째재조회결과라고표현하지않음.
- apply.cjs: 실제실행한작성자배치review도구. 9개중조건충족전체1개→전체70canonical사전검사/기존69불변. 원본curated파일의reviewer는구현담당이며독립승인자가아님.
- publish*.log/db-http-*.json: 로컬전체70입력게시/재게시. 기간68행/신규1/이전69ID·전체행·이력불변,HTTP200. 최초/반복검사에서pg의동시query향후비호환경고가나왔으나결과는성공; 별도해소미실행. 신규추가그냥사람친구는최신StreamPick참조에없어미일치26행을해결한것은아님.
- parity-*: 새공개참조52/제품68/정확26,실제gateexit2. 분모를줄이지않음.
- server-tests-final/test-command: Node24현재트리명시34파일215/215(기존미추적감사2/테스트2와개인package변경제외).
- fixed-binding/fixed-tests: 코드3a5a4dd62040cded2b184cf84d073ed4fc6ea8fc의gitarchive에서관련CLI46/46. 고정전체서버215·iOS/폰·클라우드·독립runner 미실행. 이전독립ERROR/4SKIPPED불변.

합성회귀는다른작품/외국locale/preview·빈모듈·하나의별칭을2인으로중복계산·그룹/개인추정·잘못된TMDB ID·조회상한·영문X분리를포함한다. 실제사용자장애/사용자이해도/전체커버리지나승인으로확대하지않는다.
