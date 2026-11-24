# DATA-94 · OTT 수집 실패 진단 및 빈 TMDB 변경 목록 처리

- 요구사항: PROD005, PROD008, PROD009, PROD010 운영 관련 회귀 및 진단
- 기준: backend main e807a5807ada8c2c9e5f67c85d7c18b7be184bff. 별도 codex/ott-source-diagnostics-20261124 worktree 사용
- 범위: TMDB 증분 탐색, Netflix·TVING·쿠팡플레이 진단. API 계약·마이그레이션 변경 없음
- 예상 실패: 모순된 빈 응답이 체크포인트를 전진시키거나, 제공처 예외 문자열에 포함된 정보가 Actions 리포트에 노출되거나, 선택 수집 실패가 검토 완료 일정 발행을 막는 경우

## 재현과 처리

- 실제 GitHub 수집 실행 45294089151에서 기존 검토 OTT 일정은 발행됐지만 TMDB 변경 및 Netflix·TVING·쿠팡플레이 발견이 누락됐다. 당시 제공처 예외가 구조화되지 않아 세 제공처의 GitHub 실패 원인은 확정하지 못했다.
- Mac에서 TMDB 영화·TV 변경 API가 각각 HTTP 200과 0페이지·0결과를 반환할 때 기존 CLI가 exit 1로 종료하는 것을 재현했다. 세 값이 서로 일치하는 빈 응답만 성공 처리하고 체크포인트를 남긴다.
- Mac 직접 호출에서 Netflix 81개 원천 항목, TVING 6개 프로그램을 읽었다. 쿠팡플레이는 새 로컬 출력 경로에서 보고서 디렉터리 누락을 별도로 재현했다. 이 로컬 경로 오류를 GitHub 실행의 원인으로 분류하지 않는다.
- CLI·부분 실패 요약에 코드 허용 목록을 적용했다. HTTP 상태, 연결·시간 초과, 형식·지역 확인 실패, 입력 파일 누락을 식별한다. 예외 원문을 Actions 진단으로 전달하지 않는다. 뉴스 수집 실패는 별도 쿠팡플레이 공개일 검토와 검토 완료 일정 발행을 막지 않는다.

## 자체 검사와 실기기 관찰

- Node 24.22.3 `npm test` exit 0, 383/383. 테스트 데이터베이스 설정은 합성 값. 케이스에 빈 페이지 체크포인트, 모순된 빈 응답, HTTP 코드·시간 초과 분류, 예외 원문 차단을 포함한다.
- 수정 버전 Netflix·TVING·쿠팡 뉴스 CLI 모두 Mac에서 exit 0. Netflix 원천 81건(조회 창 79), TVING 6개 프로그램(오류 0), 쿠팡 뉴스 40개 항목(신규 발행 0). 공개일 확정 수치나 운영 적재 건수로 사용하지 않는다.
- 수정 버전 쿠팡플레이 공개일 검토 CLI exit 2. 원천 오류 0, 후보 3건, 출연진 대조 미완료 1건이 `CAST_LOOKUP_INCOMPLETE`로 표시됐다. 격리된 로컬 상태에서 3건 보류, 신규 승인 0.

- `node --env-file=… scripts/sync-tmdb-changes.mjs /private/tmp/godieor-tmdb-1124-fixed.json` exit 0. 실제 TMDB 영화·TV 각각 0페이지로 처리하고 당일 체크포인트 기록.
- `sh scripts/check-account-flow.sh` exit 0, 16/16. 가상 전송·저장·인증으로 설정 및 두 종류의 찜 복원 검사.
- iPhone 15 Pro, iOS 앱 0.1.0 (9): 저장한 OFF 값과 Google 세션이 앱 종료·재실행 후 복원됐다. 원래 EPL ON 값을 저장하고 서버에서 다시 불러와 확인했다. 실기기 찜 입력·복원은 화면이 잘려 미확인.
- 별도 컨텍스트 소스 리뷰 3건을 반영했다. 부분 실패와 쿠팡 뉴스 본문 요청의 코드 보존, TMDB 시간 초과 분류를 추가했다.

## 인계

- app base/head `bad2576eaf2907018219cd4f01d64d1b2e3d63b6` (실기기 확인 빌드의 소스 기준점). backend base `e807a5807ada8c2c9e5f67c85d7c18b7be184bff`, backend head `11c0ca71ecbad81b7f35b7453be372aa22c23b6f`. verifier 기준 checkout `04c2db93bf5f9490e52d54c996965faaa5a5a3f5` 및 동기화 문서 커밋 참조.
- API `0.1.0-draft.5`, 계약 manifest SHA256 `04cfea7456d83ca141ba64c6d6568365b00cbdf2d5e95eacd8c4dad7249a0f2e`, migration manifest digest `feeb684462340075302b9a05ff3102740f6fe7d87c667ea8c455752c1433ba1b`.
- verifier 기준 `0.1.0-draft`, SHA256 `c4906283810c8b378800b67930028685a41b6a051923ea9f9415346b2d657063`. 실제 독립 통합 runner 미실행. verifier 기준과 verdict 미변경.
- 다음 확인은 실기기에서 찜 저장·복원과 새 코드가 실행되는 GitHub Actions에서 제공처별 진단을 읽는 것이다.
- ADR 해당 없음. 기존 수집 흐름의 오류 분류 보완이다. 관련 LEARN-0022의 운영 수집 문제 진단 범위를 재검토했다. 새 통합 해설은 작성하지 않았다.
