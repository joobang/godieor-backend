# DATA-47 · 공식 상세 조회 실패 16건 근거 보강

- 요구사항: PROD-005/006/007/009 (GD-005/006/007/009), acceptance 0.1.0-draft. 승인 기준·verdict 변경 없음.
- 상태: 인계 대기(조사·지원 유형5건 로컬 게시·자체 검사 완료, 독립 검증 미실행). 담당 codex-data47-01, 종료 시 해제. 순차 작업. 원본 backend/docs/tasks/DATA-47-netflix-official-recovery.md.
- 기준: app 81d1d2015d4dbbe20c847e04407eb0403a07286b / backend f7480e47c15893ee0266af1711490843c13e9dc0 / verifier b3c97213b37f41464a29cf381e2dca107f2d7e3e.
- 브랜치: 세 저장소 codex/data47-netflix-official-recovery, 기존 checkout에서 순차 진행. 동시 구현 없음.
- 기존 dirty: app pbxproj, backend .env.example/package.json 및 감사 도구·테스트 4개 미추적. 보존.
- 범위: DATA-45 공식 상세 조회 실패16건을 재시도하고, 공식 보도자료/Tudum/도움말/다른 공식 연결 페이지로 작품ID·표시명·형식·시즌 근거를 보강한다. 근거 충분한 항목만 기존 TMDB 대조·수동 검토·고정 매핑·로컬 게시로 연결한다.
- 완료 조건: 16건별 출처·확인/범위밖/미확인 사유를 남기고, 게시 시 동일 기간·KR·제공처 조건 SQL/API·재게시 멱등성을 확인한다.
- 예상 실패: 조회 도구 오류를 작품 부재로 오인, 시즌ID/시리즈ID 연결을 임의 생성, 드라마와 동명 다큐멘터리 혼합, 게임/보너스/회차/스포츠를 첫 공개 영화로 게시, 해외 일정만으로 한국 일자를 생성.
- 가정: 기존 공식 KR 목록 관측(2026-11-12)은 보존한다. 오늘 공식 상세 원 URL16건 모두 웹 도구 조회 실패를 재관측했으며 직접 bot 스크래핑 대신 공개 공식 문서 검색/연결을 사용한다. 제품 정책 변경 없음.

## 실제 작업·검사

아래 실제 명령·실행 결과를 기록했다. 전체 제품 승인과 구분한다.

## 독립 검증 handoff

backend-only 작성자 검사·로컬 반영 범위. 독립 검증/실폰/클라우드 미실행. API/앱코드/migration/acceptance 변경 계획 없음.

## 결정·학습 기록

ADR-013의 기존 고정 매핑·수동 게시 경로를 적용했다. 새 ADR은 없음(계약/정책 변경 미실행). LEARN-0011에 이번 실제 preflight 거부·유형 경계 관측을 구현 담당 후속 기록으로 연결했다. 독립 검증 결과나 사용자 이해도 주장이 아니다.

## 공식 근거 복구

- 기존16개 원 title URL을 웹 도구로 모두 재조회했으나 다시 열리지 않았다. 브라우저의 실제 공개 페이지에서 같은16개 URL을 각각 한 번씩 열어12개는 한국어 콘텐츠 페이지·원ID→시리즈ID redirect를 확인했고4개는NSES-404를 관측했다. 로그인·재생 클릭·가입·계정 변경·보안 경고 우회는 하지 않았다. 일반bot 직접 스크래핑 배치는 사용하지 않았다.
- redirect ID는 숫자를 추정해 만들지 않았다. 예를 들어 발렌치나81289599→80991539, 이런 북극81997254→81616012, 세서미82641828→83075543을 실제 URL과 화면 제목으로 확인했다. 이전 웹 도구 실패를 작품 부재로 취급하지 않는다.
- 공식 도움말에서 ABCmouse, Thomas & Friends: Whistle & Go, 우당탕탕 공룡들(Bad Dinosaurs)이 게임임을 확인했다. PAW Patrol: The Game의 정확한 도움말은 찾지 못했다. PAW Patrol Academy는 다른 이름의 게임이므로 자동 별칭 연결하지 않았다.
- 케이팝 PLAYlist는 이름 붙은 숏폼 영상 모음집, Bonus Content는 특별 영상 모음집이었다. Sesame Street의4부(Volume4)는 시즌4 확정 근거가 아니며 공개 회차/분할 묶음을 첫 시즌 공개로 게시하지 않았다. WWE는2026년 경기 묶음/레슬링 콘텐츠로 확인해 OTT 첫 공개 대상에서 제외했다.
- 일반 시리즈·예능·다큐 시리즈8건을 공식 영문명으로 실TMDB 역조회했다. 단일 시즌 날짜 일치6건, 날짜 차이2건, 오류0/검색잘림0. 드라마4건은 DATA-46의 기존 도구로 공식 배우 최소2명·제작국가와 날짜를 추가 확인했다.
- Murder in Galicia(11/13 드라마)는 Unprotected: Murder in Galicia(11/06 다큐 영화)와 다른 작품이다. 공식 보도자료·원ID 연결·배우로 구분했고 다큐 영화의 날짜를 가져오지 않았다.
- 한국 공개 날짜는2026-11-12의 공식 KR 목록 관측을 보존했다. 해외 보도자료·미디어센터의 미국 시각은 형식/작품 정체성의 보조 근거로만 사용했으며 한국 일자를 만들거나 자정UTC를 넣지 않았다.

## 실제 preflight 거부와 처리

- 처음 날짜 일치6건을 검토 입력하려 했지만 `캐런 리드 재판`의 contentKind=documentary가 reviewSchema에서 거부돼 종료1이었다. lineupEvidence는documentary를 보존할 수 있지만 현재 reviewSchema와 Canonical/API ottCategory는 이를 지원하지 않는다. 단순히 한 enum만 늘리면 끝나는 문제가 아니다.
- repository transaction이 저장 전에 거부한 뒤 후보state가 백업과 바이트 단위 동일하고 전체 고정 매핑57개도 그대로임을 확인했다. 이 실패 배치에서는 DB publish 명령을 실행하지 않았다.
- 다큐 유형을 다른 분류로 재명명하거나 계약/기준을 완화하지 않았다. `blockedItems`로 분리하고 현재 지원되는5개 review만 재적용했다. 실제 키는work/event-000058~000062, 전체62개다. 실제 승인·게시된 기존 키를 재사용하지 않았다.
- `docs/reviewed-publish.md`에 후보 분류와 실제 게시 지원 유형의 경계를 추가했다. 계약·마이그레이션·iOS 코드는 변경하지 않았다. 다큐 분류 지원은 제품/계약/iOS 영향 검토와 별도 구현·검증 과제로 남긴다.

## 로컬 게시·실측

- 같은11~12월/KR/ott_reviewed/4개서비스 범위에서 실제 로컬 DB **55→60건(+5)**. Netflix11월은48→53건, 연중 전체 ott_reviewed 고정 매핑/이벤트는57→62건이다.
- 신규5건의 제목·KR·Netflix·시즌1·원 날짜를 SQL로 확인했다. 모두date_only, instant_at=NULL이다.
- 수집 스케줄을 끄고 가상 데이터를 제외한 임시 로컬 API에서 HTTP200/60행/신규5개ID를 확인한 뒤 임시 API를 종료했다. 기존 사용자 서버·iPhone 설치는 변경하지 않았다.
- 동일62개 매핑을 다시 게시했을 때 이벤트62/신규5건 변경이력5로 동일했다. 중복·추가 변경 이력0.
- 기존도구를 재사용했고 런타임 코드·추가 테스트는 만들지 않았다. Node22.22.3 전체154/154 통과(기존dirty·미추적 포함 working tree), 권장Node24/독립 검증/실폰/클라우드는 미실행이다. HTTP 검사 중 기존pg 동시query deprecation 경고를 재관측했으나 명령은 성공했다.

## 신규5건

| 제목 | 한국Netflix날짜 | 게시 분류 | 시즌 | TMDB |
|---|---|---|---|---|
| 스타 & 웨딩: 아넬레와 버자 | 2026-11-13 | variety | 1 | tv/341603 |
| 머더 인 갈리시아 | 2026-11-13 | drama | 1 | tv/303182 |
| 발렌치나의 열두 별자리 | 2026-11-18 | drama | 1 | tv/318420 |
| 로 오브 비스트 | 2026-11-18 | drama | 1 | tv/332839 |
| 24시간 온콜 | 2026-11-26 | drama | 1 | tv/338930 |

## 16건 최종 정리

| 제목 | 원ID→확인한 시리즈ID | 분류/결과 |
|---|---|---|
| 케이팝 데몬 헌터스: 플레이리스트 | 83135831→83111321 | short_form_collection / hold_collection_first_release_unverified |
| 케이팝 데몬 헌터스: 보너스 콘텐츠 | 82661317→82182322 | bonus_collection / hold_collection_first_release_unverified |
| PAW Patrol: The Game | 83098128→없음/미확인 | unverified / unresolved_exact_game_identity |
| 이런, 북극! | 81997254→81616012 | series / hold_date_disagreement |
| ABC마우스 | 82878686→없음/미확인 | game / exclude_game_from_ott |
| WWE Crown Jewel | 82848233→81930079 | sports_entertainment / exclude_wrestling_from_ott |
| Thomas & Friends: Whistle & Go | 82662589→없음/미확인 | game / exclude_game_from_ott |
| 우당탕탕 공룡들 | 83312495→없음/미확인 | game / exclude_game_from_ott |
| 스타 & 웨딩: 아넬레와 버자 | 83073031→83073030 | reality_series / published |
| 머더 인 갈리시아 | 82023390→82023389 | series / published |
| 발렌치나의 열두 별자리 | 81289599→80991539 | series / published |
| 로 오브 비스트 | 81769098→81769097 | series / published |
| 캐런 리드 재판 | 81777232→81777231 | documentary_series / hold_publisher_category_unsupported |
| 세서미 스트리트 | 82641828→83075543 | volume_release / hold_volume_is_not_season |
| 24시간 온콜 | 81763934→81763933 | series / published |
| 필리핀의 크리스마스 선물 | 82044874→82044873 | series / hold_date_disagreement |

`이런, 북극!`은KR11/05 vs TMDB시즌2 09/08, `필리핀의 크리스마스 선물`은KR11/26 vs TMDB시즌1 12/03 차이를 그대로 보존했다. 정확한 한국 첫 제공일 의미를 더 검토해야 하며 날짜를 맞춰 바꾸지 않았다.

## 실제 명령과 결과

Node 경로 `/Users/dojoohwan/.nvm/versions/node/v22.22.3/bin/node`. 비밀은 Git 제외.env에서만 읽고 DB 쓰기 전localhost/127.0.0.1 여부를 확인했다.

| 실제 명령 | 종료 코드 | 결과·로그 |
|---|---|---|
| node --env-file=.env scripts/enrich-netflix-identity-aliases.mjs data/reference/netflix-official-recovery-2026-11-13.json /private/tmp/godieor-data47/tmdb-recovery.json --live |0| 16행 중8작품 실조회, 날짜 일치6/차이2 |
| node --env-file=.env scripts/disambiguate-netflix-tmdb.mjs /private/tmp/godieor-data47/cast-input.json /private/tmp/godieor-data47/cast-report.json --live |0| 드라마4건의 배우/국가/시즌날짜 일치 |
| node --env-file=.env scripts/audit-ott-published.mjs data/reference/streampick-2026-11-12-gap11.json |0| 게시 전55건 |
| npm test |0| build+154/154, /private/tmp/godieor-data47/npm-test.log |
| git diff --check (세 저장소) |0/0/0| 공백 오류 없음 |
| JSON/매핑/공통사본 종료 점검 |0| 16건최종상태/지원5건/보류1건/고정키62개/기간60건/사본동일 |
| node --env-file=.env /private/tmp/godieor-data47/apply-reviews.cjs (최초6건) |1| documentary 검토 enum 거부, 후보state/매핑 불변, DB게시 미실행 |
| 위 apply-reviews.cjs (지원5건만) |0| review5, 전체62개 prepareReviewed 검증 |
| node --env-file=.env dist/src/cli/publish-reviewed.js --file data/curated/ott-reviewed-mappings.json (2회) |0/0| 로컬62매핑게시, publish.log/publish-repeat.log |
| COLLECTION_SCHEDULE_ENABLED=false CATALOG_PROVIDER_ONLY=true node --env-file=.env /private/tmp/godieor-data47/verify-publication.cjs |0| SQL60건/신규5건·HTTP200/60행/신규5ID |
| node --env-file=.env /private/tmp/godieor-data47/check-idempotency.cjs <before/after.json> |0/0| 이벤트62/신규변경이력5 유지 |

## 재현 입력·검증 handoff

- data/reference/netflix-official-recovery-2026-11-13.json:16건 공개 브라우저·공식 문서 사실, 원ID/실제redirectID, 게임/모음집/분할/스포츠·유형 미지원 보류 사유. 원문 전체나 사용자 계정 정보는 저장하지 않았다.
- data/reference/netflix-official-recovery-tmdb-2026-11-13.json:실TMDB8건 관측, 회차 전체 날짜 배열만 제거. additionalCastCrosscheck에4건 추가 대조 입력·결과 보존. 문서의 수동 게시 보류 사유는 실조회 후의 검토 결과이므로 query 당시 입력과 구분한다.
- data/curated/netflix-kr-reviewed-recovered-2026-11-13.json:지원되는5개 수동review·고정mapping과 유형 미지원1개 blockedItems. 새 환경에서는 원래75개lineup bridge로 후보를 복원한 뒤 items[].review를 기존review CLI에 입력하고 전체mapping을publish한다. 후보state/DB/.env는Git제외다.
- data/reference/netflix-official-recovery-publication-evidence-2026-11-13.json:최종16건 상태·preflight 거부·SQL/API·재게시 작성자 증거. 독립 정답fixture가 아니다.
- app/backend base는 카드 상단, 최종head는 Git 이력. verifier base는 상단과 같으며 공통 문서·LEARN-0011 작성자 관측만 추가했다. 독립review에는 구현 대화/작성자 결론을 정답으로 주입하지 않는다.

| 입력 | SHA-256 |
|---|---|
| API 0.1.0-draft.2 | `e2e368a3b285ab0dae7d5f1d6f497c3de28ca0c099b2da10344a0a1a857e515c` |
| acceptance 0.1.0-draft | `c4906283810c8b378800b67930028685a41b6a051923ea9f9415346b2d657063` |
| official recovery observations | `666f89fa4e5c6d2e40110c2c5d38cdbac04ea9803217a13f92dce20b3f910c3c` |
| curated reviews | `a1ea045b1fc2681ad9f09bd4c0a2ebff4e9b7697e46981c997665685c8a8d388` |
| migrations (relative path + NUL + bytes + NUL) | `a6009a82ea00e08cfefa5d294ed40e2f5fb30a0e6e6807bf22e3db79217bb2e7` |

## 다음 작업 인계

- 과거16건을 계속 단순 조회실패로 표현하지 않는다. 최종 결과는5게시/1게시유형미지원/2날짜차이/3게임/2영상모음집/1Volume/1레슬링/1정체성미확인이다.
- 다음은 다큐 유형 지원의 계약·정규화·review·iOS 영향 검토, PAW Patrol 정확한 작품 식별, 별도 보류 Mike/Nate 근거 보강, 한국 입점일/극장·방송일 차이 정책 검토다. 약한 근거로 날짜·시즌·종류를 맞춰 넣지 않는다.
- OTT 전용 인계와 status/handoff·공통 사본을 갱신했다. 기존 개인 signing/환경/감사도구 미커밋은 보존한다. README 제품 기능 변화 없음, reviewed-publish 절차 문서의 지원 유형 설명 추가.
- 담당 codex-data47-01 해제. 최종 커밋은 종료 Git 이력 참조.
