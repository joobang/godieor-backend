# DATA-88 · OTT 포스터 보강

- 요구사항: 검토된 KR OTT 작품에 검증된 포스터를 연결한다. 기존 공개일·이벤트 ID·API 계약을 유지한다.
- 기준: backend origin/dev 66cd353, app origin/dev 8190114. 담당 codex/ott-poster-enrichment-20261118. verifier 승인 없음.
- 구현: scripts/enrich-ott-posters.mjs는 기존 ott_reviewed 콘텐츠 중 포스터가 없는 작품에 대해 TMDB 제목·종류·국내 서비스가 유일하게 일치하는 포스터만 채운다. 자동 일간 수집 이후 별도 보강을 수행하고 일부 조회 실패는 별도 경고한다.
- 실제 DB 2026-11-18: 반영 전 검토된 OTT 94건 중 포스터2. TMDB dry-run 누락92, 적격42, 조회 실패0. `--apply` 42건 갱신, 반영 후 44/94. 남은50건은 매칭 근거 부족으로 비워 둔다. 신규 이벤트·일정 변경 없음.
- 검사: 단위3/3. 전체 npm test는 sandbox의 로컬 listen EPERM 때문에 최초 357/358이었으며 접근 허용 후 364/364 통과. 실제 운영 DB의 카운트 재검증. 원격 Actions의 다음 자동 갱신 및 독립 verifier 미실행.
- 인계: 앱 APP-POSTER-20261118과 연결. 계약/migration 불변, LEARN-0021 메타데이터 검증 원칙 참고.
