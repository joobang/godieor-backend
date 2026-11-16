# DATA-67 · 공식 OTT 원천 실패 격리와 통합 DB 감사

- requirement: 한국 OTT 공식 일정 → TMDB → 첫 공개일 검증 → PostgreSQL 게시 → StreamPick 첫 공개 건수 비교. 상태: **부분 완료**, 전체 파이프라인/52건 parity는 미완료.
- base: backend `37131ae` (`codex/ott-animation-support`, clean), app `eda4ceb` (사용자 개인 Xcode project dirty), verifier `1af4848` (clean).
- 범위: `scripts/run-official-ott-pipeline.mjs`, 테스트, 공통 인계 문서. 실패 사례: Netflix fetch 실패가 TVING/Disney/Coupang 수집까지 중단; TMDB 최근 스냅샷 만료가 전체 배치 중단; 중단 후 DB 감사 불가능.
- 조치: TMDB changes·Netflix·TVING·TVING Ads·Disney+·Coupang 개별 원천 오류를 `failedSources` 및 `steps`로 기록. 실패 원천의 staging은 생략하고 다른 원천을 계속 처리. 최근 TMDB 스냅샷 미사용 가능 시 `discoveryComplete=false`로 표시하고, 이미 검토된 매핑은 게시/감사 가능. 중간 실패를 숨겨 전체 완료로 주장하지 않음.
- 공식 날짜를 증명하지 못한 작품·시즌은 신규 게시하지 않는다. StreamPick 데이터를 수집 입력으로 사용하지 않는다.

## 실행·관찰

| 명령 | 결과 |
| --- | --- |
| `node --test tests/official-ott-pipeline.test.mjs` | 7/7 PASS; Netflix 실패 및 TMDB 만료 복원 시나리오 포함 |
| `npm test` | 기본 sandbox `dist` unlink EPERM으로 중단 → 권한 승인 후 262/262 PASS |
| `node scripts/run-official-ott-pipeline.mjs` | 기본 sandbox 매핑 writer.lock EPERM; 권한 승인 후 TMDB 전수 수집 장시간 실행으로 중단(완료 결과 없음) |
| `node scripts/run-official-ott-pipeline.mjs --reuse-recent-tmdb` | 권한 승인 후 exit 2, 실제 소스 수집/검토 게시/DB 감사까지 완주. TMDB 1시간 캐시 만료는 명시적 미완료 |

- 실제 수집: Netflix 78건(5/5 페이지), TVING 11건, TVING Ads 6건, Disney+ 16건, Coupang Play 41건. 날짜 미상 공식작 TMDB identity hints 33/57, 복수14·미발견9·검색불완전1. **새 한국 첫 공개 확정 0건**.
- 로컬 DB `ott_reviewed` 기존 70건 게시 성공, 신규 검토 매핑 0건. StreamPick 첫 공개 52행 중 **정확 26 / 날짜 이견 2 / 미게시 24**, parity false. 이견 2건은 기존 한국 공식일 유지.
- TMDB Changes 20,461 변경 ID 관측. 전수 release 후보 재생성은 이번 실행에서 완료하지 못했으며 오래된 1시간 스냅샷을 최신으로 위장하지 않았다.
- 핵심 잔여 작업: 24개 미게시 항목의 한국 OTT 첫날 근거와 정확한 TMDB 시즌 식별을 실제 자동 수집/매칭에서 확보, 새 매핑 게시 후 52행 재검증. 배치 실행 단계별 시간 제한/진행 로그, 정기 실행 및 독립 검증도 미완료.
- API 계약·Prisma migration·verifier acceptance/verdict 변경 없음. 독립 runner/클라우드/실폰 검증 미실행. LEARN-ID: 해당 없음(기존 원천 수집 실행기의 실패 격리 수정).
