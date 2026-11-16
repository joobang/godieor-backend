# 계약과 로컬 구현 범위

2026-11-16 / 0.1.0-draft.5 · DATA-56 애니 범위 반영. 코드 구현·작성자 실행·독립 승인을 구분한다.

| 범위 | 현재 기록과 한계 |
|---|---|
| 공개 /catalog/options, /calendar, /events, /events/:id, /contents/:id | Prisma/로컬DB 조회 구현. DATA-47 당시 SQL/API 11~12월KR ott_reviewed60건 확인, DATA-48 읽기 재조회도60건 |
| Google/서비스 세션·계정 설정·찜 | 구현됨. APP-AUTH-12 사용자 실폰 Google 로그인 확인 기록이 있으나 계정 설정/찜의 다중 기기 왕복·독립 전체 검증은 미완료 |
| 수집 | KOBIS/football-data/IGDB/TMDB 및 공식 OTT 후보/수동 검토 게시 코드·작성자 로컬 적재 기록. 제공처 전수·클라우드 자동 수집 완료 아님 |
| OTT 분류 | movie/series/original_series/variety/documentary/animation/other 계약. 다큐·애니는 movie/series 형태를 명시. 2026-11-16 애니 포함 사용자 확정 |
| 게임 기기 | pc/playstation/xbox/switch/ios/android. 기존 모바일 migration·앱 표시 구현 기록 |
| DB | 적용 원본 prisma/migrations. database.sql은 현행 핵심 계약의 참조DDL이며 migration 실행을 대체하지 않음 |
| /health | 로컬 운영 경로. 응답 성공이 실제 제공처 연결·수집 완전성을 보증하지 않음 |
| 실폰/클라우드 | DATA-44~47은 새 배포·앱 설치 미실행. 기존 기기의 최신 UI/조회 결과를 이번 검사로 확정하지 않음 |
| 독립 검증 | acceptance draft/미승인. 작성자 자체 검사와 정식 runner의 실제 단계·ERROR/SKIPPED를 구분. DATA-48 고정SHA/Node24 결과는 해당 작업 카드 참조 |

DATA-44~47의 Node22 전체 검사에는 당시 dirty/untracked 테스트가 포함됐다. DATA-48은 고정 source snapshot에서 별도로 검사한다. 과거 통과를 새 commit·새 runtime·독립 승인으로 재라벨하지 않는다.

DATA-48 사용자 확정 후: 다큐 검토에는 documentaryFormat=movie|series를 명시하고 추정하지 않는다. 분류는 documentary를 보존하고 내부 content.kind는 movie/기존 series 표현인drama를 사용한다. 영화형 시즌 금지. 202611130001 migration과 iOS 다큐 배지를 추가하며 실제 후보 신규 게시는 별도다.

DATA-56: animationFormat=movie|series를 명시해 ottCategory=animation을 유지하며 내부content.kind는movie|drama다. 사용자범위확정과독립acceptance승인을구분한다.
