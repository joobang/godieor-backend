# DATA-30 · 공식 OTT 목록 + TMDB 교차 대조와 플랫폼 표시

- 요구사항: PROD-004/005/006/007/009, ADR-015. backend 시작 SHA `166477e`, app 시작 SHA `097c59c`; 기존 dirty 파일 보존.
- 범위: `reconcile-streampick-gaps.mjs`에 공식 플랫폼 목록 단독 후보 보존, iOS 일간 카드와 월간 미리보기에 OTT 표시. 예상 실패: TMDB KR 제공처 누락으로 공식 등록 작품을 버림, 동일 콘텐츠의 타 OTT 공개 날짜를 한 이벤트로 합침.
- 공식 소스와 TMDB는 서로 다른 근거다. TMDB `watch/providers` 부재만으로 공식 소스의 KR 공개 후보를 삭제하지 않는다. 다만 공식 페이지에 해당 OTT의 한국 최초 공개 근거가 없으면 후보만 보관하며 제품 게시하지 않는다.
- `reconcileGaps`는 TMDB 기존 후보를 분류하고, 공식 한국 플랫폼 일정 중 그 목록에 없는 `(플랫폼, 제목, 날짜)`를 추가한다. 같은 제목의 서로 다른 플랫폼과 날짜는 각각 별도 후보이다. `publishEligible=false`는 유지한다. 중복/이명/시즌의 최종 콘텐츠 ID 매핑은 검토 경로에서 수행해야 한다.
- DB 기존 `content`·`event`·`event_service` 구조는 한 작품의 여러 이벤트, 이벤트별 서비스, 날짜를 지원하며 스키마 변경 없음. 앱은 API의 `services[]`를 일간 카드 배지와 월간 미리보기에서 표시한다. 실제 로고 이미지는 라이선스/자산 확인 전까지 브랜드 텍스트 배지로 대체한다.
- 검증: `node --test tests/streampick-gaps.test.mjs` 6/6 통과(Netflix 11/11, TVING 11/25 별도 보존 확인). iOS `xcodebuild ... CODE_SIGNING_ALLOWED=NO build` 성공. 전체 backend 테스트 결과는 실행 결과에 따른다.
- 미완료: 공식 넷플릭스/티빙/디즈니/쿠팡 목록 실시간 자동 크롤러, 한국 첫 공개 검증 자동화, 검토→게시 연결, 네 예시의 실제 한국 Netflix 증거 확인, 독립 verifier 실행, 실기기 배포.
- 학습: LEARN-ID 해당 없음(기존 ADR-015의 플랫폼 이벤트 모델 구현 및 후보 보존 보완).
