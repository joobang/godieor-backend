# DATA-31 · 공식 OTT 목록 우선 TMDB 역조회

- 요구사항: PROD-004/005/006/007/009, ADR-015. DATA-30 후속.
- 범위: 한국 공식 편성 목록을 시작점으로 TMDB에서 작품/시즌/날짜/한국 watch-provider를 역조회하는 읽기 전용 보고서, 시즌별 누락 처리.
- 예상 실패: TMDB 한국 제공처 부재만으로 후보 소실, 다른 시즌 같은 이름을 날짜 충돌로 취급, 공식 공개일과 TMDB 첫 방영일 혼동.
- 명령: `node scripts/enrich-official-ott-with-tmdb.mjs data/lineups /private/tmp/godieor-official-tmdb-review.json` (오프라인), `node --env-file=.env scripts/enrich-official-ott-with-tmdb.mjs --live` (실제 TMDB API 사용).
- 결과 스키마: 공식 플랫폼/제목/날짜/시즌/근거 URL과 별도 `tmdb` 조회 결과, `reviewStatus`, `publishEligible=false`. 실게시 기능/자동 승인 없음.
- 2026-11-12 로컬 오프라인 실행: 공식 목록 내 KR·날짜 존재 후보 14건, TMDB 조회 0건, 게시 0건. 실제 데이터 원본의 한국 공개일 신뢰도는 개별 검토 필요.
- 확인: `node --test tests/streampick-gaps.test.mjs tests/official-tmdb-enrichment.test.mjs` 9/9. 전체 `node --test tests/*.test.cjs tests/*.test.mjs` 제한 환경에서 포트 bind EPERM 1건; 허용 환경 재실행 114/114 PASS.
- 별도 공식 웹 확인: 넷플릭스 한국 사이트 `더 바디` 작품 페이지는 존재하지만 11/11 공개일을 증명하지 않음. `Alicia's Law` 미디어센터의 11/11은 미국 출시 표시여서 한국 출시 증명이 아님. `문무`, `나인 투 식스` Netflix KR 날짜 역시 미확인. StreamPick 행 자체는 공식 증거 아님.
- 후속: 공식 웹 목록 월별 자동 수집, 출처/시장/첫공개 검토 후 reviewed 적재 및 게시 수 감사. iOS 일간 카드의 기존 텍스트 OTT 배지 사용, 공식 이미지 로고 아님.
- 독립 verifier 실행·배포 미실행. API 계약/마이그레이션 변경 없음. LEARN-ID 해당 없음(기존 ADR-015 범위의 후보 대조 개선).
