# CI-03 · PR 실행 증거

- 요구 PROD-009/010, GD-009/010. backend 기준 81ef062, 문서 PR #1 ec8e3d4.
- 작업 codex/backend-pr-gate, 별도 worktree. 재현 가능한 임시 DB·API 검사를 기존 필수 Backend CI에 연결하고 PR 검사 화면에 실행 근거를 남긴다.
- 예상 실패: DB 이미지 준비 실패, migration/API 실패가 검사 성공으로 가려짐, 실행되지 않은 검증을 성공으로 표시, 운영 비밀의 산출물 노출.
- 독립 검증은 verifier가 소유하는 고정 SHA 증거의 연결을 별도로 준비한다. 합성 데이터 CI의 실행을 독립 판정으로 대체하지 않는다. 관련 학습 LEARN-0015.

- 기존 필수 job 이름 test 유지. 검증 증거는 PR의 Backend CI 실행 화면에 연결한다. PostgreSQL은 compose의 고정 digest를 가져오고, 새 임시 컨테이너에서 migration, 반복 적재, HTTP 응답, 계정 경계 등을 확인한다.
- 로컬 Node 24.22.3 npm ci --offline 성공. npm test 360/360, 실제 고정 이미지 일회용 DB의 check-refactor-db.cjs 성공 및 컨테이너 제거 확인. 합성 입력만 사용. pg 동시 query의 폐기 예정 경고 1건.
- 별도 컨텍스트 리뷰를 요청했으나 에이전트 사용 한도로 종료됐다. 독립 리뷰 통과로 기록하지 않는다.
- GitHub의 Backend CI 자체 검사와 별도 verifier의 전체 제품 판정을 구분한다. verifier 근거를 PR에 붙일 때는 대상 backend head를 대조한다.

## 고정 PR 확인 및 후속

- backend PR #1 head 06464d168f1fac295a895e651737d32e7cf0fdd1. GitHub Actions 44244618154에서 필수 test, DB·HTTP 단계 및 Job summary 성공. 원격 반영은 PR 브랜치이며 main 병합 전이다.
- 앱 기준 b89cc9009c4f8293c2d623a6c66f9702ae8ea8a8 → 67c82d817da1b415d922b978f6e958688464c5e8(계약 지문 동기화). 백엔드 기준 81ef06241b17faffded8e37e4cfc24efbac4f026. 독립 실행 verifier f6d9cac18c39ec3dc1130028fe30adebd05ab968. 계약 0.1.0-draft.5 SHA256 04cfea7456d83ca141ba64c6d6568365b00cbdf2d5e95eacd8c4dad7249a0f2e, verifier 방식 migration digest 42720323047810c6f6ad236f00360f0ef14161d0a5d071d37314b507a2687693.
- 독립 runner: 첫 준비는 앱/backend 지문 불일치로 실패. 앱과 verifier의 계약 참조를 고정 backend와 동기화했다. 해시가 달라진 계약 파일은 DB 참조 DDL 1개이며 OpenAPI는 일치했다. 초기 의존성 준비 재시도에서 오프라인 Prisma 엔진 다운로드가 실패했으므로 기존 --fetch-dependencies를 사용했다.
- 최종 독립 실행 /private/tmp/godieor-ci03-net-06464d1, exit 3 / ERROR. iOS unsigned build, event-identity, 자체 검사, migration, DB smoke 성공. time-semantics HTTP 400, secret-check 실패(탐지 11건, 값 미출력), filter/settings/provider/iOS 흐름 SKIPPED. 시간 검사에 제품 하한 이전 2026-03-29 조회가 남아 있어 현행 범위와 비교가 필요하다. 기준/판정 승인 조작 없음.
- PR 본문에 원격 CI와 위 고정 실행의 안전한 요약을 실제 첨부하고 head/subject를 재확인했다. verifier 자체 109개 성공. PR 첨부 명령은 head 불일치 거부 및 일치 시 제한된 본문 전송 동작을 합성 응답으로 확인했다. 이번 실제 첨부는 기존 GitHub 연결을 사용했다. CLI로 반복 게시하려면 별도 실행자의 PR 작성 토큰이 필요하다.
- 운영 적재 없음. 다음은 PR 승인/병합, 시간 검사의 조회 창과 비밀 검사 탐지 근거를 verifier 소유 경계에서 확인한다. 담당 해제.

## 병합 후 확인

사용자 요청으로 PR #1의 SHA 06464d1을 9f218b952e43da90f639c67e4bbdc1a895052a64로 병합했다. Actions 44245768636 완료 및 필수 test·DB/API·요약 단계 성공 확인. 검증 양식은 main에 저장했다. GitHub 자동 삽입은 기본 브랜치 dev에 양식이 있을 때에 실행되며 기본 브랜치 전환은 이번 범위에 포함하지 않았다. local main의 verifier 첨부 명령으로 기존 정확한 PR head의 요약을 재생성했다. 운영 적재 미실행, 독립 ERROR 유지.
