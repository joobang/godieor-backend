# DATA-49 작성자 로컬 실행 근거

검토 입력은 data/curated/netflix-kr-reviewed-documentary-2026-11-13.json, 고정 매핑은 ott-reviewed-mappings.json이다. binding.json은 검사한 코드/데이터 기준과 이전 runner 판정을 구분한다.

preflight.json은 적용 전 migration/62매핑, db-before.json은 게시 전 기존62개 이벤트 원행을 보존한다. db-http-after/repeat는 게시 후 SQL·임시 HTTP와 변경 이력 관측이다. verify.cjs의 실제 실행은 기존62개 전체행을 deepEqual 검사했다. test-command.json은 추적된 CJS/ESM 검사 argv이며 test-tracked.log는154/154 결과다.

스크립트는 당시 실행한 일회성 recipe의 사본이며 backend를 cwd로 사용한다. local-preflight/apply-review/before 검사는 의도적으로 초기62건 상태를 요구하므로 현재63건에 무조건 재실행하지 않는다. DB주소·기존수량을 확인하고 원본상태를 보존한다. .env/전체후보state/개인키는 포함하지 않는다. raw migration 로그는 임시폴더에만 남겼다. 독립 승인·실폰·클라우드 증거가 아니다.
