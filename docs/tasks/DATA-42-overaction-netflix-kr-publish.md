# DATA-42 · 오버액션 갱 Netflix KR 날짜 게시 및 잔여 TMDB 세 작품 확인

- 요구사항: PROD-005/007/009. 상태: 로컬 게시 완료, 독립 검증 대기.
- 기준: backend 049b519 (`codex/app-auth-phone-ready`), app 10bbb24, verifier 62e137b (기록 시점); 기존 dirty 보존.
- 작업 범위: 사용자 확정 Netflix KR 공개일 2026-11-05 수동 검토/매핑/로컬 게시. StreamPick은 발견·차이 비교 참고로만 사용. TMDB의 날짜와 OTT 한국 공개일의 의미 구분.
- 예상 실패: TMDB 글로벌 영화 개봉일 11/04로 한국 Netflix 11/05를 덮어쓰기; 방송사 첫방 날짜를 Netflix/TVING 첫 제공일로 간주; 같은 작품의 플랫폼별 이벤트 병합.

## 날짜와 검토 결과

- 오버액션 갱: Netflix 한국 공식 신규 공개 목록 `https://about.netflix.com/ko/new-to-watch` 2026-11-05, 한국 작품 페이지 `https://www.netflix.com/kr/title/81993326`. TMDB `movie/1630420`의 `release_date=2026-11-04`와 날짜 의미가 다름. 사용자가 Netflix KR 11/05 게시를 확정.
- 후보 `f70b9315f8dd07b2952a26e3b3c3285cf204b3b72a1acd7a0ebe777e8b2e2a94`, revision `066dec6a797a231787eb7dce22e953a4cd41f383dfba68027c4240861433b064`; reviewed 기록에서 `movie`, `market=KR`, `platform=netflix`, `date=2026-11-05`, `date_only`, 시즌 미지정을 사용. `work-000019` / `event-000019`로 매핑.
- TMDB API 감사 스냅샷 `/private/tmp/streampick-tmdb-11-audit.json`에는 나머지 세 작품의 날짜가 모두 존재:

| 작품 | TMDB | first_air_date | season 1 air_date | 첫 에피소드 | KR watch provider 힌트 |
| --- | --- | --- | --- | --- | --- |
| 전지적 집착 시점 | tv/340126 | 2026-11-08 | 2026-11-08 | 2026-11-08 | wavve, TVING |
| 문무 | tv/301354 | 2026-11-14 | 2026-11-14 | 2026-11-14 | wavve (Netflix 없음) |
| 나인 투 식스 | tv/310209 | 2026-11-25 | 2026-11-25 | 2026-11-25 | 제공처 없음 |

- 위 날짜는 시리즈/시즌/회차 방송 날짜다. 전지적 집착 시점은 MBC 예능, 문무는 KBS2, 나인 투 식스는 SBS 방송이므로 이 필드만으로 특정 한국 OTT의 최초 공개를 확정하지 않는다. 제공처 필드는 조사 당시 TMDB 스냅샷으로 최신 또는 향후 가용성을 보증하지 않는다.

## 실행 및 결과

- `node dist/src/cli/collect-candidates.js review --file /private/tmp/godieor-overaction-review.json` (Node22.23.4): 권한 승격 환경 exit 0, `reviewed=true`; 일반 sandbox 실행은 `후보 명령 실패`(기록 파일 쓰기 제한).
- `node --env-file=.env dist/src/cli/publish-reviewed.js --file data/curated/ott-reviewed-mappings.json` (Node22.23.4): 로컬 DB exit 0, `ott_reviewed published=19`.
- `node --env-file=.env scripts/audit-ott-published.mjs data/reference/streampick-2026-11-12-gap11.json`: 로컬 11~12월 reviewed 이벤트 **17건**, 참고 11행 중 7 정확 일치, 1 날짜 차이(오버액션 갱: 11/04 vs KR 11/05), 3 미게시.
- `node --test tests/reviewed-publish.test.cjs tests/ott-gap-provenance.test.mjs tests/tmdb-season-audit.test.mjs` (Node22.23.4): 20/20 통과. `git diff --check` 성공. 이 회차 전체 npm test/독립 verifier 미실행.
- 클라우드 배포 및 실제 iPhone 앱 반영 미실행. API 계약/마이그레이션 수정 없음.

## 인계

- 나머지 3건은 공식 TVING/Netflix 한국 작품·시즌별 실제 첫 제공일을 확인하고 별도로 리뷰·게시. StreamPick 숫자를 목표값으로 강제하지 않음.
- 기존 dirty (`.env.example`, `package.json`, `docs/system/{status,handoff}.md`, 감사 스크립트·테스트) 및 app signing 설정 보존. 작업 카드 원본은 backend.
- 관련 LEARN-ID/ADR 없음: 기존 플랫폼별 검토/게시 규칙을 개별 근거에 적용한 작업.
