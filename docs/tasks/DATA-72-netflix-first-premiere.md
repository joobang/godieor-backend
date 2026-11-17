# DATA-72 · Netflix 신규 첫 공개 자동 검토·적재

- requirement PROD-005/006/007/008/009, GD-005/006/007/008/009 초안. acceptance0.1.0-draft SHA256 c4906283810c8b378800b67930028685a41b6a051923ea9f9415346b2d657063 불변.
- 상태: 이번 구현·자체 검사 완료, 담당 codex-data72-01 해제. 전체 데이터 단계는 미완료.
- base app eef76190a1c60a863a4e48d14ce27e41e8a4cdd0(개인 pbxproj dirty 보존), backend67d29b2f269bf189eca86836e53e468fbaaa5475(clean), verifier0feaa3ac67063794a1a267c278a03c144401fe02(clean).
- backend codex/netflix-first-premiere 단독 checkout; 시작 시 수집 프로세스 없음. 구현 후 별도 실제 파이프라인 실행, 종료까지 확인. 동시 개발 세션 없음.
- 범위: Netflix KR 공식 일정과 한국 상세의 canonical ID/제목/형태/최초 날짜 일치 시 curated TMDB binding 없이 신규 검토→고정 키→기존 게시 경로 연결. 코드/검사·공개 근거·원천 범위 문서. 계약·migration·앱 코드·독립 기준/verdict 변경 없음.
- 예상 실패: 기존 게시를 신규로 재집계, 국가·리다이렉트·동명이작 오류, 과거 첫날을 새 시즌으로 취급, 원문 조회 후 revision 변경, date_only 손실, 필수 원천 실패 숨김.
- ADR022/LEARN0021 갱신. 완료 조건은 이번 범위 구현과 실제 실행·DB/API·중복/기존행 보존 확인이며 데이터100%와 구분한다.

## 사용자에게 달라지는 동작

기존 자동 검토가 수동 curated binding에 의존하던 것과 달리, Netflix 정상 신규 작품은 최신 KR 공식 일정과 같은 작품의 공식 상세를 대조해 검토를 생성한다. 공식 최초 날짜가 일정과 다르면 새로운 시즌으로 추정하지 않는다. 시즌 개수/예고편의 시즌 번호로 시즌을 만들지 않고 null을 보존한다. 다큐/애니 형태는 공식 genre와 Movie/TVSeries를 대조한다.

같은 호스트·한국 로케일의 redirect만 따라가며 최종 URL과 JSON-LD canonical ID/제목을 확인한다. 동일 canonical의 서로 다른 videoID와 기존 검토 title/canonical 충돌은 신규 승인을 차단한다. 제목은 병합 ID로 쓰지 않는다. 기존 검토도 현재 목록의 canonical 별칭 대조에 포함하지만 리뷰를 수정하지 않으며, 조회 실패는 보존된 리뷰 뒤에 숨기지 않는다.

일회용 repo transaction에서 원문 조회 전후 revision/고정 videoID/국가·날짜를 확인한다. 최신1시간 이내 공식 일정만 허용하며 최대3회 일시 오류 재시도,429는 실패 보존. 새 검토의 불투명 key 생성/전체 스냅샷 게시 경로를 재사용한다. 단계의 exit2는 파이프라인 전체에도 부분 완료로 반영한다.

## 실제 결과

- 현재 실제 Netflix KR81원문/5페이지 완주,11~12월78항목. 자동 검토는 신규0/기존 리뷰64 보존/기존·별칭 충돌2/과거 첫날3/제외6/상세404 3.404는 우당탕탕 공룡들·ABC마우스·Thomas & Friends: Whistle & Go이며 상세 실패를 근거 없는 게시/게임 판정으로 바꾸지 않았다.
- 보존한 실제 미검토 상태70건에 최신 공식78항목을 다시 수집·자동 검토: 수동 작품별 allowlist/curated 검토 없이14검토 생성→불투명 key14추가→일회용 PostgreSQL70→84. 실제14상세 API200/공식 일정의 날짜·Netflix·season null·date_only/instant NULL 확인.
- 재실행 신규 검토0/새 key0/84행·기존70행·ID·변경 이력 보존. 고정digest PostgreSQL 사용, 컨테이너/임시 디렉터리 종료 시 제거. 이14건은 현재 제품 DB에는 DATA70에서 이미 게시됐으므로 오늘 제품 신규14라고 세지 않는다.
- 최종 실제 통합 실행은 신규 단계exit2/기존23원천23일치/키 added0/total93/게시93. TMDB 최근 snapshot1시간 만료를 거절했고 이번에 full재수집하지 않았다. 다른 원천의 식별/첫날 보류도 남아 전체 published_with_discovery_gaps/exit2.
- 실행 전후 제품93개 event 전체행·ID·이력·hash 동일, API목록93/관련23상세200. 제품 신규0. 원천별 기간·건수·누락/미정·일일 실행의 실제 범위를 docs/data-coverage.md에 고정했다.
- 실제 DB 점검에서 게임2026년1~9월과 EPL2026년1~5월의 백필이 남음을 확인했다. 영화/게임/EPL의 마지막 실제 수집 성공은11/11 전후로 현재 일일 운영 성공을 뜻하지 않는다.

## 실제 실행한 검사

| 명령 | 종료 | 결과 |
|---|---|---|
| Node24 npm test |0|빌드/Prisma 생성·302/302. 이후 canonical 대조 조정의 최종 코드 전체검사는 아래 명령으로 재확인 |
| node --test tests/netflix-first-premiere.test.mjs tests/official-ott-pipeline.test.mjs |0|최종22/22. 날짜/형태/국가·시즌null/중복·redirect/429/재시도/stale/transaction 변경/실패 전파 |
| node --test tests/*.test.cjs tests/*.test.mjs |0|최종 고정 코드302/302,0실패. 이미 빌드한 TS 산출물을 그대로 사용 |
| collect-netflix-kr-schedule → bridge-netflix-lineup → review-netflix-first-premieres --apply |2|공식5페이지78항목, 최초 도구 경계/날짜 정규화 보완 후 최종 상태는 위 결과/통합 증거에 보존 |
| node scripts/check-netflix-premiere-db.mjs <archived-state> <archived-mappings> <fresh-snapshot> <output> |0|실제 미검토 입력 재생70→84→84,14상세200/보존 확인. evidence의3개 입력 파일과 real-source-db-replay.json 참조 |
| node scripts/run-official-ott-pipeline.mjs --reuse-recent-tmdb |2|최종 실제 신규0/게시93,23원천일치. 만료 snapshot 거절/404·식별 보류 유지 |
| node --env-file=.env docs/tasks/evidence/data72/verify-db-api.cjs (schedule/fixture=false,provider-only=true) |0|SQL93 전체행·ID·이력 동일, API목록93/23상세200 |
| 읽기 전용 collection_scope/event_source SQL |0|원천별 날짜를 SQL date::text로 저장, provider-inventory.json. fixture는 실데이터에서 제외 |
| git diff --check / 보호 지문 / 공통 문서 사본 |0|API/acceptance·개인pbxproj 불변,5개 공통문서 세 저장소 byte 일치. SYNC-2026-11-17-02 |

검사 도구가 API 상세 래퍼를 잘못 접근한 두 번의 실패는 실제 event 래퍼를 확인해 고친 뒤 전체 재실행해 해소했다. 임시 SQL의 없는 category 열 조회도 kind/release_market 및 SQL date 문자열로 고쳤다. 기존 pg 동시 query deprecation warning은 관측했으며 이번 신규 적재 성공과 분리한다.

## 독립 검증 handoff·남은 작업

- app base/head: 위 eef7619 런타임 동일, 이번 app 변경은 공통 문서만. backend base는 위67d29b2, 구현 head a5fc69f0986ad60acfc692f2e7b167dba463d967. 종료 문서 head는 각 저장소 git log로 확인.
- API0.1.0-draft.5 manifestSHA256 0ffd7cbcdcb3c46b450e626ced90055e985308d728c279832aa00ec76b24e9c9. migration digest ec6966538bd599bf0dcee21ec0e0fb03a63b513ae01654d52b9e2badf5697fd7, 변경 없음.
- verifier 위0feaa3a 기준/승인·verdict 불변. 자체 backend-only + 로컬 실제 SQL/API/일회용DB 검사이며 독립runner·통합승인·iOS/실폰·클라우드 미실행.
- 개인 pbxproj SHA256 f8ef38b1a44d31034be8137e7c149616c8d10b5fec23d23c50ad5445342b54ba 보존. push·배포·유료 가입 미실행.
- 다음: 새 시즌·나머지 OTT의 일반 자동 첫날 검토,404의 정체성/유형 확보, TMDB 새 전체 실행, 영화·게임·EPL2026 백필/최신 갱신·일일 복구 확인. 자동 검토 작품의 다음날 원천 재확인 범위도 현재 고정 DATA70 배치23을 넘어 확대해야 한다.
- 새로운 정상 입력14건의 자동 적재를 재현했지만 신규 시즌/나머지 제공처/과거·먼 미래 전수 수집 완료는 아니다. 데이터 단계 종료 전 배포·디자인으로 이동하지 않는다.

종료 시 최종 파이프라인/검사 프로세스와 data72 일회용 컨테이너가 남지 않았음을 확인했다. 공통 status/handoff/plan·architecture/policies 및 학습 기록을 동기화했다. context 전달본은 종료 문서 커밋 후 생성·--check한다.
