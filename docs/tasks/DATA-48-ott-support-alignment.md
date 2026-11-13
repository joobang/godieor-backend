# DATA-48 · 작업 기록 검산·지원 환경 검증·OTT 범위 정리

- 요구사항: PROD-004/005/007/009/010, 관련 GD-004/005/007/009/010. acceptance draft/승인 상태 변경 없음.
- 상태: 구현·자체검사 완료, 독립 검증/정책판정 인계 대기. 담당 codex-data48-01. 각 기존 checkout에서 순차 작업, 동시 구현 없음.
- 기준 app b17c884671fffbfb318ee4072d644836f81012c6 / backend 9f7e1b2783d937474194b46b4b72679cdbbee9c9 / verifier 93589d888ea454e421ba33620eda617b4c9e2132.
- 브랜치: 세 저장소 codex/data48-ott-support-alignment. 기존 app signing pbxproj, backend .env.example/package.json 및 미추적 감사 스크립트/테스트4개 보존.
- 원본 backend/docs/tasks/DATA-48-ott-support-alignment.md.
- 사용자 요청: 실제 작업·문서 작성이 적절한지 확인하고 다음 작업 진행. 범위/완료 조건: 문서 사본·커밋·고정 매핑과 실제 DB60건 재검산, 권장Node24의 커밋된 소스 검사, 다큐 지원의 제품/계약/앱 영향 확인. 미실행 검사를 성공으로 기록하지 않음.
- 발견한 범위 충돌: app/docs/product.md는 드라마 우선/예능 후속, 실제 코드·데이터는 영화/예능 지원. 다큐 정식 지원을 포함할지 사용자에게 비동기로 질문했고 이후 영화·시리즈·예능·다큐 지원 확정 응답을 받음. 답변 전 제품 범위/계약/DB를 확대하지 않았으며 이후 아래 사용자 확정에 따라 구현. 독립적인 기록·고정 소스 검사는 계속 진행.
- 예상 실패: working tree 검사를 clean HEAD 검사로 표현, 기존 dirty·개인 signing 유입, 후보 타입을 임의로 재분류, source/contract/migration digest 잘못 연결, 자체 로컬 검사를 독립 승인이나 통합PASS로 표현.

## 실제 검사

- 검증기 구현 보완: 기존 runner는 tests/*.test.cjs만 실행해 ESM tests/*.test.mjs를 누락했다. CJS/ESM을 명시적으로 함께 수집하고 테스트 없음·링크 파일은 오류 처리하도록 수정했다. 합성 CJS 성공+ESM 실패가 비정상 종료로 이어지는 실행 회귀와 누락/링크 검사를 추가했다.
- 검증 기준·verdict 집계·승인 상태를 바꾸지 않았다. 이 작업은 실행기 구현 보완이며 독립 승인과 구분한다. verifier/src/godieor_verifier/runner.py 및 tests/test_runner.py가 구현 원본이다.
- 공식 Node24 바이너리를 임시 폴더에 다운로드해 공식 SHASUMS256.txt와 일치 확인. 전역Node/사용자설정 변경 없음. Python3.9 extractall(filter=...) 미지원으로 최초 압축 해제 종료1 후, 확인한 공식 archive를 시스템tar로 해제했다. Node v24.22.3 확인.
- 검증기는 기존 정책의 고정 PostgreSQL digest를 유지한다. mutable tag로 대체하지 않으며 기존 개발DB를 검사DB로 사용하지 않는다.
- 실제 명령·결과는 아래 표 및 evidence/data48에 보존했다.

## 결정·학습

ADR: 016 계약 binding 정리, 017 다큐 형태와 분류. LEARN-0011(후보/게시 타입 경계), LEARN-0015(로컬 검증 범위) 관련, 승인 기록 변경 없음.

## 사용자 확정 후 추가 범위 · 2026-11-13

사용자가 ‘OTT 영화·시리즈·예능·다큐 지원으로 정리’를 선택했다. 제품 원본을 수정하고 다큐 영화/시리즈의 형태를 검토 입력에서 명시해 정규화·DB·API·iOS까지 연결한다. 애니는 여전히 후속이다. 다큐 타입을 기존 드라마/영화로 재분류해 게시하지 않으며, 실제 후보 게시와 지원 구현을 구분한다. 예상 실패: 다큐 영화에 시즌을 붙임, 형태가 없는 다큐를 추정, 비OTT에 다큐 분류 허용, 과거 migration 편집, 출처 근거 없이 신규 게시. 이번 신규 실데이터 게시는 0으로 유지한다.

## 최종 구현과 실제 실행 · 2026-11-13

- 검증기 CJS+ESM 수집 누락, 가상 데이터 smoke 환경 누락 수정. backend manifest 무결성과 실제 options 계약 버전 회귀 추가.
- 사용자 확정에 따라 product.md 수정, 다큐 검토에 documentaryFormat=movie|series 요구, 정규화/새 migration/API enum/참조DDL/iOS 다큐 표시 연결. 과거 migration 불변. 신규 실데이터 게시 0; 로컬 데이터60건·매핑62건 재검산.
- Node24 고정 소스 전체154/154는 이전 Node22 working-tree154와 우연히 같은 수이며 구성은 다르다. 이번은 신규계약3/다큐2 검사를 포함하고 기존 미추적 검사5개를 제외한다.

| 실제 명령 | 종료 | 관찰/근거 |
|---|---|---|
| /private/tmp/godieor-data48/node-v24.22.3-darwin-arm64/bin/node --env-file=.env scripts/audit-ott-published.mjs > /private/tmp/godieor-data48/audit/final-db.json | 0 | 11~12월KR4OTT60건. record-audit.json |
| 공식 Node24 archive SHA256 대조/해제 | 최초1→0 | Python3.9 filter 인자 오류 후 확인한 archive를 system tar로 해제; node-provenance.json |
| PYTHONPATH=src PATH=임시Node24:$PATH python3 -m unittest discover -s tests | 최초1→0 | 최초109중 fixture누락2실패를 수정, 최종109/109. verifier-self-test-final/smoke.log |
| 최초 fixed runner (기존 app b17c884/backend9f7e1b2) | 3 | 계약 manifest 실물 불일치로 준비 실패. /private/tmp/godieor-data48/runner.log |
| fixed runner v2 | 3 | 서버151 통과/iOS성공, DB smoke 가상입력 미활성 실패, secret 검사1탐지 |
| fixed runner v3 | 3 | smoke 수정 후 DB/API/iOS성공, secret1탐지·draft/SKIPPED/review대기 유지 |
| Node24 tsc 및 --test tests/reviewed-publish.test.cjs tests/contract-integrity.test.cjs | 0 | 다큐 오류경계 포함18/18. documentary-targeted.log |
| xcrun swiftc -module-cache-path /private/tmp/godieor-data48/swift-cache -parse-as-library ios/GODIEOR/PublicAPI.swift tests/DocumentaryChecks.swift -o /private/tmp/godieor-data48/documentary-check; 생성 바이너리 실행 | 0 | 합성 다큐 JSON실제 해석/표시/날짜보존 통과. iPhone관찰 아님 |
| python3 /private/tmp/godieor-data48/ddl-parity.py 및 ddl-parity-documentary.py | 0 | 이전8/8, 다큐추가후12/12. 일회용 reference/migrated schema 분류경계만 비교, 전체DDL동일성 주장없음. container정리 |
| fixed runner v4 | 3 | 다큐 추가후153/153/DB/API/iOS성공, secret 탐지 유지 |
| Node24 --test tests/contract-integrity.test.cjs (tsc 후) | 0 | 옵션버전 수정후3/3 |
| fixed runner v6 (전체인자 evidence/data48/runner-command.json) | 3 | 최종154/154, compile/migration/반복수집/API/iOS성공. secret1탐지/필수4항목SKIPPED, 최종ERROR |

## 남은 finding과 독립 검증 인계

secret-check는 backend src/collection/adapters/official-sources.ts:146의 `clientSecret = process.env.IGDB_CLIENT_SECRET` 런타임 참조를 credential-assignment로 탐지했다. 실제 literal 키가 아님을 작성자가 해당 source에서 확인했다. rule/예외/판정을 변경하지 않았으며 최종 FAIL을 보존한다. 민감값은 기록하지 않는다. 독립 소유자의 literal 규칙 검토 대상으로 인계한다. 기존 dirty .env.example은 snapshot/커밋에 포함하지 않았다.

전체 verdict는 ERROR다. filter-intersection/settings-roundtrip/provider-contract/ios-user-flow는 SKIPPED, review PENDING/acceptance draft, isolation_verified=false. same-account unsigned 빌드·합성 API 성공을 실기기/OS격리/세저장소제품PASS로 표현하지 않는다.

- app base/head: `b17c884671fffbfb318ee4072d644836f81012c6` / `4e64978050042079c4798c84898686149ac3133d`.
- backend base/head: `9f7e1b2783d937474194b46b4b72679cdbbee9c9` / `d0b5f6c38bcc1982e5551195f2b235b78095197c`.
- verifier: `1eaa7165a85920950c66c1f9dbe8e051dfb1c117`, 실행시 clean.
- 계약 `0.1.0-draft.4` / `96cc08536324f8b5a7c537783caa93a1ce33de533526032e01621282fb601122`.
- migration 집합 runner digest `853337eadc11cd3c8c619c9e53d961cb7eead5fe0a79368c5d167324598bb697` (manifest JSON 알고리즘; 과거 concatenated digest와 다름).
- acceptance `0.1.0-draft` / `c4906283810c8b378800b67930028685a41b6a051923ea9f9415346b2d657063`, 승인 변경 없음.

- 범위: local integration components, 작성자 실행. 전체 argv·step/log hash·binding·ERROR report는 evidence/data48. 원본 build/log는 /private/tmp/godieor-data48-fixed-run-v6. 문서만 갱신한 최종HEAD와 실제 검사한 위HEAD를 구분한다.
- 미실행: 독립 새 컨텍스트 리뷰, 실폰 최신 표시, 클라우드, live Google/설정왕복. 실제 개발 DB에 새 migration을 적용하거나 다큐 후보를 게시하지 않았다.
- 다음: secret literal 규칙의 독립 검토, 새 migration을 로컬DB에 적용한 뒤 캐런리드 공식 근거·명시적series 검토/매핑/게시/SQL·API재확인. 범위확정 응답은 받았으며 추가 제품결정 대기 없음. 다른OTT 공식 근거 확대·PAW정체성 검토도 남음.
- 공통 status/handoff 3개사본 및 OTT전용인계 갱신. 원본카드는backend. 최종커밋SHA는Git이력 참조(자기SHA미기재). 담당codex-data48-01해제.
- LEARN-0005/0011/0015 관련. 학습 주장은 검증기 ESM누락·계약binding·가상입력활성 문제의 실제 관측으로 보완. 독립승인·사용자이해도·측정없는성과 주장 없음.

- v5 exit3: 154/154, DB/API/iOS success, secret finding retained. v6 after OpenAPI Options version const correction: same checks repeated, exact final binding in evidence. contract-version-final.log 3/3.
