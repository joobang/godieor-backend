# DATA-32 Netflix KR 전체 일정 직접 수집

- 작업자: `codex-context-01` / requirement: OTT 실제 제공처 + TMDB 교차 검증, StreamPick 대비 월별 누락 최소화.
- 기준: backend `b637ecb`, `codex/app-auth-phone-ready`. 기존 dirty `.env.example`, `package.json`, `docs/system/status.md`, `docs/system/handoff.md`, 별도 미추적 감사 도구는 보존.
- 범위: 한국 Netflix `https://about.netflix.com/ko/new-to-watch`의 `__NEXT_DATA__`와 페이지네이션 `https://about.netflix.com/api/data/releases?language=ko&country=kr&page=N`에서 첫 페이지부터 마지막 페이지까지 수집. 날짜·시장·제목·Netflix ID는 소스 실필드. 작품 종류/시즌/세계 최초 공개는 아직 미확인.
- 실패 가능성: 공식 사이트 구조 변경, 페이지 일부 누락, 동일 제목의 복수 콘텐츠, 한국 입점일과 시즌 최초 공개일 혼동, TMDB 다른 작품/다른 시즌 동명이인 매칭, 12월 목록 미게시.

## 2026-11-12 실행 결과

- 네트워크에서 한국 공식 페이지 `200`, API 두 번째 페이지 `200` 확인. `node scripts/collect-netflix-kr-schedule.mjs /private/tmp/godieor-netflix-kr-all.json` 성공: 원천 78행 / 4페이지 전부 78행 회수 / 11월 유일 제목·일자 **75행**, 12월 **0행**. 원문 후보 `data/lineups/netflix-kr-2026-11-12-auto.json` 저장.
- `node scripts/stage-ott-lineup.mjs /private/tmp/godieor-netflix-kr-all.json work/ott-lineups`: 새 58, 이전 항목 동일 17, 총 staging **170**, 제품 게시 **0**. 신규 공개와 플랫폼 등록을 아직 구분하지 않아 `contentKind=unknown`, `premiereConfirmed=false`.
- 원천 Netflix 한국 페이지 11~12월 StreamPick Netflix 참조 18행 중 날짜·제목 일치 **7행**, 날짜 충돌 **1행**(`오버액션 갱` 공식 11/05 vs 참조 11/04), 해당 페이지에서 같은 작품 미발견 **10행**. StreamPick 전체 참조 35행은 신작만을 의미하지 않음.
- 로컬 PostgreSQL 실제 조회: 검토 게시 11~12월 **9건**, 공식 한국 최초공개 확인 7건 중 제목·날짜 매칭 5건, 시즌 번호 미기록 2건. StreamPick 참조 35행 기준 엄격한 시즌까지 일치 1건, 동일 제목·날짜 시즌 미확인 3건, 미게시 31건. 35는 OTT 편성/시즌까지 포함하는 발견 목록, 제품 최초 공개 신작 기준과 동등하지 않음.
- `node --env-file=.env scripts/enrich-official-ott-with-tmdb.mjs /private/tmp/godieor-netflix-live /private/tmp/godieor-netflix-kr-tmdb-all.json --live` 성공: **75행 실조회**, 시즌 날짜 일치 20, 영화 날짜 일치 11, 날짜 불일치 11, 제목 미발견 33. TMDB 검색 미발견은 Netflix KR 공개 일자 부재를 뜻하지 않음. 비밀키/응답 원문은 Git에 미포함.
- `node --test tests/netflix-kr-schedule.test.mjs`: **3/3 PASS**. 외부 verifier 독립 검증, 클라우드 배포 없음.

## 다음 단계

- 수집된 75행의 TMDB 제목·시즌·영화·KR 제공처 신호를 결합해 타입을 분류하고, 한국 플랫폼 입점일(첫 OTT 등록)과 기존 최초 공개일을 구별하는 제품 이벤트 계약/게시 경로를 확장한다. 공식 페이지에 12월 항목이 없는 시점이므로 Netflix 글로벌 Tudum/한국 뉴스룸 12월 예정도 별도 조사한다.
- TVING/Disney+/Coupang 한국 공식 편성표의 자동 일괄 수집 확대. 정확한 대상 범위(신규 공개 vs 회차 vs 기존작 입점)를 고정한 뒤 StreamPick의 동일 범위로 다시 집계한다.
- 기존 공유 상태/인계 문서는 다른 작업이 수정 중인 dirty 파일이므로 덮어쓰지 않고 이 카드에서 이번 작업을 기록한다. 관련 학습 기록은 해당 없음(신규 데이터 추출/수집 코드, 장애 기술 해설 아님).
