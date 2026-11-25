# OPS-04 · 일일 수집 예약 지연과 Mac 빌드 복구

- 요구사항 GD-005 / PROD-005, GD-008 / PROD-008. 담당 `codex-context-ops04`, 구현·검사 완료 후 담당 해제.
- backend 기준 `abb99de`, 운영 수집 기준 dev `6fffa0d`·main `b667799`. 작업 트리 `/private/tmp/godieor-ops03-work`.
- Mac 예약 작업의 기존 로컬 체크아웃을 빌드해 누락된 모듈을 복구한다. GitHub Actions는 독립된 두 번째 예약 기회를 추가하고 기존 DB 쓰기 설정과 동시성 잠금을 사용한다.
- 실패 사례: 정규 배치가 늦게 도착, 이미 성공한 날의 중복 실행, 직전 배치 실패·건너뜀, API 조회 실패 시 판정 불능, Mac 등록 시 빌드 일부 누락.
- 완료 조건: 로컬 예약 진입점의 필수 모듈을 실제 로드하고, 예약 실행 결정 및 설치 전 검사를 검증한다.

## 원인과 변경

- 11/25 Mac 제공처 08:30 및 OTT 09:00 LaunchAgent는 시작했으나 공통 산출물 `dist/src/common/collection-diagnostic.js`가 없어 `ERR_MODULE_NOT_FOUND`로 끝났다. 둘이 사용하는 실제 체크아웃에서 Node 24.22.3으로 `npm run build`를 실행해 복원했다. 활성 plist를 교체하거나 DB 수집을 실행하지 않았다.
- 두 등록 도구가 필수 산출물을 확인한 뒤 LaunchAgent를 변경하도록 했다. 장래에 작업 디렉터리의 빌드 산출물을 지웠다면 재빌드가 필요하다.
- GitHub 예약은 11/25 14:23 KST까지 기록이 없었다. 08:30 KST 예약에 12:17 KST 예약을 추가했다. 같은 워크플로 동시성 그룹에서 서울 당일의 성공한 예약이 있으면 다음 예약은 수집을 생략한다. 확인 실패는 오류로 처리한다. 수동 실행과 기존 DB 쓰기 활성화 변수, 수집/삭제 정책은 기존대로다. GitHub 스케줄러 내부 지연 원인은 확인되지 않았다.

## 검사

- 설치된 Mac 작업의 경로에서 `npm run build`, 제공처·OTT 진입점과 OTT 파이프라인 모듈 import 성공. 실제 DB 수집은 미실행.
- 새 예약 판별 검사 3/3. 성공·실패·건너뜀·HTTP 오류·서울 월 교체 경계를 시험했다. 실제 GitHub REST의 필터가 11/24 성공 실행을 반환했다.
- workflow YAML 로드 및 두 cron 확인, 생성 plist 두 개 `plutil -lint` 통과. 임시 미빌드 checkout에서 두 설치 도구가 등록 전 누락된 공통 모듈을 발견하는 것을 확인했다.
- 자체 `npm test` 390/390. 기본 샌드박스에서는 localhost listen EPERM이 발생해 localhost 허용 환경에서 재실행했다. 빌드에만 합성 DATABASE_URL을 사용했다.
- 앱 운영 기준 `bad2576eaf2907018219cd4f01d64d1b2e3d63b6`. API 0.1.0-draft.5 manifest `04cfea7456d83ca141ba64c6d6568365b00cbdf2d5e95eacd8c4dad7249a0f2e`, migration manifest `feeb684462340075302b9a05ff3102740f6fe7d87c667ea8c455752c1433ba1b` 변경 없음. 독립 runner·verifier acceptance 변경 없음.
- 새 LEARN-ID 해당 없음. 예약·도구 복구에 한정. 공통 revision SYNC-2026-11-25-OPS-04. 다음은 변경 배포 후 자연 예약 및 API freshness 확인. 이번 작업에서 푸시·병합·배포·운영 재수집 미실행.
