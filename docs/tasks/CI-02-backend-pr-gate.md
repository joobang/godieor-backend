# CI-02 · 백엔드 PR 필수 검사

- 요구 PROD-009, PROD-010. 운영 수집 및 비밀 비노출에 대한 자체 검사 결과를 병합과 연결한다.
- 기준 backend 81ef062, app b89cc90, verifier ad91fc0. 담당 codex/backend-pr-gate. 별도 작업 트리.
- 범위: backend main 정책 및 PR 체크 기록 형식. 적용 예상 실패는 잘못된 체크 이름, 기본 dev 대상으로 오설정, 자기 승인 필요로 병합 불가, 관리자 우회 허용이다.
- 완료 조건은 main 대상 PR 경로, GitHub Actions 앱의 test 결과 필수, base 최신 필요, 관리자 우회 금지, 추가 승인 0. GitHub UI/API 읽기 재확인과 PR을 통한 확인을 구분한다.
- 최초 관측: Backend CI 44239623270이 성공했고 GitHub Checks API가 test의 출처 github-actions(15368)를 반환했다. 규칙 UI에서 main, PR 필수 및 GitHub Actions test, 브랜치 최신화, 관리자 우회 금지를 설정했다. 저장 요청 후 GitHub Confirm access 화면에서 사용자 재인증 대기. REST 시도는 현재 토큰의 설정 권한 부족으로 403을 반환했다.
- 독립 기준/판정·마이그레이션/API 계약과 운영 배치는 변경하지 않는다. 운영 제품 검증은 verifier의 RUN 및 승인 절차를 따른다.
- 관련 학습 LEARN-0015(부분 검사와 승인 범위). 기존 기술 주장을 바꾸지 않는 운영 설정 작업.

- 최종 원격 설정 확인: 사용자 재인증 후 GitHub branch protection rule 86508537을 상세에서 재조회했다. 패턴 main, 필수 PR, GitHub Actions의 test, 최신 base, 관리자 우회 금지, 별도 승인 0 확인. 검증 양식과 이 설정 기록은 PR에서 리뷰 가능하게 둔다. GitHub 기본 브랜치는 dev이므로 이 PR만으로 기본 브랜치의 양식 자동 삽입까지 확인하지 않는다.
