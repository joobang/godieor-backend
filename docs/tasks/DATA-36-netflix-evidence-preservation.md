# DATA-36 · Netflix 공식 후보의 구조화 근거 보존

- Requirement: PROD-005/007/009, DATA-26/27/35, P11(커밋). 승인 기준은 변경하지 않음.
- 상태: 구현·로컬 후보 재입력 및 작성자 자체검사 완료; 최초 공개 검토·제품 게시 대기.
- 담당: backend 구현 세션 `codex-context-01` (종료 시 해제).
- 기준: backend `de4dda8` (`codex/app-auth-phone-ready`), app `10bbb249`, verifier `62e137b`. 시작 시 기존 dirty `.env.example`, `package.json`, `docs/system/{status,handoff}.md` 및 미추적 감사 코드 보존.
- 범위: 후보 revision에 선택적 `lineupEvidence` 보존, Netflix bridge, 회귀 검사. 공개 API 계약·DB migration·verifier acceptance 불변.
- 실패 사례: 공식 날짜가 headline/hash에만 남아 리뷰어가 확인 불가; 재입력 중복; 기존 기사 검토 훼손; 증거 변경 후 이전 검토 유효 유지; TMDB 시즌 시작을 KR 플랫폼 최초 공개로 오인.

## 확인한 결과

- 공식 Netflix KR 목록 75행을 기존 후보 173건에 결합: 구조화 날짜·시장·종류·시즌·첫 공개 확인 여부·근거·출처 내 행 번호가 75/75 최신 revision에 존재한다. `KR` 75/75, 날짜 75/75이지만 `premiereConfirmed=false` 75/75. 제품 게시 0.
- 구조화 필드 보존 시작 시 31행(TMBD 보강 입력) revision 변경, 순서 번호까지 hash에 포함한 최종 형태의 첫 입력에서 75행 변경. 동일 최종 입력 재실행 `created=0, revised=0, unchanged=75`, 후보 총 173.
- 2026-11-12 로컬 PostgreSQL **실제 조회** 11~12월 OTT reviewed 게시 9건. 참고용 StreamPick 전체 35행 중 정확 일치 1, 날짜는 같으나 시즌 미검증 3, 미게시 31. 이는 StreamPick 전체 달력 신작 15건과의 별도 집계이므로 35행을 모두 최초 공개 신작으로 가정하지 않는다.
- 앞선 11개 신작 격차 조사에서 Netflix `더 바디`는 `tmdb_date_only`로 분류되었으나, 현재 후보에는 한국 공식 Netflix 목록의 **2026-11-11** 날짜와 KR 시장이 구조화되어 있다. 따라서 해당 분류는 최신 후보를 반영하지 못한 낡은 조사 결과이다. 첫 공개 검토는 여전히 필요하다.
- 남은 StreamPick-only 11건 중 공식 동일일 후보 6건(`배스 X 마키나`, `반려견의 완벽한 크리스마스`, `시한부 1년, 남자를 사다`, `더 바디`, TVING `유일무이 로맨스`, Disney+ `스타일 워즈`), 공식 날짜 충돌 1건(`오버액션 갱`: StreamPick 11/04, Netflix 공식 11/05), TMDB 날짜/제공처 단서만 1건(`전지적 집착 시점`), TMDB 날짜 단서만 3건(`Alicia's Law`, `문무`, `나인 투 식스`). 공식 동일일은 첫 한국 플랫폼 공개의 확정 근거와 구별한다.

## 실행과 인계

- `node --test tests/netflix-lineup-bridge.test.mjs`: 3/3 통과 (기존 기사 검토, 반복·증거 변경, URL/ID 경계 포함).
- `node scripts/bridge-netflix-lineup.mjs /private/tmp/godieor-netflix-kr-merged-provider-fix-final.json`: 마지막 실행 `75/0/0/75`(입력/신규/변경/동일), 후보 173, 검토 필요 75, 게시 0.
- `node --env-file=.env scripts/audit-ott-published.mjs`: 로컬 DB 읽기 전용 9건 (11월 Netflix4/Disney2/TVING1, 12월 Netflix1/Coupang1).
- 첫 전체 `npm test` 124/125: 새 테스트의 선언 위치 오류 1건 수정. 수정 후 `node --test tests/*.test.cjs tests/*.test.mjs` **125/125 통과** (기존 빌드 산출물 기준). `npm test` 일반 실행의 `dist` unlink EPERM은 허용 실행으로 해결되어 컴파일/전체 테스트 진행됨.
- 독립 검증·외부 배포·실기기 확인 미실행. app/backend/verifier 통합 PASS 아님. LEARN-ID 해당 없음(기존 데이터 보존 결함 수정). ADR 정책 변경 없음.
- 다음: 최신 구조화 근거를 읽는 StreamPick 11건 차이 리포트를 갱신하고 한국 플랫폼 최초 공개 원문 확인을 지속한다. 게시 가능 근거가 입증된 건만 기존 reviewed 매핑과 DB 게시 경로 사용. `Alicia's Law`·`문무`·`나인 투 식스`의 공식 한국 날짜 검증은 미완료.
