# DATA-10 · OTT 공개 목록 수집 단계 전환

- requirement: PROD-005/007/009; 국가·플랫폼별 날짜 근거 유지. acceptance 변경 없음.
- 담당: codex-ott-lineup-10 (종료 후 해제). 상태: 1단계 완료, 자동 실제 목록 수집 미완료.
- 기준: backend `319339339eadcf02d6f47b10aa401eb505be0576` / `codex/app-auth-phone-ready` clean; app `d471feebd94c4bf1b406b54227e1883f791d4233` / 개인 Xcode signing 파일 dirty 보존; verifier `3821922` (기존 확인), 별도 수정 없음.
- 범위: ADR-015, 다작품 공개 목록을 후보로 변환하는 CLI, 독립된 합성 회귀 검사, 안내 문서. API·DB migration·verifier 승인 불변.
- 예상 실패: 영문 글로벌 서비스 편입 날짜의 한국 최초 공개 오인; 한 목록의 여러 작품을 하나로 합침; 중복·잘못된 날짜; 기사 숫자를 OTT 건수로 보고; 이미지 출처/재사용 권한 누락.

## 구현 및 자체 검사

`node scripts/prepare-ott-lineup.mjs input.json output.json`으로 수동 확인된 작품 목록을 JSON 후보로 준비. 입력 필드: `platform`, `sourceUrl`, `observedAt`, `items[]`의 `title`, `date` (nullable), `market` (nullable), `contentKind`, `seasonNumber` (nullable), `premiereConfirmed` (boolean), `evidence`, `imageUrl` (optional). 출력은 `needs_manual_review`, `published=false`, `date_only` 또는 `unknown`이고 자동 게시하지 않는다. 출력 경로는 새로운 파일이어야 하며 덮어쓰지 않는다.

- `node --test tests/ott-lineup.test.mjs`: 3/3 성공. `npm test`: build 및 66/66 통과(ESM 후보 테스트를 기본 스위트에 추가). 합성 입력에서 국가 미확인, 날짜/중복/host 검증.
- 실제 서비스 HTML·수집/DB 갱신/스케줄·이미지 파일 다운로드: 미실행. 현재 게시 OTT 7건 유지.
- LEARN-ID: 해당 없음(데이터 소스 선택 ADR-015에 의사결정 기록), 외부 reviewer PASS 아님.

## 다음 단계

1. 서비스별 공식 공개 목록 사이트 실응답·robots·약관·지역 범위를 확인해 접근 가능한 사이트 전용 어댑터 작성.
2. 특히 TVING Ads 작품/장르/출시 날짜 추출과 Netflix 월간 목록 다작품 파싱을 먼저 검증. 수집 근거를 샘플로 두고 동작/누락률을 측정.
3. 수집 후보→사람 검토→기존 reviewed publish 연결. 이미지 원본/라이선스 검토 후 TMDB 등 작품 메타데이터 매칭.
4. 실제 적재·재실행·DB 건수·KST 날짜 검증 후 1일 1회 예약·Render/Supabase 배포.

backend 정책 승인·앱/계약/마이그레이션/verifier verdict 변동 없음. 다음 담당은 본 카드와 ADR-015 참조.

## DATA-11 · 작품별 후보 staging (2026-11-11)

- requirement: PROD-005/007/009. 담당 codex-ott-lineup-11 (완료·해제). 기준 backend 3048d08, app 4e9ffcc, verifier 5407595. 브랜치 codex/app-auth-phone-ready.
- `stage-ott-lineup.mjs` 추가: 수동 확인 공식 목록의 작품별 후보를 `work/ott-lineups/state.json`에 영속 저장. 재실행 중복 방지, 변경 revision 증가 및 review 무효화, 잠금과 원자 교체, 기존 상태 및 입력 배치 선검사. 제품 DB 게시 없음(`published=0`). `stage:ott-lineup` npm 명령 추가.
- 예상 오류: 글로벌 공개 날짜를 국내 최초 공개일로 오인, 손상된 기존 상태, 중복 ID, 변경 중 부분 저장. 확인되지 않은 공개일·이미지는 사람 검토 전 게시 금지.
- 실제 검사: `node --test tests/ott-lineup.test.mjs` 7/7 성공, `npm test` 빌드 및 70/70 성공(최초 기본 sandbox에서 dist unlink EPERM, 권한 허용 후 성공), `git diff --check` 성공.
- 미실행: 공식 HTML 자동 수집, 실제 서비스 DB 적재, 포스터 다운로드, 독립 verifier 검사. 다음은 Netflix/TVING 공식 목록 구조와 robots/이용 조건 실측 후 소스별 어댑터 구현 및 staging→검토→게시 연결.
- LEARN-ID: 해당 없음. ADR-015에 연계된 예방 설계이며 실제 장애 측정이나 독립 검증 결과가 아님.
