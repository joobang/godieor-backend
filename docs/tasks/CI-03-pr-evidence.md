# CI-03 · PR 실행 증거

- 요구 PROD-009/010, GD-009/010. backend 기준 81ef062, 문서 PR #1 ec8e3d4.
- 작업 codex/backend-pr-gate, 별도 worktree. 재현 가능한 임시 DB·API 검사를 기존 필수 Backend CI에 연결하고 PR 검사 화면에 실행 근거를 남긴다.
- 예상 실패: DB 이미지 준비 실패, migration/API 실패가 검사 성공으로 가려짐, 실행되지 않은 검증을 성공으로 표시, 운영 비밀의 산출물 노출.
- 독립 검증은 verifier가 소유하는 고정 SHA 증거의 연결을 별도로 준비한다. 합성 데이터 CI의 실행을 독립 판정으로 대체하지 않는다. 관련 학습 LEARN-0015.

- 기존 필수 job 이름 test 유지. 검증 증거는 PR의 Backend CI 실행 화면에 연결한다. PostgreSQL은 compose의 고정 digest를 가져오고, 새 임시 컨테이너에서 migration, 반복 적재, HTTP 응답, 계정 경계 등을 확인한다.
- 로컬 Node 24.22.3 npm ci --offline 성공. npm test 360/360, 실제 고정 이미지 일회용 DB의 check-refactor-db.cjs 성공 및 컨테이너 제거 확인. 합성 입력만 사용. pg 동시 query의 폐기 예정 경고 1건.
- 별도 컨텍스트 리뷰를 요청했으나 에이전트 사용 한도로 종료됐다. 독립 리뷰 통과로 기록하지 않는다.
- GitHub의 Backend CI 자체 검사와 별도 verifier의 전체 제품 판정을 구분한다. verifier 근거를 PR에 붙일 때는 대상 backend head를 대조한다.
