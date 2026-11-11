# DATA-18 · 한국 OTT 최초 공개 근거 추가 (2026-11-11)

- 담당: `codex-context-data18`, 구현 세션. 요구사항 PROD-005/007/009. 시작 기준 backend `2bba9dc`, app `4d7a702`(사용자 signing dirty 보존), verifier `24f7af3`; branch `codex/app-auth-phone-ready`.
- 범위: Disney+ 한국 서비스 페이지와 쿠팡플레이 뉴스룸에서 명확하게 식별되는 작품의 한국 최초 공개 후보 작성·staging, 검증 및 인계. 외부 배포/승인/API/마이그레이션 변경 없음.
- 완료 조건: 공식 근거 URL·국가·날짜(시각은 근거 있는 경우만)를 보존하고, staging 반복 입력이 중복 생성하지 않으며, 게시 여부를 명시한다.
- 예상 실패: Disney 글로벌 공개일만으로 한국 공개로 간주, 쿠팡 뉴스룸 보도일을 작품 공개일로 해석, 오후 5시를 시간대 없는 UTC timestamp로 변환, 기존 글로벌 미확인 후보를 자동으로 제품 게시, 인증 없는 이미지 URL을 포스터로 저장.
- LEARN-ID: 해당 없음. 기존 ADR-015의 공식 근거·수동 심사 정책을 재사용.

## 실행 기록

- 2026-11-11 공식 페이지 확인: Disney+ `https://www.disneyplus.com/ko-kr`의 `재혼 황후 시즌 1 11월 3일 스트리밍` 표시 및 Disney 11/03 최초 4화 공개 기사 대조. 쿠팡 2026-11-02 `https://news.coupang.com/archives/68074/`의 `스마일 클리닉` 12/03 오후 5시 첫 공개 확인. 시간대가 명시된 structured field는 없어 둘 다 `date_only` 후보로만 기록.
- 신규 자료 `data/lineups/disney-kr-2026-11-remarried-empress.json`, `data/lineups/coupang-kr-2026-12-smile-clinic.json`. 기존 Disney 글로벌 시장 미확인 후보는 증빙 이력으로 보존.
- 로컬 `node scripts/stage-ott-lineup.mjs` 각각 실행: 신규 1건+1건, 총 86→88개. 두 파일 각각 다시 실행 시 created=0, changed=0, unchanged=1. 첫 기본 sandbox 시도 `writer.lock` EPERM, 허용된 재실행 성공.
- **제품 게시 0건**. 현재 lineup staging과 `work/ott-candidates` 수동 검토·매핑 게시 사이의 자동 연결은 없으며, 임의로 후보를 승인/DB 게시하지 않았다. 기존 로컬 DB의 9건은 DATA-16 이력으로 이번 턴 재조회하지 않음.
- 잔여: 검토 후보 수동 등록·승인 범위 판단·게시와 실제 DB 조회, 한국 OTT 전수 수집 경로, 이미지 사용 조건, 클라우드 배포, 독립 verifier 검사. 이번 카드의 구현 검토는 독립 승인 아님.
