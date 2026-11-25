# OPS-03 · 정기 수집 누락과 운영 데이터 시각 점검

- 요구사항 GD-005 / PROD-005, GD-008 / PROD-008. 담당 `codex-context-ops03`, 운영 관측·로컬 도구 완료 후 담당 해제.
- 기준 backend dev `6fffa0d2e1f8da4d6a8cecc7c4494a683ae0a9c4`, main `b6677992cc2a7cfba69633266820d876ab2c298d`. 두 기준의 트리는 동일하다. 작업 브랜치 `codex/daily-schedule-20261125`, worktree `/private/tmp/godieor-ops03-work`.
- 예약 트리거 미생성, 지연, 작업 실패, 원천 일부 실패, 운영 API freshness 미갱신을 구분한다. 공개 API 조회 실패나 rate limit을 수집 누락으로 판정하지 않는다.
- 완료 조건은 실제 예약 실행과 운영 데이터를 조회해 기록하고, 같은 점검을 자격 증명 없이 반복할 수 있도록 운영 도구와 절차를 제공하는 것이다. 이 작업은 운영 데이터에 쓰지 않는다.

## 관측 결과

- [11/24 예약 실행](https://github.com/joobang/godieor-backend/actions/runs/45344612414)은 16:00:09 KST 생성, 예정 08:30 대비 7시간 30분 지연. 기본 브랜치 dev의 `6fffa0d`에서 성공했다. Git 트리는 배포 main `b667799`과 일치한다.
- job 138276070447의 OTT 보고서에 `published_with_discovery_gaps`가 남았다. 검토 일정 92건 게시 처리, Netflix 신규 검토 후보 14건. 쿠팡 공식 목록 `COUPANG_INDEX_HTTP_403` 직후 후속 수집이 `coupang_index_access_denied`로 생략됐다. TVING은 `TVING_UPCOMING_SCOPE_CHANGED`.
- 11/25 13:59 KST에 저장소 워크플로 상태가 active이고 당일 실행 기록 0건임을 확인했다. [GitHub 문서](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)는 지연 및 누락 가능성을 설명한다. 해당 날짜의 트리거가 아직 없는 개별 원인은 미확정이다.
- 운영 health는 `ok`·DB `connected`·`provider`. 공개 KR 달력의 마지막 성공 시각은 모두 11/24 KST로 영화 09:05, EPL 09:15, 게임(KR) 09:16, 검토 OTT 16:15였다. 배치 성공 여부와 신규 원천 커버리지를 따로 기록했다.

## 변경과 검사

- `scripts/check-daily-collection-status.mjs`와 운영 절차를 추가했다. 운영 GitHub/Render에 공개 GET 요청만 사용한다. 예약 시각·변수·수집/삭제 동작은 그대로다.
- Node 24.22.3의 `node --check scripts/check-daily-collection-status.mjs` 및 실제 운영 실행 성공. 초기 실행에서 로캘별 날짜 순서 오류를 발견해 `formatToParts`로 수정했다.
- 임시 fetch 대역으로 11/30 23:59:59 → 12/1 00:00 KST 경계의 GitHub 날짜 필터와 달력 월, 당일 수동 실행 표시, GitHub 403 시 exit 1을 확인했다.
- 앱 실행 기준 `bad2576eaf2907018219cd4f01d64d1b2e3d63b6`. 제품 코드·API 계약 0.1.0-draft.5 manifest `04cfea7456d83ca141ba64c6d6568365b00cbdf2d5e95eacd8c4dad7249a0f2e` 및 migration manifest `feeb684462340075302b9a05ff3102740f6fe7d87c667ea8c455752c1433ba1b` 변경 없음. verifier 기준 `bbe40f9a2a7057c608342f7ff76e9fccb01fb833`, acceptance 변경 및 독립 통합 runner 실행 없음.
- 새 LEARN-ID 해당 없음. 운영 상태 진단과 기존 공개 인터페이스 활용만 포함한다.
- 다음 확인은 11/25 예약 기록 또는 같은 날 수동 실행 여부 및 제공처별 freshness다. 운영 수동 실행·push·병합·배포 미실행. 실기기 찜 검증 대기.
