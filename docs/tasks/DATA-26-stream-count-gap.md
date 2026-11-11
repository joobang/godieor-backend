# DATA-26 · StreamPick 전수 캘린더와 OTT 게시 건수 차이

- Requirement: PROD-005/007/009, ADR-015. 담당: `codex-streampick-count-audit`; 상태: 자체 감사 완료, 게시 커버리지 개선은 후속.
- Base SHA backend `8eb3e4e`, app `097c59c`, branch `codex/app-auth-phone-ready`; 기존 backend `.env.example`, `package.json`, status/handoff 및 다른 스크립트의 dirty 변경, app signing 변경 보존.
- 범위: 2026-11-12에 다운로드한 StreamPick 공개 캘린더 HTML(2026-10-01~2027-01-31 포함)에서 Next RSC 캘린더 자료를 읽고 11~12월 이벤트 유형·플랫폼별 수와 로컬 `ott_reviewed` 9건을 비교. StreamPick HTML은 Git에 저장하지 않음.
- 예상 실패: 서드파티 RSC 형식 변경, 콘텐츠-플랫폼 복수 매핑으로 중복 집계, 에피소드를 신작으로 계산, TMDB 글로벌 방영을 한국 OTT 첫 공개로 오인, 동일 작품 이명·시즌 번호 미확인.

## 관찰된 사실

- StreamPick 전체 11월 이벤트 571, 12월 314, **합계 885** (콘텐츠 하나의 동일 날짜 이벤트 단위, 모든 플랫폼 포함). `episode` **849**, `new_release` **36**. 같은 이벤트가 플랫폼 여러 개에 연결되므로 플랫폼별 합과 전체 이벤트 수가 다름.
- 네 OTT만 보면 11월/12월 합계 `new_release` 15개의 플랫폼 연결행(Netflix 10, TVING 3, Disney+ 2, Coupang 0), `episode` 703개 플랫폼 연결행(Netflix 285, TVING 265, Disney+ 135, Coupang 18).
- 실DB `ott_reviewed` 9개 게시행. StreamPick 네 OTT의 15 신작행과 날짜+플랫폼+정규화 제목 동일은 **4**, StreamPick에만 있는 신작행 **11**, DB에만 있는 게시행 **5**. 이명/시즌/지역 검증 전의 단순 대조.
- 11개의 StreamPick-only 신작 후보: Netflix 배스 X 마키나, 반려견의 완벽한 크리스마스, 오버액션 갱, 시한부 1년 남자를 사다, 더 바디, Alicia's Law, 문무, 나인 투 식스(8); TVING 전지적 집착 시점, 유일무이 로맨스(2); Disney+ 스타일 워즈(1).
- DB-only 5행: Netflix 심장소리, 가능한 사랑, 데블스 플랜: 데드 어게인; Disney+ 비엔나 게임; Coupang Play 스마일 클리닉. 실제 한국 서비스 근거와 StreamPick 표시의 진위를 각기 별도 검토해야 하며 DB-only를 잘못된 데이터라 단정하지 않음.
- **가장 큰 양적 차이는 703개의 회차 연결행**이다. 기존 제품은 한국 OTT 최초 공개(reviewed)만 저장한다. StreamPick은 작품의 정기 방영 회차를 `episode`로 표시하고 다수 플랫폼에 연결한다. 동일한 분류 없이 절대 건수를 맞추는 것은 잘못된 목표이며 제품에서 회차 일정까지 다루는 별도 정책·스키마가 필요하다.
- StreamPick 신작 15건도 DB 9건과 동일 집합이 아니다. 로컬 후보 파이프라인은 TMDB 인기순 5페이지/기존 타이틀 첫 공개일 중심이었고, 역조회 35행 중 31행은 TMDB 시즌·영화 날짜 메타데이터와 일치했다(DATA-25). 그러나 TMDB 시즌/회차 방영일은 한국 OTT 첫 공개의 확정 출처가 아니다.

## 재현·변경

- `scripts/audit_streampick_calendar.py`: 공개 HTML의 Next RSC 페이로드 추출, 이벤트 종류/플랫폼별 집계, DB에서 덤프한 게시행 배열과 제목+플랫폼+날짜 교차 대조 및 미게시 **검토용 목록** 출력. HTML 스냅샷 또는 API/DATA 파서가 변경되면 재검증.
- 실행: `python3 -m unittest discover -s scripts -p test_audit_streampick_calendar.py -v` → 2/2 PASS.
- 실행: `python3 scripts/audit_streampick_calendar.py /private/tmp/streampick-calendar-20261112.html /private/tmp/godieor-published-20261112.json /private/tmp/streampick-count-audit.json` → exit 0. 감사 JSON은 `/private/tmp/streampick-count-audit.json` (Git 제외).
- DB는 `SELECT ... FROM event ... WHERE provider_key='ott_reviewed' AND release_market='KR'` 읽기 전용 9행 확인. 신규 게시 0, API/마이그레이션/독립 verifier 판정 변경 0. 실DB 조회 결과는 임시 JSON으로만 보관.

## 다음 작업

1. 11개 신작 후보 각각 TMDB TV/season `air_date`, 첫 회 `air_date`, 영화 `release_date` 및 한국 OTT **공식** 첫 공개 자료를 연결하고 검토 매핑→게시 가능한 것만 등록. 후보 11개를 검증 없이 게시하지 않음.
2. StreamPick `episode` 703 플랫폼 연결행은 회차 데이터 도메인 확장 요구사항과 사용자가 원하는 달력 표시 정책을 먼저 정리; TMDB `/tv/{id}/season/{n}` 회차 일자/제공처/지역/서비스 중복·취소를 별도 추적. 승인 없는 event kind 변경 금지.
3. StreamPick 35개 수동 참고행과 현재 공개 캘린더 15개 신작행의 출처/기준 시점 차이를 주의. 현재 캘린더 기준 주기적 재추출, 공식 방송 일정 보정, 실DB 게시 이후 다시 계수.

- ADR: ADR-015 기존 후보/최초공개 구분 유지. LEARN-ID: 해당 없음(현행 데이터 관측과 비교 도구만 추가). 외부 독립 검증·클라우드 배포/실폰 확인 미실행.
