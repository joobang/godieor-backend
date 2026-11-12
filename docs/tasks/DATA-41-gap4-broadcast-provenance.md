# DATA-41 · StreamPick 잔여 4건 국내 원천 날짜 검증

- Requirement: PROD-005/007/009, 제품 OTT 국가·플랫폼별 시즌 최초 공개 정책. 상태: 구현 완료, 독립 검증 대기.
- 담당: backend 구현, 기준 backend `7a3e305` (`codex/app-auth-phone-ready`), app `10bbb24`, verifier `62e137b`; 기존 dirty 보존.
- 범위: DATA-40 미게시 4건의 날짜 의미를 공식 출처로 구분하는 별도 정적 근거·read-only 감사·회귀 검사. 계약·DB schema·기존 게시 내역 변경 없음.
- 예상 실패 사례: 방송사 첫 방영일을 Netflix/TVING 한국 첫 서비스일로 잘못 승격, TMDB 글로벌 날짜와 국내 서비스 날짜를 UTC 하루 차이로 추정, 예능을 드라마로 오인, 타인 미커밋 파일 덮어쓰기.

## 2026-11-12 원천 조사 결과

| StreamPick 행 | 원천 공식 날짜 | 실제 날짜 의미 | 한국 목표 OTT 첫 공개 확인 |
| --- | --- | --- | --- |
| 오버액션 갱 / Netflix 11/04 | Netflix 한국 [신규 콘텐츠](https://about.netflix.com/ko/new-to-watch): 11/05 | Netflix KR 신규 목록 날짜가 StreamPick보다 하루 늦음 | 11/04 아님; 11/05가 최초 서비스인지 별도 검토 |
| 전지적 집착 시점 / TVING 11/08 | [MBC 공식 보도](https://enews.imbc.com/News/RetrieveNewsInfo/522679): 11/08 첫 방송 | **MBC 예능** 첫 방송일 | TVING 시즌1 첫 제공 날짜 미확인 |
| 문무 / Netflix 11/14 | [KBS 공식 홈페이지](https://www.kbs.co.kr/): 11/14 21:20 첫 방송 | **KBS2 드라마** 첫 방송일 | Netflix 첫 제공 날짜 미확인. 기존 TMDB KR 제공처 조회는 wavve 표시 |
| 나인 투 식스 / Netflix 11/25 | [SBS 공식 프로그램 소개](https://programs.sbs.co.kr/drama/ninetosix/about/90022?div=tv_total_new): 11/25 21:00 첫 방송 | **SBS 드라마** 첫 방송일 | Netflix 첫 제공 날짜 미확인(조사일 기준 미래 일정) |

### 반영

- `data/reference/streampick-2026-11-12-gap4-source-provenance.json`에 원천 날짜, 종류, 방송사, 원문 URL을 저장했다.
- `scripts/audit-ott-gap-provenance.mjs`는 기존 StreamPick 11건 모집단에 속하는지 검증하면서 방송 날짜/OTT 날짜 충돌을 구분한다. 타 플랫폼 날짜를 `publishEligible`로 승격하는 경로 없음.
- 결과: `target_ott_date_conflict` 1건, `broadcast_date_not_target_ott_premiere` 3건. **기존 7/11 정확 게시 일치, 4/11 미게시 유지**. 이것은 원인 분류 진전이며 건수 맞추기용 데이터 적재가 아니다.
- `전지적 집착 시점`은 방송사 기준 예능으로 확인. OTT 대상 장르 정책과 별도 검토하며 임의로 삭제하거나 등록하지 않음.

## 검증·인계

- `node --test tests/ott-gap-provenance.test.mjs`: 3/3 PASS.
- `node scripts/audit-ott-gap-provenance.mjs`: 4개 원천 대조, 날짜 충돌 1/방송일 재사용 3, exit 0.
- `npm test`: 전체 **135/135 PASS**(exit 0). 첫 기본 sandbox 실행은 기존 `dist` unlink 권한 `EPERM`으로 중단; 허용된 실행에서 정상 완료.
- `git diff --check`: 작업 종료 시 확인. 최종 커밋 SHA는 Git 이력으로 확인.
- 변경으로 인한 계약/migration digest 변동 없음; app/verifier 코드 수정 없음. 독립 검증, 배포, 실기기 반영 미실행.
- 다음: 방송사와 별도인 **TVING·Netflix 한국 작품/시즌별 첫 제공 근거**가 있으면 동일 플랫폼/시장/시즌일 때에만 reviewed 후보로 넘긴다. StreamPick의 분모는 제3자 참고용이고 한국 OTT 첫 공개 진실 집합으로 간주하지 않는다.
- ADR/LEARN-ID: 해당 없음(기존 날짜 정책의 실증 및 재사용 가능한 감사 도구).
