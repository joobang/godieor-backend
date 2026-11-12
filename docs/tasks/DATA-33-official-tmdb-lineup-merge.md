# DATA-33 한국 공식 일정과 TMDB 분류 단서 연결

- 기준: backend `bdd87bd`, `codex/app-auth-phone-ready`. 범위: 2026-11 Netflix 한국 공식 일정 후보 75건의 TMDB 날짜·KR 제공처·작품 종류/시즌 보강 및 후보 중복 방지.
- 관련 요구: 최초 공개일 기준, 제공처별 독립 일정 보존, 공식 출처 + TMDB 교차 검토. 추정 일자와 한국 입점일을 최초 공개로 자동 승격하지 않음.
- 실패 가능성: 동명이인, TMDB 날짜 불일치, 한국 제공처 미일치, 동일 작품 다른 시즌, 시즌 메타 보강 시 새로운 candidate ID 생성, 최초 공개/입점일 혼동.

## 구현

- `scripts/merge-official-tmdb-lineup.mjs`: Netflix KR 공식 일정과 `enrich-official-ott-with-tmdb.mjs --live` 결과를 제목·일자·플랫폼·시즌으로 교차 매칭. TMDB 실제 TV match는 `type` 값이 없는 경우가 있어 `seasonNumber`와 `dates.seasonFirstDate`를 사용. 영화는 `type=movie`. 정확한 날짜, 한국 제공처, 단일 작품 ID가 맞아야 타입·시즌 보강. 한국 공식 일자는 유지하며 `premiereConfirmed=false`도 그대로 유지.
- `scripts/stage-ott-lineup.mjs`: 시즌이 나중에 보강된 동일 공식 작품이 별도 후보로 증식하지 않도록, 이전 `seasonNumber=null` 검토 전 후보 ID 유지. 이미 중복 생성된 미검토 후보도 정리. 별도의 시즌이나 검토 완료 후보는 자동 제거하지 않음.

## 실행·검증 (2026-11-12)

- `node --test tests/*.test.mjs`: 57/57 PASS(추가 시즌 후보 멱등성 회귀 포함).
- `npm test`: 빌드 및 전체 **120/120 PASS**.
- 실수집 근거 `data/lineups/netflix-kr-2026-11-12-auto.json` 75건 + `/private/tmp/godieor-netflix-kr-tmdb-all.json` 실조회 결과: **20건 자동 분류**, **55건 검토 후보 보존**, **최초 공개 자동 승인 0건**. TMDB에서 찾지 못한 한국 공식 행도 버리지 않음.
- `node scripts/stage-ott-lineup.mjs /private/tmp/godieor-netflix-kr-merged-v2.json work/ott-lineups`: 이전 실행에서 신규 시즌 ID로 불어난 임시 중복 정리 후 **169 후보**, 재실행 **75건 unchanged**, DB 신규 게시 0.
- 로컬 DB `audit-ott-lineup-published.mjs`: 한국 공식 첫 공개 근거 7건 중 제목/날짜/시즌 일치 5건, 시즌 확인 필요 2건, 완전 미게시 0건. StreamPick 신작과 동수는 아님.
- 아직 미해결: 공식 입점일과 국내 *첫 공개* 확정의 차이, 나머지 55건의 종류, StreamPick 신작 동등 범위 개수, 다른 3개 OTT의 대량 공식 수집, 실제 검토→게시. 따라서 현재 StreamPick 동수 달성이나 제품 반영을 주장하지 않음.
- 기존 `.env.example`, `package.json`, 공통 상태/인계 dirty, 무관한 감사 스크립트 변경을 유지. 독립 verifier, 클라우드 배포 미실행.
- 학습 기록: 해당 없음(원천 데이터 연결·후보 dedup 기능 변경이며 기술장애 상세 사례 기록 아님).
