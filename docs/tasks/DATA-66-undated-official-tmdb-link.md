# DATA-66 · 공식 작품 타이틀 TMDB 식별 및 통합 스테이징

- 요구사항: 공식 OTT 일정 수집→TMDB 작품/시즌 식별→한국 OTT 최초 공개일 검증→DB 게시, StreamPick 최초공개만 비교. 범위: Disney+/Coupang 공식 제목 수집, 날짜 미상 TMDB 식별, 파이프라인 연결. 예상 실패: 추천뉴스의 구작 혼입, 영문/한글 제목 차이, 예고 영상 카드, 검색 결과 중복·페이지 잘림, 한국 첫날과 TMDB 글로벌 일자 혼동.
- 변경: Disney+ 예정 페이지의 JSON 작품 카드와 Coupang 뉴스의 금주 추천작 기사 수집. `link-undated-official-tmdb.mjs`로 TMDB movie/tv 정확 제목 비교, 후보 0/1/복수, 조회 에러·검색 페이지 초과를 기록. 날짜 미상 수집은 수동 검토 전 DB에 게시하지 않는다. 파이프라인이 수집→후보저장→TMDB 연결→기존 검토 매핑 게시→첫공개 감사 순으로 실행한다.
- 실제 수집: Disney+ 18/쿠팡 41 = 59개 제목(스페셜 룩 제외 개선 전 원본). 실제 TMDB 조회 33 단일 힌트, 14 복수 힌트, 11 미발견, 1 페이지 초과. 33은 한국 플랫폼 최초일 확정도 시즌 확정도 아니다. 게시 증가0. 공식 일정/기사 표기에는 날짜 null이며 비디오 클립과 구작이 섞일 수 있어 최종 목표 최초공개 건수와 직접 비교하지 않는다.
- 검증: `node --test tests/disney-coupang-official.test.mjs tests/official-ott-pipeline.test.mjs tests/undated-official-tmdb.test.mjs` 11/11, `npm test` 260/260 (필터 후 최종 테스트 재확인 필요). `node --env-file=.env scripts/audit-current-first-premieres.mjs` 52 중 정확26, 날짜차이2, 미게시24, 예상 exit2.
- 아직 남은 핵심: 개별 작품/시즌 공식 한국 OTT 첫 공개일 자동 추출·공식 날짜와 TMDB 시즌 검증·새 검토 매핑 생성/게시, StreamPick 미게시 24 해소, 정기 예약 실행. 독립 verifier 검토/승인, 클라우드/실폰 실행 미실시. 앱 개인 `project.pbxproj` dirty 보존. 외부 참고 데이터는 검증 비교에만 활용.
- 학습 기록 LEARN-ID: 해당 없음(기존 TMDB 검색 및 OTT 적재 파이프라인 연결 확장). 승인 기준/판정, API 계약 및 DB 마이그레이션은 변경하지 않음.

- 통합 재실행: `--reuse-recent-tmdb`는 스냅샷 1시간 초과로 `TMDB_RECENT_SNAPSHOT_UNAVAILABLE` 중단. 캐시 재사용 없이 실제 재시도했으나 Netflix 수집 `NETFLIX_KR_COLLECT_FAILED: fetch failed`로 중단되어 이번 통합 DB 재게시와 새 종합 감사는 미완료. 별도 DB 감사 26/52는 성공.
