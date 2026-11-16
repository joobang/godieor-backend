# DATA-64 · TVING Ads 공식 일정 파이프라인 연결

- 요구사항: TMDB 대량 발견 → OTT 공식 보충 → 한국 시즌 최초 공개 증거 → 검토 완료 DB 게시 → StreamPick 52행 비교. 일반 후속 회차 제외, 제3자 참조 날짜는 게시 입력으로 사용하지 않음.
- 변경 범위: `scripts/run-official-ott-pipeline.mjs`에서 기존 독립 `collect-tvingads-kr-lineup.mjs`와 `stage-ott-lineup.mjs`를 순차 호출한다. 공식 TVING/Wavve 통합 일정은 후보로만 저장하고 TVING 단독 KR 최초 공개 근거로 자동 승인하지 않는다.
- 예상 실패 사례: Ads HTTP 오류/포맷 변경 시 부분 staging, 기존 reviewed 게시 중단, 통합 플랫폼 목록을 TVING 독점 공개라고 오인. 수집 exit 1은 커버리지 미완료로 기록하며 Ads staging은 건너뛰고 기존 reviewed DB 게이트는 보존한다.
- 2026-11-16 실제 네트워크 실행(`--reuse-recent-tmdb`): Netflix 78, TVING 공식 11, TVING Ads 6, Ads staging 기존 185건 중 6건 갱신. 기존 reviewed mapping 70 게시 성공, 신규 0. StreamPick 기존 저장된 최초공개 52행과 비교 정확26, 공식 날짜와 차이2, 미게시24. TMDB 1215행의 40분 전 유효 스냅샷 재사용, discoveryComplete=false. 즉 성공 기준인 실제 게시 증가·동등성 달성하지 못함.
- Node 테스트 `node --test tests/*.test.mjs`: 179/179 통과. 첫 비승격 실실행 Netflix `fetch failed` 이후 승격 네트워크에서 실행 성공. 새 TMDB 수집 첫 시도는 이전 고아 `writer.lock`으로 실패; `lsof` 보유 없음 확인 후 권한 승격하여 잠금 제거, 재실행 별도 진행.
- 남은 필수: Disney+/Coupang Play 독립 최신 공식 일정 수집기, 신규 TMDB 공식 바인딩 자동 형성, 한국 최초 OTT 공개 검증 및 새로운 verified 리뷰/매핑, 클라우드 주기 실행, DB 게시 수 증가 입증. 독립 검증·verdict·승인 기준/계약 변경 없음.
- LEARN-ID: 해당 없음(기존 공식 Ads 수집기를 오케스트레이터에 연결한 실행 작업).
