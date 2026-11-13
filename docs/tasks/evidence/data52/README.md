# DATA-52 작성자 실행 근거

실제검토입력과공식SNS날짜원문은data/curated/tving-kr-reviewed-happy-anding-2026-11-13.json에있다. 원문SNS계정·배지·datetime을공개브라우저에서확인했으며댓글·계정정보는보존하지않는다. 미러는발견용이다. API출처는공식작품링크이며SNS날짜근거링크는curated/evidence원본에보존한다.

apply/verify.cjs는backend를cwd로실행한일회성recipe다. before/apply는초기64행조건을요구하므로현재65행에무조건재실행하지않는다. before-summary는실제게시전64행snapshot의hash·수량요약이며전체행은/private/tmp/godieor-data52/db-before.json이다. verify실행에서기존64개행(id/updated_at포함)을deepEqual로검사했다. after/repeat는SQL·HTTP63행/신규이력1/기존64불변의관측,156개는현재추적소스working-tree검사다. 새fixed runner/독립승인/실폰/클라우드증거는아니다. .env/개인키/전체후보state미포함.
