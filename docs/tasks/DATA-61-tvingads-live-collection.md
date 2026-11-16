# DATA-61 · TVING Ads 공식 HTML 자동 수집 → 검토 staging (2026-11-16)

- requirement: 한국 OTT 신작·시즌 첫 공개 자동 발견/검토; 승인 기준은 verifier 원본 유지. 담당: backend 구현, 외부 승인 아님.
- 범위: 공식 TVING Ads `https://www.tvingads.com/content` 페이지에서 향후 3개월 날짜가 있는 카드만 수집; 중복 제목/날짜 충돌 차단; 기존 `prepareLineup` 검증과 `stageLineup` 검토 보관 재사용. 해당 소스는 TVING·Wavve 합동이므로 market=null, premiereConfirmed=false, 게시 금지. 날짜 없는 카드와 시즌 첫 공개 증거는 아직 포괄하지 못한다.
- 예상 실패: 공식 페이지 구조·섹션 변경, 날짜/제목 중복 충돌, 503/외부 호스트 리다이렉트, 한국 제공 플랫폼과 첫 공개 여부 불명.
- 코드: `scripts/collect-tvingads-kr-lineup.mjs`, `tests/tvingads-live-lineup.test.mjs`. CLI: `node scripts/collect-tvingads-kr-lineup.mjs <새로운-output.json> [staging-directory]`. 기존 파일 덮어쓰기 금지; 스테이징 지정 시 자동 병합.
- 실제 관찰: 2026-11-16 저장된 공식 공개 HTML 1,093,648바이트에서 문무 11/14, 대리수능 11/23, 무쇠소녀단3 11/26, 그냥 사람 친구 11/27, 대탈출 : 도시괴담 12/02, 기프트 12/05, 총 6개 날짜 카드. 신작/시즌의 한국 최초일 증명이나 게시 증가로 해석하지 않는다.
- 실행: Node24 `node --test tests/*.test.mjs` 167/167 통과. 저장된 실 HTML→검토 staging 신규6·재실행 신규0/변경0/동일6, 제품 게시0. 실제 네트워크 CLI 재수집, DB/API 업데이트, 독립 verifier/클라우드/iOS 검사 미실행.
- 계약·마이그레이션·acceptance 불변. StreamPick 저장 참조 52개 중 정확26·날짜차2·미게시24는 이전 측정값이며 이 작업에서 재측정하지 않음.
- 다음: Netflix 자동 수집·TVING Ads·Disney+ 공식 일정과 TMDB 작품/시즌 정체성 연결을 보강하고, 제공 플랫폼과 한국 **첫 공개** 증거가 확보된 항목만 기존 검토/게시 절차로 보낸다. Disney+ 일정 목록 자동 수집과 Coupang 공식 수집은 아직 미완성.
- ADR: 기존 공식 소스 검토 후 게시 정책 유지; 새 결정 없음. LEARN-ID: 해당 없음(파서/스테이징 연결 구현, 별도 학습 설명 변경 없음).
- 인계: base backend `785baa6` / head 이 카드 커밋에서 확인, app `05879e5`, verifier `184b7c5`, 동일 `codex/ott-animation-support`; backend 개인 `.env.example`/`package.json` 및 감사용 미추적 파일, app iOS signing 변경 보존. 배포/승인 미요청.
