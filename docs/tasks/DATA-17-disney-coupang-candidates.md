# DATA-17 · Disney+·쿠팡플레이 공식 기사 기반 후보 확대 (2026-11-11)

- 요구사항: PROD-005/007/009. 작업 전 backend `d357104e`, app `d0b00df5` (개인 signing dirty 보존), verifier `832eb6cd`, 브랜치 `codex/app-auth-phone-ready`. 변경 범위: 공식 자료에서 개별 작품 후보 추출 및 로컬 검토 staging; API/DB migration/승인 기준 변경 없음.
- 예상 실패: Disney+ 글로벌 동시 공개를 한국 첫 공개일로 오인, 쿠팡 추천작의 '공개 2026'을 월일로 추정, 영화/시리즈 분류 혼동, staging 반복 시 중복, 외부 기사 내용을 작품 전체 목록으로 주장.
- 공식 근거: Disney 2026-11-03 기사 `https://thewaltdisneycompany.com/news/remarried-empress-early-premiere/`의 The Remarried Empress 11/03 조기 공개; 쿠팡 2026-11-05 공식 추천 기사 `https://news.coupang.com/archives/68161/`의 랜턴스, DTF 세인트루이스, 마티 슈프림. 기사 공개/추천 시각은 작품 최초 공개 시각으로 사용하지 않음.
- 결과: `data/lineups/disney-2026-11-remarried-empress.json` 1건(날짜 있음, 한국 시장 미확인), `data/lineups/coupang-2026-11-week1-recommendations.json` 3건(날짜 미확인). `node scripts/stage-ott-lineup.mjs` 실행 시 신규 1+3, 총 staging 86건; 쿠팡 파일 재실행 created=0/changed=0/unchanged=3. 전부 `market=null`, `premiereConfirmed=false`, 제품 게시 0건. `재혼 황후` 한글명 대응 및 KR 서비스 최초일 추가 확인 필요.
- 테스트: `npm test` 빌드 및 전체 75/75 통과. 기본 sandbox dist unlink EPERM으로 실패 후 승인된 실행으로 재시도. Git 제외 `work/ott-lineups/state.json`은 다른 환경으로 자동 이전되지 않음.
- 남은 과제: KR 플랫폼 최초 공개일 공식 자료 대조, Disney+/쿠팡 전수 목록 소스 및 이용 조건 조사, 이미지 이용 조건 확인, 사람 검토 후 게시, 클라우드 배포/독립 검증. LEARN-ID 해당 없음(ADR-015의 기존 출처/검토 절차 활용).
