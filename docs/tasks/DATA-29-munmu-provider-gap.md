# DATA-29 · 문무 국가/플랫폼 메타데이터 누락 추적

- Requirement: PROD-005/007/009, ADR-015. 구현 세션 `codex-context-01`, backend base `e6afef7`, branch `codex/app-auth-phone-ready`. 변경: TMDB 검증기·대조 분류·단위 검사. 예상 실패: 한국 제작국과 국내 OTT 배포를 동일시하거나, 특정 OTT 미등재를 국내 작품 부재로 판단.

## 2026-11-12 실 API 확인

- `/tv/301354`: `name=문무`, `first_air_date=2026-11-14`, `origin_country=[KR]`, `production_countries=[KR]`, `networks=[KBS2]`, 시즌 1 `air_date=2026-11-14`.
- `/tv/301354/season/1`: 첫 회 `air_date=2026-11-14`.
- `/tv/301354/watch/providers`: KR `flatrate=[wavve]`만 존재. Netflix·TVING 미등재. API 성공(HTTP 200). 즉 한국 방송임에도 기존 `Netflix` 일치 필터를 통과하지 못함.
- TVING 공식 작품 페이지 `https://www.tving.com/contents/P001791650`에 **11월 14일 공개** 표시(단, 방송 시점과 TVING 시청 가능 시점은 다를 수 있다고 명시); KBS 공식 `https://www.kbs.co.kr/`에서 **11월 14일 오후 9:20 첫 방송** 확인. StreamPick에는 Netflix/wavve 연관 표시. Netflix 한국 공개일 자체는 공식 Netflix 근거로 확인되지 않았으므로 별도 검토 필요.
- 한국 제작 `origin_country=KR`이나 방송사 `networks`는 국내 방송 첫날에 대한 강력한 단서이나 특정 OTT 첫 공개의 증거는 아니다. `watch/providers`는 현재 제공처 메타데이터라 미래 편성·제공처 누락 가능성이 있다.

## 수정과 검증

- `scripts/verify-streampick-tmdb.mjs`: `originCountries`, `broadcastNetworks`, `koreanOrigin`, `otherKoreanProviders`를 보존. 날짜 일치+한국 제작+목표 OTT 미등재는 `korean_origin_provider_unlisted`로 구별.
- `scripts/reconcile-streampick-gaps.mjs`: 재검토 항목을 `korean_origin_target_provider_unlisted`로 표시. 게시 가능 여부는 여전히 false.
- 단일 작품 실 API 감사 `/private/tmp/munmu-recheck-20261112.json`: 1건 `korean_origin_provider_unlisted`, 오류 0. 대조 `/private/tmp/munmu-reconciled-20261112.json`: 1건 `korean_origin_target_provider_unlisted`, 신규 게시 0. 관련 회귀검사 8/8, backend 전체 테스트 110/110 통과.
- 남은 작업: 동일 방식의 월별 후보 발견 파이프라인 연결, 한국 플랫폼 공식 편성 증거의 자동 후보 수집, 실제 플랫폼별 첫 공개 확인. 배포 및 독립 verifier 승인 없음. LEARN-ID: 해당 없음(수집 provenance 확인).
