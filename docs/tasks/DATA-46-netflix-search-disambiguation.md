# DATA-46 · Netflix 동명 작품·검색 미발견 6건 재대조

- 요구사항: PROD-005/006/007/009 (GD-005/006/007/009), acceptance 0.1.0-draft. 승인 기준·verdict 변경 없음.
- 상태: 인계 대기(구현·수동 검토·로컬 게시·자체 검사 완료, 독립 검증 미실행). 담당 codex-data46-01, 종료 시 해제. 순차 작업. 원본은 backend/docs/tasks/DATA-46-netflix-search-disambiguation.md.
- 기준: app 6f47a530d052485cec99e2b8ab96412db12180f1 / backend 517174695503cbc7635cf7e908b67146e1678aed / verifier d097c10df94ae9df83ed6ca31c6d7a4c2021b297.
- 작업 브랜치: 세 저장소 codex/data46-netflix-disambiguation, 기존 checkout에서 순차 작업. 동시 구현 없음.
- 기존 dirty: app pbxproj, backend .env.example/package.json 및 감사 스크립트/테스트 4개 미추적. 보존.
- 범위: 이전 검색잘림 4건(My Best Friend, Allen, Gordon, The Child), 제목 미발견 2건(Mike Ward: Modest, Nate Bargatze: Good For Nathan)을 공식 배우·연도·제작국가·대체 제목과 TMDB 실응답으로 재대조. 근거 충분한 작품만 작성자 검토·기존 고정 매핑·로컬 게시.
- 완료 조건: 6건별 검색 완료/미발견/보류 사유와 출처 기록, 게시 전후 동일 DB 범위·API·재게시 멱등성 확인. 미확인 범위를 억지로 채우지 않음.
- 예상 실패: 검색 연도 제한을 실제 제작 연도 확정으로 오인, 동명 영화/시리즈와 배우 혼동, 제목 일부 일치를 단일 정체성으로 승인, 해외 개봉일을 한국 Netflix 첫 제공일로 대입, 다른 시즌 중복 게시.
- 확정/제안: 제품 정책 변경 없음. 검색 연도는 공식 근거가 있는 경우에만 검색 범위를 좁히는 조건으로 사용. 한국 날짜는 기존 공식 KR 목록 유지, 별도 해외 보도자료만으로 한국 제공일을 생성하지 않음.

## 구현·자체 검사

아래 실제 결과를 기록했다. 전체 제품 승인과 구분한다.

## 독립 검증 handoff

backend-only 작성자 검사·로컬 실데이터 반영 범위. 독립 검증/클라우드/실폰은 별도. app/API 계약/migration/acceptance 변경 계획 없음.

## 결정·학습 기록

ADR/LEARN-ID 해당 없음: 기존 공식 근거 대조·고정 매핑 게시 경로를 적용하며 새로운 정책/아키텍처를 도입하지 않는다.

## 조사 결과와 구현

- `scripts/disambiguate-netflix-tmdb.mjs`: 공식 ID·영문 표시명·배우·국가·연도 입력을 검증한 뒤 연도 제한으로 검색 페이지를 끝까지 조회한다(최대5페이지, 초과 시 보류). 정확한 제목 후보만 상세·credits를 재조회하고 공식 배우 최소2명(공식 배우가1명이면1명)과 국가가 일치해야 정체성 근거를 남긴다. 연도 제한에 정확한 제목이 없으면 제한 없는 검색도 수행한다.
- 검색 결과의 제목이나 날짜만으로 확인 처리하지 않는다. 상세·출연진 조회 실패 또는 검색잘림은 `lookup_incomplete`, 다중 정체성·다중 시즌은 별도 보류다. 영화에 시즌1을 만들지 않고 실제 TV 시즌의 air_date만 비교한다. 결과는 모두 eligibleForAutomaticPublication=false이고 게시 경로가 없다.
- 합성 회귀5개: 같은 제목/날짜지만 배우·국가 불일치, 검색잘림·credits 실패, 연도 제한 없는 과거 작품 fallback, 동일 날짜 다중 시즌·시즌0 제외, 공식URL/중복 배우 입력 거부. 구현 결과를 정답 fixture로 복사하지 않았다.
- 기존 검색잘림4건을 이번 연도 제한 검색에서는 모두 끝까지 확인했다. My Best Friend/Allen/Gordon은 각각1페이지, The Child는3페이지였다.
- 앨런: Netflix 공식 호주 영화·2026·배우 T.J. Power/Charlotte Nicdao/Josh Helman과 TMDB movie1518204의 배우3명·AU가 일치한다. 공식 KR 목록의11/12와 TMDB 영화 날짜11/12가 같아 수동 검토했다. 시즌은null 보존.
- 고르돈: Netflix 공식 보도자료의 아르헨티나 시리즈·Rodrigo de la Serna/Matías Recalt/Camila Peralta·2026년11/18 공개와 TMDB tv340280의 배우3명·AR·시즌1 첫 날짜11/18이 일치한다. 한국 날짜는 별도의 Netflix KR 목록 관측11/18을 사용했다. 해외 보도자료만으로 한국 날짜를 추정하지 않았다.
- 나의 베스트 프렌드: 같은 영문 제목의 미국 작품1730747은 배우/국가 불일치로 배제. 브라질/포르투갈 영화1257147의 공식 배우3명과 일치하지만 TMDB09/03 vs 한국 Netflix11/02이므로 게시하지 않았다.
- 그 아이: 라트비아 동명 영화1772708은 배우/국가 불일치로 배제. 스페인 영화1506401(El niño)의 공식 배우3명이 일치하지만 TMDB11/13 vs 한국 Netflix11/27이므로 게시하지 않았다.
- Nate Bargatze: Good For Nathan은 검색 후보1824177을 찾았으나 직접 조회한 TMDB 상세의 release_date가 비어 있고 credits.cast도 없어 정체성 미확인으로 보류했다. 검색 응답의 날짜를 상세나 공식 출연진 검증 대신 사용하지 않았다.
- Mike Ward: Modest는 연도 제한/해제 검색 모두 정확한 제목 후보가 없어 미발견이다. 임의의 번역 제목·부분 일치로 승인하지 않았다.
- 한국 제공 날짜는 DATA-43에서2026-11-12 관측한 공식 KR 월간 목록을 유지했다. 오늘 상세/보도자료·TMDB를 대조했지만 KR 월간 목록 전체를 새로 수집한 것은 아니다. 과거 DATA-45 입력은 당시 관측으로 보존했다.

## 로컬 게시와 실제 검증

- 검토 입력 `data/curated/netflix-kr-reviewed-disambiguated-2026-11-13.json`의2건을 기존 후보 최신 revision에 적용하고 prepareReviewed로 전체57개 매핑을 검증했다. 신규 키는 work/event-000056,000057이다. 기존 다른 작품·플랫폼·시즌 키를 재사용하지 않았다.
- 같은 범위의 실제 로컬 DB 측정: 2026-11-01 <= local_date < 2027-01-01, release_market=KR, provider_key=ott_reviewed, 대상4서비스에서 **53→55건(+2)**. Netflix11월48건, 연중 전체 고정 매핑/이벤트57건이다.
- 신규2건의 제목·날짜·KR·Netflix·시즌(null/1)을 SQL로 확인했다. 둘 다date_only, instant_at=NULL이다.
- 수집 스케줄을 끄고 가상 데이터를 제외한 임시 로컬 API를127.0.0.1 임의 포트에 기동했다. GET /v1/events 기간 조회 HTTP200/55행/신규2ID 모두 존재. 검사 후 임시 API를 종료했으며 기존 사용자 서버는 변경하지 않았다.
- 동일57개 매핑을 다시 게시한 뒤 provider 이벤트57건/신규2건 event_change2건이 그대로였다. 중복·추가 변경 이력0.
- Node22.22.3 npm test **154/154 통과**. 기존 dirty·미추적 검사를 포함한 working tree 결과이며 package engines의 권장Node24 검증은 미실행이다. API 검사에서 기존 pg 동시query deprecation 경고를 재관측했으며 명령은 성공했다.
- 앱 코드·계약·migration 변경 없음. iOS 빌드/실폰/클라우드/독립 verifier 실행은 미실행이다. 로컬 검사를 통합 PASS나 운영 반영으로 표현하지 않는다.

## 실제 명령과 결과

node는 `/Users/dojoohwan/.nvm/versions/node/v22.22.3/bin/node`를 사용했다. 비밀은 Git 제외.env에서 읽고 출력하지 않았다. DB 쓰기 전 localhost/127.0.0.1 여부를 확인했다.

| 실제 명령 | 종료 코드 | 결과·로그 |
|---|---|---|
| node --test tests/netflix-disambiguation.test.mjs |0| 독립 합성5/5 통과 |
| node --env-file=.env /private/tmp/godieor-data46/search-six.mjs |0| 6건 연도 제한·배우명 검색 관측, search-results.json |
| node --env-file=.env scripts/disambiguate-netflix-tmdb.mjs data/reference/netflix-disambiguation-input-2026-11-13.json /private/tmp/godieor-data46/refined-report.json --live |0| 날짜/정체성 일치2, 정체성 일치·날짜차이2, 정체성 미확인1, 제목 미발견1 |
| node --env-file=.env scripts/audit-ott-published.mjs data/reference/streampick-2026-11-12-gap11.json |0| 게시 전 동일 범위53건 |
| npm test |0| build+154/154, /private/tmp/godieor-data46/npm-test.log |
| git diff --check (세 저장소) |0/0/0| 공백 오류 없음 |
| JSON/매핑/공통사본 종료 점검 |0| 관측6건/일치2건/고정키57개 고유·세 사본 동일 |
| node --env-file=.env /private/tmp/godieor-data46/apply-reviews.cjs |0| 2개 review, 전체57개 preflight |
| node --env-file=.env dist/src/cli/publish-reviewed.js --file data/curated/ott-reviewed-mappings.json (2회) |0/0| 전체57개 로컬 매핑 게시, publish.log/publish-repeat.log |
| COLLECTION_SCHEDULE_ENABLED=false CATALOG_PROVIDER_ONLY=true node --env-file=.env /private/tmp/godieor-data46/verify-publication.cjs |0| SQL55건/신규2건·HTTP200/55행/신규2ID |
| node --env-file=.env /private/tmp/godieor-data46/check-idempotency.cjs <before/after.json> |0/0| 이벤트57/신규 변경이력2 유지 |

## 재현·고정 입력

- 공식 근거 입력: data/reference/netflix-disambiguation-input-2026-11-13.json. factsAsOf로 전일 관측 재사용과 오늘 확인한 사실을 구분한다. 영문 표시명을 제작 원제로 단정하지 않는다.
- 실제 API 보고서: data/reference/netflix-disambiguation-report-2026-11-13.json. 검색 범위/잘림/배우 일치/제작국가/실제 영화·시즌 날짜/오류를 보존한다. 작성자 증거이며 독립 정답이 아니다.
- 수동 검토 입력: data/curated/netflix-kr-reviewed-disambiguated-2026-11-13.json. 새 환경은 원래 공식75개lineup bridge로 후보를 복원하고 items[].review를 기존review CLI에 입력한 후 전체mapping을publish한다. 후보state/DB/.env는Git제외다.
- 실제 게시 증거: data/reference/netflix-disambiguation-publication-evidence-2026-11-13.json. SQL/API/재게시 전후 수치를 저장했다.

| 입력 | SHA-256 |
|---|---|
| API 0.1.0-draft.2 | `e2e368a3b285ab0dae7d5f1d6f497c3de28ca0c099b2da10344a0a1a857e515c` |
| acceptance 0.1.0-draft | `c4906283810c8b378800b67930028685a41b6a051923ea9f9415346b2d657063` |
| official identity input | `57adc513dae5cd895b80c6a5c3faac676db0483301a99a97dc7325c898367494` |
| curated reviews | `305db1eaea41b80b5cb78c8c99d79f9711761a6f702f6299a01650cd03aa62fa` |
| migrations (relative path + NUL + bytes + NUL) | `a6009a82ea00e08cfefa5d294ed40e2f5fb30a0e6e6807bf22e3db79217bb2e7` |

## 다음 세션 인계

- app/backend base는 카드 상단, 최종head는 종료 Git 이력 참조. verifier 기준SHA는 상단과 같으며 공통 문서만 동기화한다. 독립review에는 구현 대화·작성자 판단을 정답으로 주입하지 말고 고정 코드·공식 근거·독립 기준을 제공한다.
- 이번6건은2건 게시,2건 날짜차이 보류,1건 상세 메타데이터 부족,1건 제목 미발견으로 정리했다. 더 이상 기존4건을 검색잘림 상태로 표현하지 않는다. 미래 원천 갱신은 재조회 필요.
- 다음은 공식 상세 실패16건의 접근 가능한 공식 근거, Mike Ward 대체 공식 제목, Nate의 상세 메타데이터 갱신, 한국 입점일/극장·방송일 차이 검토다. 가짜 날짜·시즌 생성이나 입점일 정책 변경은 하지 않는다.
- app OTT 전용 인계와 status/handoff·공통 사본을 갱신한다. 기존 개인 signing/.env.example/package.json/미추적 감사 도구는 보존한다. README 제품 기능 변화 없음.
- 담당 codex-data46-01 해제. 최종 커밋은 종료 Git 이력에서 확인.
