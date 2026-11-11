# DATA-23 · 2026년 11~12월 OTT 실제 게시 커버리지 확인

- requirement: 지원 OTT 4개 플랫폼의 한국 공개 일정과 외부 발견 목록을 구분해 비교. 기존 API·DB migration·독립 acceptance 변경 없음.
- 시작 상태: app 92f18bf (개인 Xcode signing dirty), backend 8abd9dd (사용자 `.env.example` dirty), verifier b23d60e. 공통 branch `codex/app-auth-phone-ready`; 동일 checkout 동시 수정 없음.
- 구현: `scripts/audit-ott-published.mjs`의 읽기 전용 PostgreSQL SELECT로 `ott_reviewed`, `KR`, 2026-11~12월 게시 행사와 `data/reference/streampick-2026-11-12-titles.json`의 지원 플랫폼 35개 후보를 플랫폼/제목/날짜/시즌 기준 비교. `npm run audit:ott-published` JSON 출력. 날짜 일치하더라도 시즌 미검증은 별도 상태.
- 예상 실패: 제3자 발견 목록을 실제 한국 공개로 오인, 시즌 누락을 일치로 처리, 동명 작품의 날짜 불일치, 로컬 DB 접속 실패. SQL은 읽기 전용이고 후보를 자동 게시하지 않음.
- 실행 관찰: `node --test tests/ott-published-audit.test.mjs` 2/2 PASS; `node --env-file=.env scripts/audit-ott-published.mjs` exit 0. 외부 참고 35행 대비 게시 11건 중 11~12월 9건; 게시 일치 1, 날짜 일치·시즌 미검증 3, 날짜 불일치 0, 미게시 31. 이 수치는 공식 한국 최초 공개 진위가 확인된 31건의 누락이라는 뜻이 아님.
- 신규 DB 게시 0건. 기존 로컬 11건 유지. 포스터/클라우드/iPhone 적용 및 독립 verifier PASS 미실행. 구현 담당 검사는 독립 승인 아님.
- 다음: 31 후보의 공식 한국 날짜·플랫폼·시즌 근거를 항목별 확인해 staging→review→publish 경로로 연결, 재감사. 공식 확인되지 않은 후보는 달력에 올리지 않음.
- ADR/LEARN-ID 해당 없음: 정책 변경 없이 관측·검증 도구만 추가. push/외부 배포 없음.
