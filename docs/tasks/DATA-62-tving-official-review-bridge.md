# DATA-62 · TVING 공식 일정 → TMDB 식별 단서 → 게시 후보 저장소 연결

- 요구: 공식 OTT 일정의 작품과 TMDB 작품/시즌 근거를 로컬 검토·게시 저장소에 직접 연결한다. 비교 사이트를 입력 소스로 삼지 않는다.
- 범위: `collect-tving-upcoming.mjs`의 공식 TVING 프로그램별 수집 보고서 → `bridge-tving-upcoming.mjs` → 기존 `OttCandidatesRepository` → 기존 검토 매핑 → `publish-reviewed`.
- 구현: 후보 증거 스키마에 TVING을 추가하고, 프로그램별 공식 permalink·명시 공개일·TMDB 매칭·시즌을 저장한다. 같은 소스 재실행은 중복 생성하지 않고 이미 review한 후보의 revision은 건드리지 않는다. 불완전한 수집 배치와 신뢰할 수 없는 URL은 입력에서 차단한다.
- 경계: 공식 TVING 프로그램 공개일과 TMDB 시즌 최초 방영일이 같아도 한국 **OTT 최초 공개**를 자동 확정하지 않는다. review와 불변의 수동 content/event key가 있는 행만 기존 게시 서비스에서 DB로 반영한다. TVING Ads의 TVING/Wavve 혼합 카드는 직접 게시하지 않는다.
- 실제 명령: `node scripts/bridge-tving-upcoming.mjs docs/tasks/evidence/data55/upcoming-final.json work/ott-candidates` → sourceRows9, created5, revised0, preservedReviewed4, published0. 저장된 실제 공식 수집 보고서를 이용한 재생이며 당일 실시간 수집은 아님.
- `npm run build` 일반 sandbox 첫 시도: dist 삭제 EPERM, 승인된 실행에서 재시도 성공. Node24 전체 `node --test tests/*.test.mjs`: 169/169. `node --env-file=.env dist/src/cli/publish-reviewed.js --file data/curated/ott-reviewed-mappings.json`: 기존 review 매핑 70/70 게시 성공. 신규 5건은 미검토로 게시되지 않음. DB 개별행 SQL/API 및 StreamPick parity 재집계는 이번 작업에서 실행하지 않았다.
- 다음: 5개 후보 각각의 한국 OTT 최초 공개 증거와 TMDB 식별을 확정해 review·mapping을 추가한 뒤 재게시. Disney+/Coupang Play 공식 수집을 포함한 전체 무인 게시 파이프라인은 미완성.
- 검증 구분: backend 자체 테스트 및 로컬 DB publish만 실행; verifier 독립 승인·클라우드 배포 아님. 기존 dirty, API 계약, migration, 승인 기준 불변.
- ADR: 기존 검토·게시 게이트 준수, 새 기술 결정 없음. LEARN-ID: 해당 없음(후보 저장소 연결 구현).
