# DATA-38 · StreamPick 차이 중 한국 OTT 최초 공개 2건 게시

- Requirement: PROD-005/007/009, DATA-37. 기준 backend `9e5e48b` / `codex/app-auth-phone-ready`; app `10bbb24`, verifier `62e137b`.
- 변경: TVING `유일무이 로맨스` 시즌1 2026-11-09, Disney+ `스타일 워즈` 시즌1 2026-11-11 한국 첫 공개 근거를 각각 추가 lineup 파일로 보존. 기존 미확정 출처 스냅샷은 유지. 수동 검토 후보 revision에 `work-000012/013`, `event-000012/013` 매핑을 붙여 로컬 `ott_reviewed` 게시.
- 출처: CJ TVING 주간 추천작 + 2026-10-22 [첫 공개 보도](https://www.inews24.com/view/2017893); Disney+ 한국 [작품 페이지](https://www.disneyplus.com/ko-kr/browse/entity-48718a21-c9c9-487a-a655-d81a9f44c7de), 2026-11-11 [한국 첫 공개 및 1·2화 기사](https://www.cineplay.co.kr/ko-kr/articles/30750), [Disney+ 11월 미디어 일정](https://press.disneyplus.com/news/next-on-disney-plus-november-2026). 편성 시각을 유추하지 않고 `date_only`로 보존.
- 실패 대비: 한국 페이지에서 서비스 중인 작품이 첫 공개가 아닐 수 있음; 동일 작품 다른 플랫폼·시즌 혼합; 미확정 과거 snapshot 덮어쓰기; 최초 공개일과 TMDB 날짜 단서의 혼동; 검토 revision 변경 후 오래된 매핑; DB 접근 제한.

## 실행 및 결과

- `collect-candidates add` 두 후보 등록 및 `review` 두 건 실행(이전 단계에서 완료, 작성자 근거 검토). 후보 ID `0b5ab9c901ebbbd534414c479d0b3dff0fa5482e90d5269507bf883bebb59446`, `314dd90fefe988ad264dc1994454519b5a5172dc3c71ae357ad521d683b30c95`.
- `node scripts/reconcile-streampick-gaps.mjs /private/tmp/streampick-tmdb-11-audit.json data/lineups /private/tmp/streampick-gaps-reconciled.json work/ott-candidates/state.json`: 11건 유지, 공식 첫 공개 후보 2, 공식 같은 날 목록만 4, 날짜 충돌 1, TMDB 날짜·KR 제공처만 1, TMDB 날짜만 3. 본 비교기의 `publishedCountDelta: 0`은 비교 자체가 DB 게시를 하지 않는다는 의미.
- `npm run publish:reviewed -- --file data/curated/ott-reviewed-mappings.json`: 일반 sandbox 실패(상세 오류 미출력), 허용 실행에서 `status=succeeded, published=13`.
- `npm run audit:ott-published`: 로컬 DB 2026-11~12월 `ott_reviewed` 11건 확인. TVING `유일무이 로맨스` 11/09, Disney+ `스타일 워즈` 11/11 두 건 모두 `published_match`. 매핑 총 13건에는 범위 밖 일정 2건도 포함.
- `node --test tests/streampick-gaps.test.mjs`: 11/11 통과. `git diff --check` 통과.

## 경계·인계

- StreamPick 전체 885 이벤트(회차 포함)와 최초 공개 이벤트의 모집단은 다름. 11건 중 2건을 게시해도 StreamPick 전수 일치를 뜻하지 않음. 나머지 공식 같은 날 4건은 최초 공개 재확인, 날짜 충돌 `오버액션 갱`은 수동 대조, TMDB 단독 4건은 실제 국내 플랫폼 근거 보강 필요.
- 로컬 DB 게시이며 클라우드 배포·독립 verifier 승인·전체 제품 PASS 아님. API 계약/마이그레이션/verifier 기준 불변. LEARN-ID 해당 없음: 기존 수동 게시·증거 분류 절차의 적용.
- 기존 dirty `.env.example`, `package.json`, `docs/system/status.md`, `docs/system/handoff.md` 및 미추적 감사 스크립트/테스트는 사용자 작업으로 보존.
