# DATA-70 · 공식 근거 검토 배치 실제 적재

- 요구사항 PROD-005/006/007/009, acceptance 0.1.0-draft (변경 없음).
- 상태: 이번 공식 근거 검토 배치 23건 적재·자체 검사 완료. 담당 codex-data70-01 해제. 전체 제공처 전수/독립 승인 완료와 구분.
- branch codex/ott-reviewed-data-batch, 순차 checkout. app base 7bfa10d8592220d7776a68fa4ed2aefec019883c (개인 pbxproj dirty 보존), backend base b66e0ef8981a9c6ecc2f886a4106a46909fcad51, verifier base 55767bb3d09f33559e159af9e8e54be4589e847c.
- 사용자 지시: 데이터 적재를 실제로 완료. 파이프라인 설명/기존70 재게시로 종료하지 않음. StreamPick parity는 앞선 작업에서 제외한 기준을 재도입하지 않음.
- 예상 실패: 극장/OTT 날짜 혼합, 글로벌 날짜 이식, 회차/시즌 추정, 동명이작/기존 게시 중복, 기존70 이벤트·ID·이력 변경.
- 원본: data/curated/ott-source-reviewed-batch-2026-11-16.json. ADR-022 보완 / LEARN-0021.

## 실제 적재 결과

로컬 PostgreSQL ott_reviewed **70→93, 신규23**. Netflix14 / Disney+4 / TVING2 / Coupang Play3. API 목록·신규23 상세에서 날짜·한국·서비스·시즌·출처를 확인했다. 기존70 event 전체행·ID·변경이력 수 불변. 전체93 재게시 후 추가 이벤트0/행·이력 불변.

- Netflix: 공식 KR 신규 일정의 videoID와 실제 한국 작품 상세의 Movie/TVSeries·동일 제목·first-title date를 대조했다. season videoID가 작품 canonical ID로 리다이렉트되면 실제 응답 URL과 LD URL 일치도 검사했다. dateCreated를 단독 한국 공개일로 쓰지 않고 KR 일정과 일치하는 최초 작품 날짜의 보강으로 사용했다. 과거 첫날/날짜 불일치/404는 제외, 가능한 사랑·푸른길 등 기존 게시도 제외.
- Disney+: KR/ko entity·pathname·Movie/TVSeries·명시 플랫폼 공개 배너·isReplayTitle=false를 확인. 미키의 나 홀로 집에11/27, 윔피 키드12/04, 트위스티드 원더랜드12/23, 아소카 시즌2 2027/01/20. 페이지에 없는 시즌 번호는 null. 전현무계획 등의 시즌 개수나 LD 시즌 배열 번호를 실제 시즌으로 추정하지 않았다. 슈퍼 트루퍼스3는 현재 원문에서 날짜 배너가 없어 검색 캐시 날짜만으로 게시하지 않음.
- TVING: 가금채11/18·아불시대사11/21의 공개예정 프로그램/고정 P ID/작품명/드라마 형태/명시 openText 확인. broad_dt의 연도 문맥만 사용하고 가금채 내부11/16을 공개일로 사용하지 않았다. 아직 확정되지 않은 TMDB 식별이나 시즌 번호는 만들지 않았다.
- Coupang: 공식 새로 올라온 작품의 공개란과 작품별 문맥을 작성자가 직접 검토했다. 마이클11/13은 감독 안톤 후쿠아·자파 잭슨 등 출연진으로 TMDB936075를 확인하고 동명이작1996/2011 제외. 극장4/22를 OTT에 복제하지 않음. 길디드 에이지는 공식 시즌4·11/03부터 제공을 확인, 글로벌 시즌11/01과 구분. 돌싱N모솔은 자체 작품 문단의 명시2기·MC3명과 TMDB319744/시즌2·첫회11/03 대조. 확인한3개만 기존 curated TMDB binding에 추가.
- 출처 자체 ID로 독립 식별되는 공식 작품의 작성자 수동 검토 경로를 사용했다. TMDB 미확정인 작품을 임의 숫자 ID로 매핑하거나 다른 작품과 제목만으로 병합하지 않았다. 이 배치를 일반 자동 승인 실적으로 표현하지 않는다.

시즌 null20건/명시 시즌3건, 모든 신규 이벤트 date_only·instant NULL. 공식 발표된 미래 일정 상한 없음 정책에 따라 아소카2027/01도 보존. 11~12월 기간은 기존68→90, 연중/미래 전체93이다.

## 실행한 명령과 결과

node 실제24.22.3. 비밀은 무시된 backend .env로만 주입, fixture/공개 로그에 복사하지 않았다.

| 실제 명령 | 종료 | 결과 |
|---|---|---|
| Disney+16 상세/추가 공식3 상세 묶음 조회 | 0 | 제목·지역·타입·공개 배너·원문 지문 검토. raw /private/tmp/godieor-data70 |
| 미검토 Netflix20 작품 상세·Media Center 조회 | 0 | 상세19개200/1개404. Media Center에 서버 출력 날짜가 없는 응답은 날짜 근거로 사용하지 않음 |
| 실제 TMDB 마이클3동명이작/감독·출연진 및 TV2시즌 조회 | 0 | 공식 정체성/시즌 대조, 글로벌 날짜와 KR 날짜 분리 |
| evidence/data70/apply-reviewed-batch.cjs (실행 전 SQL snapshot70 저장) | 0 | 신규23 review·mapping, 전체93 canonical 선검사/기존70 canonical 불변 |
| node --env-file=.env dist/src/cli/publish-reviewed.js --file data/curated/ott-reviewed-mappings.json | 0 | 전체93 게시. 실제 신규23 |
| COLLECTION_SCHEDULE_ENABLED=false COLLECTION_INCLUDE_FIXTURE=false CATALOG_PROVIDER_ONLY=true node --env-file=.env /private/tmp/godieor-data70-verify.cjs after | 0 | SQL93/기존70보존/API200/새23 상세·날짜·출처. 첫 보조 검사는 >62일 질의로400→계약에 맞는4구간 조회로 수정 후 성공 |
| 같은 전체93 재게시 + verify.cjs repeat | 0/0 | 신규0, 전체행·이력 동일/23개 API 재확인 |
| Node24 PATH npm test | 0 | 전체276/276. 실제93개 상태에서 검사 |
| node scripts/complete-reviewed-mappings.mjs | 0 | added0/total93/rejected0. 후속일간 게시 키 보존 |

증거: evidence/data70/summary.json, db-http-after.json, db-http-repeat.json. 적용·검사 도구는 같은 폴더의 apply-reviewed-batch.cjs/verify-db-api.cjs (작업 전70과 보조 snapshot을 전제로 하므로 현재93에 무작정 재실행하지 않음). 실제 입력·검토·매핑은 curated 배치에 보존. sourceHashes는 실제 내려받은 공식 원문 지문이며 원문 전체/키는 Git에 넣지 않았다.

## 독립 검증 인계와 남은 범위

- app 코드 불변, 개인 signing 파일 보존. backend는 데이터/검토 매핑과 문서만 변경, 런타임 코드·API·DB migration 불변.
- 계약0.1.0-draft.5 manifest SHA256 0ffd7cbcdcb3c46b450e626ced90055e985308d728c279832aa00ec76b24e9c9.
- migration digest ec6966538bd599bf0dcee21ec0e0fb03a63b513ae01654d52b9e2badf5697fd7.
- acceptance0.1.0-draft SHA256 c4906283810c8b378800b67930028685a41b6a051923ea9f9415346b2d657063. 기준·verdict·승인자 불변.
- backend-only 작성자 SQL/API/자체 검사다. 별도 독립 runner·리뷰/새 iOS 빌드·실폰·클라우드 미실행. 세 저장소 통합PASS 아님.
- 남은 미정/시즌 불명/공식일자 미확정은 curated 배치 held에 원인별로 보존한다. 기준을 낮춰 전체 사이트 전수 확보나 일반 자동 신규 게시 완료로 표현하지 않는다.
- 공개 가능한 23건 배치 적재는 완료. 다음 소스 수집은 새 공식 날짜/첫 공개 근거가 생긴 유형을 처리하고 이번23을 다시 신규로 세지 않는다.
- ADR-022 및 LEARN-0021의 실제 신규0 주장은 DATA-69 당시 관측으로 보존하고 이번 실제23/전체93으로 후속 갱신한다. 공통 status/handoff/plan 사본 갱신. 최종 SHA는 종료 Git 이력 참조.
