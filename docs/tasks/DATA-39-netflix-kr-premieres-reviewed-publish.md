# DATA-39 · Netflix 한국 첫 공개 4건 재검토 및 로컬 게시

- Requirement PROD-005/007/009; 기준 backend `dacfa58`, `codex/app-auth-phone-ready`, app `10bbb24`, verifier `62e137b`. 기존 dirty `.env.example`, `package.json`, `docs/system/{status,handoff}.md` 및 미추적 감사 스크립트/테스트 보존.
- 목표: StreamPick 전수 숫자 맞추기가 아니라 11건 차이 중 국내 넷플릭스 첫 공개 날짜를 공식 소스에서 확인하여 검토·게시.
- 위험: `about.netflix.com/ko/new-to-watch`의 한국 신규 등록일을 첫 전 세계 공개로 오인, Netflix 공식 미국 공개 날짜만 한국 출시로 오인, 시즌·영화 혼동, 날짜 충돌을 UTC 시차로 추측, 기존 검토 수정과 타인 dirty 덮어쓰기.

## 확인과 반영

Netflix 한국 [신규 콘텐츠 목록](https://about.netflix.com/ko/new-to-watch)의 날짜에 다음 원천 근거를 교차 대조했다.

| 작품 | 한국 첫 공개일 | 종류 | 최초 공개 원천 근거 |
|---|---|---|---|
| 배스 X 마키나 | 2026-11-03 | 시즌1 | [Netflix 공식 신작 애니메이션 발표](https://about.netflix.com/en/news/netflix-unveils-upcoming-anime-slate-out-of-annecy-festival) |
| 반려견의 완벽한 크리스마스 | 2026-11-04 | 영화 | [Netflix Media Center 영화 공개](https://media.netflix.com/en/only-on-netflix/82090597) |
| 시한부 1년, 남자를 사다 | 2026-11-05 | 영화 | [Netflix 제작·기획 영화 최초 공개 발표](https://about.netflix.com/en/news/one-year-to-live-buy-a-man-trailer) |
| 더 바디 | 2026-11-11 | 시즌1 | [Netflix Tudum 신규 8화 시리즈 첫 공개](https://www.netflix.com/tudum/articles/the-body-plot-release-date-news) |

- 기존 Netflix 후보에 구조화된 KR 날짜가 있었지만 `premiereConfirmed=false`로 유지돼 수동 게시에서 제외됐음. 4건의 현재 후보 revision을 변경하지 않고 공식 근거 수동 검토했으며 검토 4건 모두 `reviewed=true, published=0` 출력.
- 확정 첫 공개 파일 `data/lineups/netflix-kr-2026-11-four-premieres-confirmed.json` 생성, 이전 미확정 스냅샷은 보존. 4건은 새 `work-000014~017`, `event-000014~017` 키로 기존 매핑에 추가, 시간대 미공개로 `date_only`.
- StreamPick-only 11건 재대조: `official_kr_premiere_candidate` 6 (이번 4+DATA-38 2), `official_date_conflict` 1, `tmdb_date_and_provider_only` 1, `tmdb_date_only` 3. `오버액션 갱` StreamPick 11/04 vs Netflix KR 11/05 충돌 유지.
- `npm run publish:reviewed -- --file data/curated/ott-reviewed-mappings.json` 성공, 전체 로컬 `ott_reviewed` **17건**, 11~12월 **15건**. `npm run audit:ott-published`에서 신규 4건 모두 `published_match`; StreamPick 35행 참조 중 직접 일치 6, 시즌 미검증 3, 미게시 26.

## 검증·인계

- `node scripts/reconcile-streampick-gaps.mjs /private/tmp/streampick-tmdb-11-audit.json data/lineups /private/tmp/streampick-gaps-reconciled.json work/ott-candidates/state.json`: 11건 유지, 분류 위와 일치. 기존 비교기의 `publishedCountDelta: 0`은 이 비교기가 DB에 쓰지 않는다는 의미.
- 보완 회귀 테스트는 실제 확인 lineup과 과거 미확정 lineup을 합쳐 첫 공개 4건 + 날짜 충돌 1건을 검증. `npm test` 전체 **130/130 통과**, `git diff --check` 통과. 최초 기본 sandbox에서 기존 dist unlink `EPERM` 발생 후 허용된 실행에서 성공.
- 다음: `오버액션 갱` 날짜 충돌 원인 StreamPick에 반영 제안, `전지적 집착 시점` 및 `Alicia's Law`·`문무`·`나인 투 식스` 실제 KR 원천 공개 근거 확인. 아직 StreamPick 전체와 건수 일치하지 않음. 독립 verifier/클라우드/실기기 배포 미실행. LEARN-ID 없음(기존 reviewed 파이프라인에 실근거 추가).
