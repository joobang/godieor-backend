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

## 운영 반영

- [dev PR #30](https://github.com/joobang/godieor-backend/pull/30), [운영 PR #31](https://github.com/joobang/godieor-backend/pull/31) 병합. main `33371c032c8ebe0c1f546ad97ba478ee48a59df2`. PR와 main 자체 CI에서 임시 PostgreSQL 및 HTTP API 검사 성공.
- [Render 자동 배포](https://dashboard.render.com/web/srv-dbu0u7on74is73f3tpug/deploys/dep-dc2i1hmq1p3s73denrrg) `33371c0` Live. 운영 health HTTP 200, DB connected. iOS 운영과 동일한 11월 KR OTT 달력 HTTP 200, 11/23~25 건수 2·3·2.
- 파이프라인 점검과 별도로, 기존 Mac 공식 응답 79건을 격리된 로컬 검토 큐에 넣었다. 첫 실행 79건 검토 대기, 재시도 신규 0건, 두 실행 모두 게시 0건.
- TVING 공식 예정작 전용 페이지 `/more/band/AP0060`은 Mac HTTP 200 및 6개 채널 프로그램 코드 확인. 다른 검색 노출 페이지 `/more/band/HM292945`는 HTTP 500. 전용 페이지의 GitHub 러너 응답은 미검증.

- [운영 Actions 45333833074](https://github.com/joobang/godieor-backend/actions/runs/45333833074) 성공, 내부 `published_with_discovery_gaps`. Netflix `firstPageSource=explicit_kr_pagination`, 5페이지·81개 원천 항목, 조회 창 79개. 런 검토 큐 신규 14개, 기존 검토 65개 보존, 신규 승인 0건.
- Netflix 최초 공개 재검토는 부분 성공(exit 2): 새 후보 중 비최초 공개 6, 조회 실패 8. 기존 검토 65건은 보존됐다. TVING 예정 범위 오류와 쿠팡플레이 뉴스·공개 검토 HTTP 403이 남았다.
- 검토 OTT 92건 게시 처리, 운영 calendar HTTP 200 및 `ott_reviewed.lastSuccessfulAt=2026-11-24T05:45:06.317Z` 확인. 포스터 86/92, 신규 보강 0, TMDB 변경 ID 1008개.
- 이번 배치의 검토 큐는 [실행 아티팩트](https://github.com/joobang/godieor-backend/actions/runs/45333833074/artifacts/14893507989)에 있으며 만료는 12월 1일이다. TVING 전용 페이지의 GitHub 응답, 쿠팡 원천 접근, 실기기 찜은 후속.
