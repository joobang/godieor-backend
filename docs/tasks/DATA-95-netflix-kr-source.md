# DATA-95 · 한국 Netflix 공개 목록의 원천 확인 경로

- GD-005 / PROD-005, GD-008 / PROD-008 운영 검증. 백엔드 범위.
- backend base `ccd9a345cbb025e4a3a94deeeafd15afaf1ef2fb`, 별도 `codex/netflix-kr-source-20261124` worktree. app 빌드 9 source `bad2576eaf2907018219cd4f01d64d1b2e3d63b6`.
- 실패 예상: 국가 불일치나 빈 응답이 한국 증거로 처리되거나, 페이지 중간의 국가·총건수 변경이 게시 후보에 도달하는 경우.
- 완료 조건: 한국 페이지가 비한국 지역으로 열릴 때 기존 공식 페이지네이션의 첫 페이지를 이용하고, 모든 페이지 국가·페이지 번호·총건수 검증 및 출시 근거 범위를 보존한다.

## 운영 증거

- [운영 Actions 45303217819](https://github.com/joobang/godieor-backend/actions/runs/45303217819) 최종 성공, 내부 `published_with_discovery_gaps`. TMDB 증분 369 ID(영화 297, TV 72), 검토된 일정 92건 게시 처리, 기존 포스터 86/92, 추가 포스터 0건.
- Netflix `NETFLIX_KR_REGION_NOT_VERIFIED`, TVING `TVING_UPCOMING_SCOPE_CHANGED`, 쿠팡플레이 뉴스·공개일 확인 `COUPANG_HTTP_403`. TVING Ads 5건과 Disney 16건은 검토 후보로 스테이징했다. 이 수치를 새 일정 게시 건수로 사용하지 않는다.
- Netflix 공식 한국 웹 첫 페이지와 공개 페이지네이션 응답의 첫 페이지 ID·날짜 순서가 일치했다. 1~5페이지 요청은 한국 국적 코드, 페이지 번호, 페이지 합계·건수, API 원천을 검증한다. 한국 화면을 우선하고 비한국 화면의 내용은 가져오지 않는다.

## 검사와 인계

- Node 24.22.3 `node --test tests/netflix-kr-schedule.test.mjs` exit 0, 5/5. 빈 첫 페이지, 한국 외 첫·후속 페이지, 다른 경로로 리다이렉트 차단.
- Node 24.22.3 `npm test` exit 0, 385/385. 합성 DB 설정의 자체 검사.
- 비한국 HTML은 합성 입력으로 제공하고 한국 JSON 페이지네이션은 실제 원천을 사용한 Mac 검증. 기존 경로와 보완 경로의 5페이지, 원천 81건, 중복 제외 조회 창 78건, 날짜와 제목 일치. 한국 외 응답만으로 실제 GitHub 위치 재현을 주장하지 않는다.
- API 0.1.0-draft.5 manifest `04cfea7456d83ca141ba64c6d6568365b00cbdf2d5e95eacd8c4dad7249a0f2e`, migration manifest `feeb684462340075302b9a05ff3102740f6fe7d87c667ea8c455752c1433ba1b`. verifier 0.1.0-draft acceptance `c4906283810c8b378800b67930028685a41b6a051923ea9f9415346b2d657063`. 독립 통합 runner·verdict 미실행.
- LEARN-0022 관련 기존 오류 분류·보고 원칙 재검토. 기존 원천과 근거 기준에 따른 분기이며 새 ADR은 해당 없음.
- 별도 컨텍스트 리뷰 지적 반영. 같은 경로라도 국가·언어·페이지 쿼리가 바뀌는 리다이렉트는 수용하지 않는다.
- backend 구현 head `12d6bba7a51a190ba2c903e9ff103c33929d3097`. verifier 문서 기준 checkout `62fc3b2`. 사용자 앱 checkout의 기존 변경은 분리했다.
