# DATA-84 · StreamPick/TMDB 교차조회 임시 일정 적재 (2026-11-17)

- 요구: PROD-005/006/007/009, GD-005/006/007/009. StreamPick 참조 중 TMDB 동일 작품/시즌/날짜 확인 21건 + 사용자 승인 `나인투식스` 1건을 KR OTT 캘린더에 임시 적재.
- 예상 실패: 시리즈 단위 제공처를 해당 시즌의 한국 최초 공개로 오인, TMDB에 없는 시즌 저장, 동일 데이터를 다시 적재해 ID/찜/이력이 분기, 공식 적재와 추후 중복.
- 원천 매니페스트: `data/fallback/streampick-tmdb-20261117.json`. 7건은 TMDB 시즌 단위 KR 제공처 단서, 14건은 시리즈 단위 KR 제공처 단서, 1건(나인투식스)은 TMDB 시즌/날짜만 있으며 한국 Netflix 제공처 미확인. 모두 `officialKoreanPremiereConfirmed: false`. 제3자 StreamPick과 TMDB의 역추적 단서이며 **공식 한국 첫 공개 검증 0건**.
- 제외: 네모바지 스폰지밥 S20(조회 가능한 S18까지), 몰몬교 주부들의 은밀한 사생활 S6(조회 가능한 S5까지). S18 스폰지밥 11/27 Netflix 후보는 별개의 21건 중 하나.
- 실행: `node --env-file=.env scripts/publish-streampick-fallback.mjs`는 확인만; `--publish`가 실제 로컬 DB에 게시. 백엔드 `dist` 빌드 결과가 필요. 전용 provider `ott_fallback`과 결정적 외부 ID로 기존 `ott_reviewed`에 공식 검증됐다고 속이지 않는다.
- 실제 로컬 DB 1차 게시: 32,695 → 32,717 (+22), 날짜/시즌/플랫폼/원천 binding 22/22. 동일 명령 재실행 32,717 → 32,717 (+0), binding 22/22. 기존 source 및 사용자 참조 삭제 없음. 로컬 DB만 실행; Supabase/배포 미실행.
- **주의**: 현 API는 source provenance 또는 `verification`을 응답에 표시하지 않으므로 화면에서는 확정된 공개 일정과 구분되지 않을 수 있다. 한국 플랫폼 실제 공개일이 검증되기 전에는 제품 전체 데이터 100% 또는 공식 검증으로 선언할 수 없다. 추후 공식 게시 전 원천 binding/찜을 보존한 승격·중복 병합 경로와 사용자 화면의 임시 표시가 필요하다.
- 관련 학습: LEARN-0021(OTT 최초 공개 증거).
- 검증: Node24 `node --check` 통과, JSON 파싱 통과, 전체 `npm test` 342/343 통과. 실패 1건 `tests/official-ott-pipeline.test.mjs`의 `TMDB_REPORT_WRONG_WINDOW` 기대는 작업 디렉터리에 이미 갱신된 10~12월 TMDB 전체 스냅샷과 불일치한다. fallback 코드 테스트 실패로 판정하지 않으며 스냅샷 가정은 별도 시정 필요.
