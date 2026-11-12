# DATA-43 · Netflix 한국 공식 목록 25건 검토·로컬 게시 (2026-11-12)

- 요구사항: PROD-005/007/009. 작성자 검토 후 로컬 게시 성공, 독립 verifier 검증 및 클라우드 배포는 미실행.
- 문제: Netflix KR 공식 월간 목록 75건이 후보 저장소에 있었지만 contentKind=unknown, premiereConfirmed=false여서 모두 게시 차단. 공식 목록과 TMDB 영화 release_date 또는 TV 시즌 첫 방영일을 역대조해 확인 가능한 작품을 선정함. TMDB 한국 watch provider 누락 11건은 한국 넷플릭스 공식 공개일을 무효화하지 않음.
- 원천: https://about.netflix.com/ko/new-to-watch, TMDB enrich 감사 /private/tmp/godieor-netflix-kr-tmdb-all.json 및 검토 결과 /private/tmp/godieor-netflix-triage-20261112.json. 재현 가능한 25개 검토 입력은 data/curated/netflix-kr-reviewed-2026-11-12.json, 원천 75개는 data/lineups/netflix-kr-2026-11-12-auto.json.
- 수동 검토 기준: 공식 KR 목록과 TMDB 날짜가 일치하고 작품 ID/시즌이 단일 매칭인 행. 기존 게시 4건, 별칭 데블스 플랜(데드 어게인) 및 푸른길은 중복 제외. 시즌2 이후는 해당 시즌의 첫 회 날짜이며 시리즈 전체 최초 공개일이 아님. 날짜는 KR 플랫폼 공개일, TMDB KR 제공처는 참고 힌트. 공식 한국 서비스 날짜가 없는 문무·나인 투 식스·전지적 집착 시점은 추가하지 않음.
- 실행: Node22로 기존 후보 state.json에 25개 review 적용, data/curated/ott-reviewed-mappings.json 19→44개. 검토 schema/prepareReviewed 44건 사전검증. publish-reviewed 성공: ott_reviewed published 44(전체 매핑).
- 로컬 DB 실제 조회: 2026년 11~12월 KR 4 OTT 게시 17→42건(+25). Netflix 11월 10→35건. 11건 StreamPick 대조 정확 7, 공식 Netflix KR 날짜 차이 1(오버액션 갱 11/05), 한국 OTT 공개일 미확인 3(전지적 집착 시점, 문무, 나인 투 식스) 유지. StreamPick 회차 이벤트 849개와 최초 공개/플랫폼 일정 건수 직접 비교 금지.
- 테스트: npm test Node22 138/138 통과, audit-ott-published.mjs DB SQL로 42건 확인, git diff --check 별도 확인. 클라우드·iPhone·독립 검증 미실행.
- 한계: Netflix 75건 전체 게시가 아님. 31건 TMDB 날짜 단일 매칭 중 25건 신규 게시; 남은 Netflix 목록은 다른 플랫폼 재등록/미분류/날짜 불일치 검토 필요. 기존 event_kind=ott_season_premiere에는 한국 OTT 입점일과 전세계 처음 공개 개념이 완전 분리되어 있지 않아 향후 별도 arrival 유형 설계 필요.
- 재현: 기존 후보 state를 공식 75건 lineup bridge로 구성한 뒤 curated JSON의 items[].review를 후보 검토 CLI에 투입하고 44건 mapping publish. 키는 신규 매핑에서 고정. 로컬 후보 state와 .env는 git 제외이므로 새 환경에서는 먼저 복원할 것.
- LEARN-ID: 해당 없음(기존 출처 교차검증/검토 게시 절차 적용).
