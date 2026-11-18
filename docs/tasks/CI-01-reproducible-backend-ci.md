# CI-01 · 깨끗한 checkout에서 백엔드 CI 재현

- 요구 PROD-009/010, GD-009/010. 운영 수집 보호 및 자체 검사 재현성. 독립 기준은 미승인 초안 그대로 유지한다.
- 담당 codex/reproducible-backend-ci. backend base a474d0e, app 3651fa0, verifier 21702b1. 세 main clean. 구현은 /private/tmp/godieor-ci87의 별도 worktree.
- 변경 범위: CI 빌드 설정, 기본 OTT 테스트의 재현 가능한 입력, 운영 실패 분석. 예상 실패: DATABASE_URL 미주입, work 파일 ENOENT, 달이 바뀌면 유효 기간 비교 실패, fixture의 자동 게시 오탐. 완료 조건: 빈 checkout, 실제 Secret 및 기존 work 없이 잠금 파일 의존성 설치와 전체 테스트 성공.
- 범위 밖: 제품 수집·적재 로직과 계약/migration 변경, 운영 DB 쓰기, acceptance 판정, 별도 요청 없는 push. 필수 PR 검사 설정은 원격 CI가 통과한 뒤 진행할 다음 단계다.
- 학습: verifier LEARN-0022의 진단 원리를 재검토한다. 이번 변경은 운영 오류 분류나 트랜잭션 동작을 바꾸지 않아 기존 기술 설명을 유지한다.

## 운영 실패 분석

수집 run 44221212098, job 134523252926, backend a474d0e. KOBIS 251, EPL 330, IGDB 6개 시장 성공(14/95/3/2/1/6행). 숫자는 CLI의 게시 처리 건수이며 신규 행사 건수는 아니다. IGDB WORLD만 publish에서 Prisma P2028로 실패했다. OTT는 published_with_discovery_gaps로 게시를 마치고 경고를 남겼다. continue-on-error 이후 최종 단계가 백필 오류를 전체 실패에 반영했다.

IGDB 실행 구간은 약 21분이며 Actions 게시 제한은 15분이었다. 이 구간에는 조회 및 다른 시장 게시도 들어간다. WORLD는 여러 원천 지역을 묶고, repository는 레코드별 DB 왕복을 하나의 트랜잭션에서 순차 수행한다. 실행 시간 초과가 유력하지만 WORLD 게시 단독 경과 시간과 Prisma 오류 세부 유형은 기존 로그에서 확인할 수 없다. 작업 경계를 유지한 채 다음 별도 작업에서 WORLD의 게시 시간·행 수·안전한 실패 분류를 계측하고, 임시 DB에서 규모와 왕복 지연을 재현한 뒤 왕복 감소를 검토한다. 무조건 한도 상향이나 범위 쪼개기로 처리하지 않는다.

## 검증 및 인계

- 공식 Node 24.22.3의 별도 worktree에서 npm ci --offline exit 0, 264개 패키지. 잠금 파일 사용.
- .env 및 work가 없는 상태에서 CI와 같은 접속 불가능한 합성 DATABASE_URL을 주입해 npm test exit 0. 357/357, skip 0. 원천 Secret을 주입하지 않았고 운영 DB를 사용하지 않았다. 로그 /private/tmp/godieor-ci87-test.log.
- 현재 기준 SHA 및 계약/migration은 DATA-86 참조. 이 변경은 backend 자체 검사 한정이며 독립 통합 runner나 verdict는 실행·변경하지 않았다.
- 다음 단계: 새 커밋의 원격 Backend CI 녹색 확인 후 필수 체크를 강제한다. 운영 수집의 WORLD 병목은 이 CI 변경과 별도이며 다시 실행하지 않았다.
- 독립 컨텍스트 검토 지적 3건을 반영했다. Node 모의 시계로 기본 11월 운영 분기를 검사한다. 가상 TMDB 후보는 명시적 검토 전/후 매핑 부재/생성을 모두 확인한다. 원천 재확인 결속 검사는 고정 입력이 기본이며 로컬 작업 상태 검사를 명시적으로 선택할 수 있다.
- 후기 확인: 변경 대상 25/25. 빌드 재생성 중 겹쳐 실행한 로컬 후보 검사는 dist 모듈이 아직 없어 한 번 실패했고 빌드 후 재실행해 1/1 통과했다. 명령은 Node24에서 `GODIEOR_TEST_OTT_STATE_PATH=/absolute/path/state.json node --test --test-name-pattern 'posted binding and baseline' tests/posted-source-recheck.test.mjs`이다.
- 계약 0.1.0-draft.5 manifest SHA256 04cfea7456d83ca141ba64c6d6568365b00cbdf2d5e95eacd8c4dad7249a0f2e. migration 집합은 DATA-86의 83a824f7b4e40d844331ee6660361da4a309c1170cce5e5f688cd75c3f3a227f와 동일한 트리. acceptance SHA256 c4906283810c8b378800b67930028685a41b6a051923ea9f9415346b2d657063. 담당 해제.
