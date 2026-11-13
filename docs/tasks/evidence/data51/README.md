# DATA-51 작성자 실행 근거

공식 화면의 관측은 data/reference/tving-program-date-observations-2026-11-13.json, 재현 검토·고정키는 data/curated/tving-kr-reviewed-munmu-2026-11-13.json이다. 브라우저에서공개UI만읽고로그인/재생/가입하지않았다. 표기의시즌개수와번호를구분했다.

apply/verify.cjs는backend를cwd로실행한일회성recipe다. 초기63건을요구하는전처리/게시전검사는현재64건에무조건재실행하지않는다. db-before는기존63개row기준,db-http-after/repeat는SQL·임시HTTP·변경이력1·기존63불변의실행결과다. .env/전체후보state/개인키는보존하지않는다.

runner-command/steps/evidence/report는고정source검사와ERROR판정,receipt는최초ECONNRESET와재시도/별도working-tree자체검사를구분한다. 전체원시build/log는해당/private/tmp경로다. 독립리뷰/제품PASS/OS격리/실폰/클라우드증거가아니다.
