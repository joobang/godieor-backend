# DATA-08 · IGDB 게임 표지 메타데이터

- Requirements PROD-002/005/009. 독립 verifier acceptance·승인 불변.
- 상태 작성자 구현 및 회귀 검사, 독립 검증 대기. 담당 codex-game-covers-01, 종료 시 해제.
- 기준 backend `4cd18ef`, app `54a4008`, verifier `6a67502`, branch `codex/app-auth-phone-ready`.
- 변경 범위 backend IGDB 응답·canonical content·DB 이미지 URL 게시. 앱/API 계약/DB migration 불변.
- 사용자 요청 카드에서 사용할 실제 게임 포스터 확보. IGDB `game.cover.image_id`를 공식 이미지 CDN URL로 만들어 기존 `content.poster_url`에 보존.
- 예상 실패: 표지 없는 게임, 출처 이미지 갱신, IGDB 중첩 필드 형식 차이, 이전 데이터 재수집 지연.
- 구현 방침: 이미지가 없으면 null, 기존 이미지 URL은 누락 응답으로 삭제하지 않음. 외부 이미지 파일 자체 다운로드·Storage 복사는 별도 단계.
- 테스트: `npm test` 63/63 성공(초기 기본 sandbox의 dist unlink EPERM은 허용 환경에서 재실행 해결), `node --test tests/provider-sources.test.cjs` 5/5 성공(첫 assertion은 WORLD 지역별 반환 순서 가정으로 실패 후 특정 ID 조회로 수정). 로컬 API 127.0.0.1:3000 연결 실패(서버 미기동). 실 IGDB 재호출/DB 반영/실기기 UI/클라우드 검증 미실행.
- 앱의 개인 `ios/GODIEOR.xcodeproj/project.pbxproj` 미커밋 signing 설정 유지.
- ADR/LEARN 신규 없음. 기존 콘텐츠 `poster_url` 컬럼 및 제공처 메타데이터 매핑을 활용.
- 다음 단계: 실제 IGDB 재수집 후 `content.poster_url` 분포와 `GET /v1/events`·iPhone 이미지 표시 확인. 영화/OTT 포스터 원천 연동 및 저장소 정책은 별도 진행.

## 2026-11-11 후속 실수집 검증 (codex-game-covers-refresh-01)

- Requirements PROD-002/005/009, 기준 backend `e4815e9`, app `f388297`, verifier `ed5f4e7` (`codex/app-auth-phone-ready`). 코드/계약/마이그레이션/승인 기준 수정 없음.
- 기존 로컬 PostgreSQL IGDB 작품 3,165건 중 `poster_url` 0건. `CollectionService.collect("daily", true)`로 IGDB만 강제 수집(다른 provider 키는 해당 일회성 프로세스에서 제외), WORLD 4,782/KR 3/JP 75/AU 3/NZ 2/CN 1/BR 4 모두 `succeeded`.
- 수집 후 IGDB 작품 **3,181건 중 포스터 URL 3,152건**, 미제공 29건. IGDB 출처 이벤트 총 4,870건. `postgres` SELECT 집계 확인.
- 임시 로컬 API `PORT=3099 node --env-file=.env dist/src/main.js`로 `GET /v1/events?categories=game&schedule=dated&from=2026-11-01&to=2027-01-01&limit=30` 성공(30건), 예시 작품의 `GET /v1/contents/:id`에서 `posterUrl` 반환 확인. **이벤트 목록 자체에는 `posterUrl` 필드가 없음**. 카드 이미지 렌더링은 작품 상세 추가 요청 또는 계약/앱 변경 필요.
- 첫 API query 시도 `category=game` 및 `schedule` 생략은 INVALID_QUERY였고 올바른 `categories=game&schedule=dated`로 재시도해 정상 확인. API 임시 프로세스 종료.
- 독립 verifier, 실제 iPhone 렌더링, 이미지 CDN 상태/권한, 클라우드 DB 반영, 영화/OTT 포스터는 미확인. 소스/이미지 이용조건 검토 및 제품 카드 노출 경로는 다음 작업. LEARN-ID: 해당 없음(기존 IGDB 메타데이터 경로에 대한 운영 확인).
