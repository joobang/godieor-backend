# DATA-34 한국 공식 일정과 TMDB 제공처 스냅샷 분리

- 상태: 구현·작성자 자체검사 완료, 독립 검증/실 DB 게시 미실행
- 담당: codex-context-01; branch: `codex/app-auth-phone-ready`; base: `3d10391`
- 관련 요구: 한국 OTT 공식 원천 + TMDB 보조 식별, 최초 공개 검증, 플랫폼별 독립 일정, 날짜만 있는 일정은 `date_only`.
- 변경 범위: `scripts/merge-official-tmdb-lineup.mjs`, 해당 회귀 테스트, 로컬 검토 staging 데이터.
- 예상 실패 사례: TMDB KR 제공처 스냅샷에 누락된 작품, 같은 날 동명 작품 중복 ID, 다른 나라 일정, 날짜·시즌 불일치, 가용일을 첫 공개일로 오인.

## 원인과 변경

Netflix 한국 공식 목록에 수록되고 TMDB 작품·시즌 날짜도 같은데, TMDB 최신 한국 시청 제공처 정보가 비어 있다는 이유만으로 분류가 차단되었다. 공식 한국 목록이 이미 한국 Netflix 제공 근거이므로 `krProviderMatched`를 종류/시즌 보강의 필수조건에서 제외했다. TMDB 작품 ID와 날짜, TV 시즌 첫날이 일치하고 후보 ID가 유일할 때만 종류·시즌을 보강한다. 첫 공개 승인 `premiereConfirmed`는 절대로 승격하지 않는다. 보강 결과에 TMDB 한국 제공처 불일치/미표시 분류 수를 별도 기록한다.

## 실데이터 실행과 검증 (2026-11-12)

- `node scripts/merge-official-tmdb-lineup.mjs data/lineups/netflix-kr-2026-11-12-auto.json /private/tmp/godieor-netflix-kr-tmdb-all.json /private/tmp/godieor-netflix-kr-merged-provider-fix-final.json`: 공식 한국 Netflix 75행 중 분류 **20→31** (+11), TMDB KR 제공처 미일치/미표시를 공식 목록 근거로 보강 11, 미분류 44, 자동 게시 가능 0.
- `node scripts/stage-ott-lineup.mjs /private/tmp/godieor-netflix-kr-merged-provider-fix-final.json work/ott-lineups`: 기존 검토 대기 169건 유지, 변경 31/신규 0. 동일 명령 재실행 결과 변경 0, unchanged 75, 저장 169.
- `npm test`: 122/122 PASS. 최초 실행은 backend 빌드 출력 삭제에 `EPERM`이 발생하여 승인된 로컬 권한으로 재실행 후 성공. 중간 회귀 테스트의 잘못된 기대값 1개를 수정한 후 전체 통과.
- StreamPick 11~12월 동등 범위 기존 기록은 신작 15건, 로컬 DB 실조회 마지막 기록 9건. 이 변경은 검토 staging만 업데이트했으므로 DB 건수 증가는 **0**. 현재 DB를 재조회하거나 출시 사실을 추가 검증한 것은 아니다.
- 원본 `.env.example`, `package.json`, 공통 `status.md`·`handoff.md`와 기존 미추적 감사 스크립트는 다른 작업의 미커밋 변경이므로 그대로 유지한다.

## 남은 작업

- 44개 미분류 및 StreamPick 신작 11개 중 공식 한국 최초 공개 근거가 없는 후보는 별도 조사가 필요하다. `오버액션 갱`의 날짜 11/04 vs 공식 한국 목록 11/05 충돌을 자동으로 수정하거나 승인하지 않는다.
- 실제 공식 최초 공개 확정·reviewed publish 후 DB 재조회와 동일 범위 신작 개수 비교; Disney+/TVING/Coupang 공식 일정 확대; 독립 검증·배포.
- LEARN-ID: 해당 없음(원천 보강 조건 수정, 별도 학습 문서 대상 기술 사고 아님).
