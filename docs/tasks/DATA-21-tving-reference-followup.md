# DATA-21 · 4개 OTT StreamPick 비교 후속 (2026-11-11)

- Requirement: 2026-11~12 Netflix/TVING/Disney+/Coupang Play 날짜·제목·플랫폼 기준 비교. 앱 실표시와 발견 후보를 구분한다.
- 범위: StreamPick 35개 행 중 TVING 한국 공식 출처 2건 추가, 조사 queue 갱신. 기존 게시 시스템과 API 계약 유지.
- 예상 실패: 추천 콘텐츠의 입점일을 '세계 최초 공개'로 오인, 같은 작품의 다중 플랫폼 일정 삭제, staging을 앱에 게시됐다고 주장.
- Source: https://cjnews.cj.net/티빙-오리지널-시리즈-대리수능-메인-포스터-공개/ (11/23 단독 첫 공개), https://cjnews.cj.net/티빙-주간-추천작-박수영x김현진-신작-로맨스부터-톰/ (유일무이 로맨스 11/09 제공일, 첫 공개 여부 미확인).
- 추가: `data/lineups/tving-kr-2026-11-exam.json`, `tving-kr-2026-11-romance.json`. 후자는 `premiereConfirmed=false`.
- 실행: 각 파일 `node scripts/stage-ott-lineup.mjs ...` 성공(created 1씩), staging 92→94. `node scripts/build-ott-discovery-queue.mjs ...` → 35 참고 행, 제목 매칭 6, 미해결 29. `node --test tests/ott-discovery-queue.test.mjs tests/ott-reference-compare.test.mjs tests/ott-coverage.test.mjs` 6/6 성공.
- **DB 추가 게시 0건**. 로컬 DB·API·실폰 반영을 이번에 수행하지 않음. 기존 게시 수는 마지막 DATA-16 측정 9건. 제3자 발견 근거만으로 날짜를 게시하지 않음.
- 다음: 29건 공식 한국 제공처 출처 조사, 날짜 불일치 별도 판정, 검토된 후보→실제 DB 게시 경로 구현, 4개 제공처 실제 API 표시 결과와 참고 목록 직접 비교. 쿠팡은 StreamPick 해당 월 참고 행 0이므로 공식 발표 목록에서 별도 검증.
- ADR: 기존 ADR-015 그대로. LEARN-ID: 해당 없음(데이터 확보 작업). 독립 verifier 미실행·승인 없음.
