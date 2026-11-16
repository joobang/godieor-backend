# DATA-54 실제 관측과 해석 경계

- `parser-before-after.json`: 같은 다운로드 원문6개를 base689da32/변경 파서로 비교. 미지원4/lookup실패2→일치5/명시일자 없음1. 서로 다른 시각의 변화를 개선으로 세지 않았다.
- `official-refresh.json`: 실제49원문 재확인48일치/1명시일자 없음. 전체 서비스 정확성을 뜻하지 않음.
- `upcoming-verified.json`: 공개 TVING 홈9개 전부의 최종 보고서. 기존검토3/기존다른출처1/정체성미확정3/공연1/정확일자없음1. 새 review proposal0. `data/lineups/tving-upcoming-observed-2026-11-16.json`는 전부 premiereConfirmed=false.
- `identity-diagnostics.json`: 미확정3개의 TMDB 상세 추가 관측. 가금채 내부 broad_dt11/16은 방송일로 확인한 값이 아니다. 명시 TVING공개11/18만 보존한다. TMDB시즌일자10/16과도 서로 다른 필드로 기록. 번역 출연진을 추측으로 합치지 않음.
- `source-hashes.json`: 로컬 공개 HTML 지문·크기. 전체 HTML은 임시관측경로에만 두며 인증설정/원문 전체를 저장소에 복사하지 않음. 원문 필드는 위 구조화 보고서에 보존.
- `revalidated-batch.json`: 기존69개 중44개를 신선한 공식/TMDB 근거에 결속, 신규 키0/DB쓰기 없음. 기존 검토를 새 승인으로 변경한 것 아님.
- `pipeline-live.log`: 현재120/누적123ID, created0/revised8/unchanged112. 실제 관측 변화에 따른 revision이며 `replay.json` 같은 관측 재처리는0신규/0수정. provider미등재로 complete=false/exit2.
- `stage*.log`: 후보9개만 저장,176→185; 반복0신규/9불변/제품게시0. source별 관측 건수이며 작품·제품 수가 아님.
- `parity-*`: 새 공개 참조52행/제품67행/정확26행, 게이트exit2. 정상회차 제외, 시즌첫회 포함. HTML 지문은 observation에 보존.
- `db-http-repeat.json`: DATA-53 게시 이후69개 event 전체행/ID/이력을 같은 저장 관측과 비교, 임시HTTP200/67행 확인. 파일의 additions4/explicitSeasonUpdates4는 **DATA-53 역사 배치 확인용 assertions**이며 DATA-54 신규 게시가 아니다. DATA-54 신규게시0.
- `server-tests.log`/`test-command.json`: Node24 현재트리 전체204/204. 개인 package/env 변경·기존 미추적 감사2/테스트2 제외한 명시 테스트 목록. 고정소스 전체204 실행이라고 표현하지 않음.
- `fixed-binding.json`/`fixed-tests.log`: 코드4569586 git archive의 변경 CLI 관련35/35. 최초 Python tarfile의 지원하지 않는 filter 인자로 압축해제가 실패했고 경로검사 후 재실행; 테스트 실패 아님. 신규 테스트 도입 중 기존 합성 fixture의 title누락2건은 fixture보완 후 통과.

작성자 로컬 검사다. 독립승인·iOS빌드·폰·클라우드·전체제품PASS는 수행/선언하지 않는다.
