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
