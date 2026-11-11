# DATA-24 · TMDB 메타데이터와 검토 완료 OTT 포스터 연결

- requirement: 한국 4개 OTT 실데이터의 카드용 포스터 연동; 한국 제공처의 최초 공개일과 TMDB 최초 작품 공개일은 혼동하지 않는다. 담당 codex-context-01, backend HEAD e00ec6e, branch codex/app-auth-phone-ready. app signing dirty 및 backend .env.example dirty 보존.
- 변경 범위: `scripts/enrich-reviewed-tmdb.mjs` 포스터 연결 검토/적용 CLI, `scripts/ingest-tmdb-catalog.mjs` 수집 트랜잭션 내 연동, package command 및 독립된 단위 테스트. 검토 완료 KR `ott_reviewed`와 제목 정규화·플랫폼·movie/TV 일치, TMDB ID 단일 매칭일 때만 null 포스터 갱신. event/날짜 생성·변경 없음.
- 예상 실패: 중복 제목을 다른 작품으로 연결, 다른 제공처 작품의 포스터 사용, 악의적 이미지 URL, DB 접속 권한/중복 실행, 기존 포스터 덮어쓰기. 전부 차단 또는 갱신 조건 검사.
- 관찰: `node --test tests/enrich-reviewed-tmdb.test.mjs` 3/3; `npm test` 86/86 (허용된 빌드 실행); `npm run enrich:reviewed-tmdb` dry_run eligible 2; `npm run enrich:reviewed-tmdb -- --apply` 실제 로컬 DB UPDATE 2, calendarEventsCreated 0. 이후 재실행 eligible 0. 수집기 자체의 외부 TMDB 재호출은 이번 작업에서 실행하지 않아 통합 검사는 미완료.
- 남은 일: 11~12월 KR 공식 최초 공개 후보를 수집해 별도 candidate review→mapping→publish 연결 및 게시 감사 재수행. TMDB 568개는 일반 카탈로그이며 검증 일정 568개가 아니다. 본 작업 신규 일정 게시 0; 로컬 기존 11건 중 11~12월 9건. 클라우드/실기기 및 독립 verifier 검증 미실행.
- API/마이그레이션/acceptance 불변. LEARN-ID 해당 없음(기존 데이터 파이프라인 구현 보완). Push·외부 배포 없음.
