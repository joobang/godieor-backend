# DATA-03 · 영화·게임·EPL 공식 검토 일정 적재

- 요구사항: PROD-005/006/007/008/009; 독립 승인 기준은 verifier 원본 그대로.
- 상태: 수집기 구현·자체 검사 완료, 공식 원천 검토/실데이터 적재 대기. 담당: 해제.
- 기준: backend d4514ae / codex/app-auth-phone-ready / clean; app 3f93ffa / same branch / 기존 pbxproj dirty 보존.
- 변경 범위: 공식 출처 수동 검토 JSON → 범주별 고정 키 → 기존 CollectionRepository 적재. 외부 가입/배포/API 계약·DB migration 변경 없음.
- 기대: 출처·검토 근거 없는 일정은 적재 불가, 날짜 미정은 달력 제외, 영화·게임·EPL 데이터를 기존 API로 제공.
- 예상 실패: 추정 날짜, 가상→실제 오표기, URL 위조, stable key가 다른 작품/팀으로 변경, 잘못된 입력 일부 반영, 다른 범주 섞임.
- 결정: 기존 ADR/수집 DB 경계 재사용; LEARN-ID 없음(기존 패턴 적용).

## 검증/인계

- `npm run build` 및 `node --test tests/reviewed-catalog.test.cjs` 성공 (5/5). 기본 sandbox 빌드는 기존 dist unlink EPERM으로 실패했고, 허용 빌드에서 재실행 성공.
- `node --test tests/*.test.cjs` 성공 (58/58). `tsc --noEmit -p tsconfig.json`, `git diff --check` 성공.
- `npm run publish:catalog -- --file /absolute/path/review.json`은 완성된 파일 전체를 검토한 뒤 DB에 등록한다. 배포 및 실제 공식 입력은 **미실행**. `record`는 `src/collection/domain/provider-record.ts`의 정확한 Canonical 형식, `reviewedBy`/`reviewedAt`/`evidence`를 필수로 한다. 최상위 `version:1`, `category:movie|game|epl`, `market:KR|US|GB|JP`, `records:[...]`.
- sourceUrl은 쿼리 없는 HTTPS 공식 근거를 사용하고 근거 문장에 지역·플랫폼·확정 일정을 기록한다. URL 문법 검사만으로 공식성/날짜의 진실성을 검증한 것은 아니다. 리뷰어가 원문을 직접 확인해야 한다.
- 같은 stable event key의 작품/팀/시장/종류 재배정을 차단. 같은 작품의 서로 다른 지역·플랫폼·형태·시각은 별도 variantKey로 입력한다. 미정일은 unknown precision으로 보존한다.
- 다음 작업: 영화 배급사 공식 개봉표, 게임 퍼블리셔 공식 발표, EPL 공식 경기표를 날짜·시장·키와 함께 수동 검토하여 JSON 입력 작성→로컬 DB 소량 적재→공개 API 조회·중복 재적재 검증. 그 다음 사용자 요청 범위에서 Render+Supabase 배포.
- 테스트는 모두 합성 입력이며 현재 영화/게임/EPL 실데이터는 아직 미적재. 실제 DB end-to-end/독립 승인/제품 통합 PASS 미실행, verifier 기준 변경 없음.
