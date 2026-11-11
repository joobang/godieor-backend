# DATA-22 · Disney+ / Coupang Play 한국 OTT 공개일 로컬 게시

- requirement: 공식 한국 공개 날짜, 플랫폼, 최초 공개 증빙을 보존. acceptance/API/migration 변경 없음.
- 시작 상태: app a2c9308, backend 3beffaa, verifier ce1e248, branch codex/app-auth-phone-ready. 앱 iOS signing 및 backend .env.example 기존 dirty 제외.
- 변경: OTT 후보 2건 review 및 mapping work-000010/event-000010, work-000011/event-000011. 예상 실패: stale revision, lock, DB identity, 날짜 없는 시각 오기입.
- Disney+ `재혼 황후` 시즌1 2026-11-03 KR date_only: https://thewaltdisneycompany.com/news/remarried-empress-early-premiere/ 및 Disney+ 한국 홈.
- Coupang Play `스마일 클리닉` 2026-12-03 KR date_only: https://news.coupang.com/archives/68074/
- `npm run candidates -- review --file ...`: Disney 기본 sandbox 일반 실패(exit 1), 허용된 실행 성공(exit 0); Coupang 성공(exit 0).
- `npm run publish:reviewed -- --file data/curated/ott-reviewed-mappings.json`: exit 0, `ott_reviewed published 11`.
- 로컬 PostgreSQL SELECT event/event_source/event_service: 기존 9→11건. 새 2건 제목, 서비스, KR, 날짜, date_only, instant_at=NULL 확인.
- `npm test`: exit 0, 빌드 및 81/81 PASS(로컬 Node 20.20.2, package 엔진 선언 Node24).
- 독립 verifier PASS, 클라우드 게시, iPhone 실제 표시 미실행. 자동 전수 수집도 미완료.
- 다음은 공식 한국 일정 추가 검증/후보 검토→매핑→DB/API/폰 확인. StreamPick의 4개 지원 플랫폼 전체 비교 커버리지는 미달.
- ADR/LEARN-ID 해당 없음: 신규 기술 결정 없이 공식 날짜 매핑만 추가. push 미실행.
