# DATA-16 넷플릭스 한국 공개 후보 검토·게시 (2026-11-11)

- 요구사항: PROD-005/007/009. 담당 `codex-context-data16` (구현 세션). 기준 backend `aef65ce`, app `3c1a7aa`, verifier `482d841`; branch `codex/app-auth-phone-ready`. 앱 개인 signing dirty 파일 보존.
- 범위: DATA-15 공식 기사 두 건을 기존 `work/ott-candidates` 수동 검토 및 `ott-reviewed-mappings.json` 게시 경로에 연결하고 로컬 DB 확인. 배포/계약/migration/독립 verifier 판단 변경 없음.
- 예상 실패: 기사 자체 작성 날짜를 공개일로 오인, 극장 개봉일과 OTT 공개일 혼동, 기존 후보 ID/키 중복, 공개 시각을 UTC 자정으로 조작, 기존 7개 mapping stale, DB 미접속.
- 근거: DATA-15의 한국 Netflix 뉴스룸 기사 2개 및 `data/lineups/netflix-kr-2026-11-*.json`. 기존 후보 96건 중 기사 URL이 일치하는 2건(기존 review null) 확인. reviewer `implementer-source-check`는 구현 담당의 근거 검토 기록이며 독립 승인 아님.
- LEARN-ID: 해당 없음(기존 ADR-015 수동 검토/게시 정책 적용).
- 실행: `npm run candidates -- review --file work/ott-candidates/data16-review-blue-road.json` 및 `data16-review-possible-love.json` 각각 성공. `npm run publish:reviewed -- --file data/curated/ott-reviewed-mappings.json` 성공(9건). 실제 로컬 PostgreSQL `event`+`event_source`+`event_service` SELECT: 총 `ott_reviewed` 9건, `푸른길` 2026-11-20/netflix/KR/`date_only`/`instant_at=NULL`, `가능한 사랑` 2026-11-06 동일 속성. `npm test` 75/75 통과.
- 코드: `data/curated/ott-reviewed-mappings.json`에 기존 7건을 유지하고 신규 `work-000008/event-000008`, `work-000009/event-000009` 고정 식별자 추가. DB 게시 중복 없도록 기존 후보 ID/revision 참조.
- 남은 문제: 후보 review 상태와 로컬 DB는 Git 제외; 클라우드·다른 장치 DB에 그대로 자동 반영되지 않는다. OTT 전체 공식 공개 일정과 포스터 완성은 미완료. 독립 검증/Render/Supabase/실폰 조회 미실행. 다음 작업 다른 OTT 플랫폼 공식 소스 확대 및 배포 준비. 담당 해제.
