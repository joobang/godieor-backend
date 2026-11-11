# DATA-20 · TMDB 한국 OTT 작품 메타데이터 적재 (2026-11-11)

- 요구사항: PROD-005/007/009, 작품 메타데이터·포스터 수집. 담당: codex-context-data19, 완료(작성자 자체 확인), 독립 검증 미실행.
- 기준 backend `924159894d3d6652e9021876fceac05d86e19169`, branch `codex/app-auth-phone-ready`; app `e1a488e2e6b9beceb59ab1725bd5374c85c5161c` (개인 signing dirty, 변경하지 않음).
- 범위: `.env` TMDB Read Access Token으로 TMDB KR watch-provider 검색, TV·영화 한국어 제목/줄거리/포스터/원제 저장, 반복 시 기존 매핑 갱신. API·migration·verifier 기준 변경 없음.
- 예상 실패: API provider 표기의 `Disney Plus` 누락, TMDB 최초 방영일을 한국 OTT 최초 공개일로 오인, 같은 작품을 OTT별로 중복 INSERT, 계정 키·DB 주소 노출, 달력 이벤트 수와 작품 메타데이터 수 혼동.

## 실제 실행·확인

| 실행 | 결과 |
| --- | --- |
| `node --env-file=.env scripts/ingest-tmdb-catalog.mjs --pages=5` 최초 | unique 381, 신규 INSERT 381, 포스터 381. Disney Plus 매칭 누락 확인 |
| TMDB KR provider 이름 조회 | TV/영화 Disney Plus ID `337`; Netflix `8,1796`; TVING `1883`; TV Coupang Play `1881` 확인 |
| 매칭 수정 후 동일 명령 | unique 568, 신규 187/기존 381, DB 총 568, 포스터 568 |
| 동일 명령 재실행 | 신규 0/기존 568, 중복 적재 없음 |
| 실제 PostgreSQL 별도 SELECT | TMDB 연결 content 568, 포스터 568, 기존 `ott_reviewed` 게시 event_source 9 |
| `npm test` | 최초 기본 sandbox dist unlink EPERM; 허용된 재실행 총 81 테스트 PASS, exit 0 |

5페이지 제한의 **검색 결과 행수**: Netflix TV 100/영화 100, TVING TV 100/영화 100, Disney+ TV 100/영화 100, Coupang Play TV 12/영화 0. 동일 작품이 여러 서비스에 속할 수 있어 합계와 고유 568개는 다르다. TMDB 영화 쿠팡플레이 제공처는 KR provider 목록에 나타나지 않았다. 이 수는 각 OTT 전체 작품 수가 아니며 2026년 11~12월 신규 공개건수도 아니다.

DB에는 content·content_source(`tmdb`)에 메타데이터를 저장했다. 별도의 OTT 서비스 귀속 목록은 로컬 `work/tmdb/latest.json` 보고서의 `rows[].services`에만 기록하며 제품 API의 일정 조회에는 아직 공급하지 않는다. TMDB watch-provider는 조회 시점 시청 가능성 힌트이다. `tmdbFirstDate`를 한국 OTT 공개일로 게시하지 않았고 이번 수집으로 달력에 추가된 이벤트는 **0건**이다.

## 인계

- 독립 리뷰/통합 runner, 클라우드 적재 및 iPhone 반영 미실행. 별도 수집기 Adapter/Repository 구조 전환과 서비스별 시청 가능 정보 영속화, 공식 한국 최초 공개 근거와 검토 후보 연결·게시 필요.
- 민감한 `.env`는 Git에 추가하지 않는다. 기존 dirty `.env.example`은 이번 commit에서 제외한다.
- 계약·migration digest 변경 없음. verifier 승인/판정 변경 없음. ADR·LEARN 신규 기록 없음: 기존 TMDB 출처 정책·일자 근거 정책을 재사용.
