# DATA-50 작성자 후보·읽기전용 검사 근거

prepared.json은 공식 추천작에서 사람이 보존한 5개 미정 입력의 변환 결과다. 사이트에서 자동 추출한 원시응답이 아니다. stage/stage-repeat는 로컬 미게시 staging 결과이며 제품 DB 게시 결과가 아니다. audit.json/cjs는 제품DB 읽기 및 검토state/게시매핑 불변 검사다. 같은환경에서검토state가새로변경되면고정hash검사는실패하도록되어있다. .env·개인키·전체후보state는포함하지않는다. lineup-tests.log는기존관련18개검사출력이다.

원본관측과출처는data/reference/ott-gap-official-review-2026-11-13.json. PAW의공식게임route→AppStore앱ID연결과이름/개발자/게임분류로식별했고다른Academy게임을별칭으로쓰지않았다. CJ 본문은검색도구가제공한본문관측이며직접open은cache miss였다. 날짜를확인하지못한상태를보존한다. 독립판정/실기기/클라우드증거가아니다.
