# OPS-05 · 극장 포스터 조회 실패 재시도와 진단

- GD-005 / PROD-005. 담당 `codex-context-ops05`, 구현 및 자체 검사 완료 후 담당 해제. 기준 `4f76ecd`, 운영 main `3f84982`, 브랜치 `codex/theatrical-poster-retry-20261125`.
- 운영 실행 45554119516에서 포스터 조회 1건이 실패, 45559021353 단독 재실행에서는 조회 실패 0건. 첫 실패의 원천 및 오류 유형은 기존 로그에 없어 미확정.
- 극장 포스터 조회의 일시 오류를 요청 단위에서 재시도하고, 최종 오류는 비밀 없이 공급자별로 집계한다. 수집 정책과 포스터 매칭 및 DB 갱신 조건은 유지한다.
- 예상 실패: 반복 5xx, 인증 거부, 긴 Retry-After, 잘못된 응답, 제목이나 토큰이 포함된 오류 원문 노출.

## 변경과 검사

- TMDB/KOBIS 요청은 12초 제한을 유지하고, 일시 HTTP 오류 및 일부 전송 오류를 최대 두 번 재시도한다. 서버의 `Retry-After` 날짜와 초를 해석하며, 30초를 초과하는 대기 지시는 해당 후보의 실패로 남긴다. 인증/접근 거부와 잘못된 JSON의 재시도는 생략한다.
- 요청이 끝내 실패하면 `lookupFailureCodes`에 제공처와 상태 또는 검증 오류만 집계한다. 쿼리·URL·응답 원문·비밀을 기록하지 않는다. 기존 매칭, 포스터 덮어쓰기 방지, DB 잠금, CI 실패 판단은 유지한다.
- Node 24.22.3 `node --test tests/theatrical-posters.test.mjs` 7/7, `npm test` 393/393, `git diff --check` 통과. 실제 운영 요청 없이 모의 503·429·504·401·403, 타임아웃, 잘못된 JSON, 긴 Retry-After 및 조회 오류 원문 비노출을 검사했다.
- 앱 운영 코드·API 0.1.0-draft.5 계약·마이그레이션·verifier acceptance 변경 없음. 독립 통합 runner, 운영 수집, 푸시·병합·배포 미실행. 다음은 변경 반영 후 운영 포스터 작업 로그 확인.
- 새 LEARN-ID 해당 없음. 제공처 오류 처리와 기존 수집 운영 문서 보완. 공통 revision SYNC-2026-11-25-OPS-05.

## 11/25 운영 배포

- [dev #36](https://github.com/joobang/godieor-backend/pull/36) CI 45561671594 성공 후 `5602f051bc195ffc77a650918ab8f0e4e503e189` 머지.
- 이전 스쿼시 이력의 충돌로 #37을 닫고, main 기준 릴리스 브랜치의 트리가 dev와 일치함을 확인했다. [main #38](https://github.com/joobang/godieor-backend/pull/38) CI 45562009406 성공 후 `97b1be6a3b9fff0dcddf4195603a4efad9afb891` 머지, main push CI 45562196835 성공.
- [Render 운영 배포](https://dashboard.render.com/web/srv-dbu0u7on74is73f3tpug/deploys/dep-dc385kojo6nc73ed43t0)에서 `97b1be6` Live 확인. 공개 health 및 KR 달력 HTTP 200, DB connected, provider 모드. 배포 이후 신규 예약과 포스터 작업 실행 확인은 후속.
