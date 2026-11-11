# DATA-15 한국 넷플릭스 공식 공개일 검증 후보 추가 (2026-11-11)

- 요구사항: PROD-005/007/009. 담당 `codex-context-data15` (구현·문서화 후 해제). 기준 backend `28e767a`, app `1cb9698`, verifier `12060a3`, 모두 `codex/app-auth-phone-ready`. 앱의 개인 `ios/GODIEOR.xcodeproj/project.pbxproj` dirty 보존.
- 범위: 넷플릭스 한국 뉴스룸 1차 기사 각각의 날짜·제공처·카테고리를 확인해 정규화된 lineup 2건 생성. 데이터베이스/제품에 자동 게시하지 않고 review staging에 적재. 다른 서비스/API 계약·migration·verifier 기준 변경 없음.
- 공식 근거: `푸른길` (Netflix 오리지널 시리즈, KR, 2026-11-20) https://about.netflix.com/ko/news/main-trailer-of-the-blue-road-sees-son-suk-ku-and-eita-nagayama-team-up-on-a-gruesome-cross-border-murder-investigation ; `가능한 사랑` (Netflix 영화, KR 플랫폼 공개 2026-11-06) https://about.netflix.com/ko/news/possible-love-final-trailer . 사이트 내용은 별도 웹 조회로 확인; 로컬 Mac의 웹 자동 수집 확인은 아님.
- 예상 실패: 미국 Tudum 가용 날짜와 한국 최초 공개를 혼동, 영화제/극장 개봉과 Netflix 플랫폼 공개 혼동, 서로 다른 영문/한글 표기 중복, 미표시 시각을 임의 생성, `premiereConfirmed`를 DB 게시 완료로 오해. 수집 후보의 확인값은 근거를 뜻하며 모든 후보는 여전히 `needs_manual_review`, `published=false`.
- 실행: 두 `node scripts/stage-ott-lineup.mjs data/lineups/netflix-kr-2026-11-*.json` 개별 실행 결과 신규 1+1건, 기존 80건에서 총 82건. 첫 파일 재실행 신규 0 / 변경 0 / 불변 1. `node --test tests/ott-lineup.test.mjs tests/netflix-tudum.test.mjs` 9/9; `npm test` 기본 sandbox dist EPERM 뒤 허용된 재실행 75/75 통과.
- 신규 DB 게시 0건. 기존 7건은 이전 기록 수치이며 이번에는 직접 조회하지 않음. 독립 검증·Supabase/Render/실폰 게시 미실행. 다음 작업은 기사 후보의 수동 review와 `publish:reviewed` 경로 연계, 로컬 DB 실제 행 확인 및 다른 OTT 제공처 확대.
- LEARN-ID: 해당 없음. 기존 ADR-015의 후보/게시 분리 정책을 적용했고 새로운 기술 선택은 없음.
