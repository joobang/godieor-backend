# DATA-13 · TVING Ads 예정작 후보 파서

- requirement: PROD-005/007/009. 담당 `codex-ott-lineup-13` (구현), branch `codex/app-auth-phone-ready`; 기준 backend `256fcd0`, app `ed53db1` (Xcode signing 사용자 dirty 유지), verifier `d5a767d`.
- 범위: TVING Ads 콘텐츠 목록의 저장된 텍스트에서 `향후 3개월 오픈 예정 콘텐츠` 제목/장르/공개일을 작품별 후보로 변환하고 기존 staging과 연결. 기존 계약·DB migration·verifier 기준 변경 없음.
- 실패 예상: 반응형 중복 카드의 두 번 적재, 날짜 없는 예정작의 가짜 날짜, TVING·Wavve 공통 광고 자료의 TVING 국내 첫 공개 오인, 이미지 CDN의 이용 권한 불명, 홈페이지 구조 변화.
- 공식 페이지 `https://www.tvingads.com/content`는 웹 공개 열람에서 예정작·날짜·장르 및 중복 모바일/데스크톱 카드를 관찰함(2026-11-11); 로컬 Mac DNS 오류로 실사이트 HTML/robots 접근은 불가. 다운로드 자동화·게시·한국 최초 공개 확정 없이 저장한 텍스트만 읽는 경계로 구현.
- LEARN-ID: 해당 없음(수집 경계 ADR-015에 기록).

## 완료·인계 (2026-11-11)

- 상태: 저장된 페이지 텍스트의 검토 후보 파서 구현 완료, 사이트 원문 검증 및 게시 보류. 담당 해제.
- `scripts/parse-tvingads-lineup.mjs`, `package.json`의 `parse:tving-lineup`, `tests/tvingads-lineup.test.mjs` 추가. 장르 상속·잘못된 날짜·URL·중복 충돌 방어.
- Git 제외 로컬 후보 11건 임시 staging: 첫 실행 created=11, stored=11, published=0. 재실행 unchanged=11, published=0. 웹 원문 사본이 없어 11건의 실제 날짜와 한국 최초 공개는 확인된 사실이 아님. 기존 DB 게시 OTT 7건 그대로.
- 최종 전체 `npm test` 75/75, 관련 `node --test tests/tvingads-lineup.test.mjs tests/ott-lineup.test.mjs` 10/10 통과. 독립 검증·클라우드 게시·실기기 미실행.
- app base `ed53db1`, backend base `256fcd0`, verifier `d5a767d`. API 계약·migration·verifier acceptance 불변, 개인 iOS signing 미커밋 파일 보존.
- 다음 작업: 원문 HTML·robots·약관·포스터 이용 조건 확보, 잠정 11건 날짜/지역/첫 공개 재대조, 승인 가능한 작품만 개별 검토. 자동 일일 수집은 접근 조건 확인 후 결정.
