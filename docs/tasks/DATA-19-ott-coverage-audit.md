# DATA-19 · 2026년 11~12월 OTT 수집 커버리지 진단

- Requirement: OTT 한국 최초 공개일, 4개 플랫폼, 신작·새 시즌·신규 입점 구분. 제품 공개는 검토된 일정만.
- 상태: 진단·외부 목록 제목 대조·공식 근거 후보 2건 추가 완료 / 전수 자동 수집·제품 DB 게시 미완료.
- 범위: backend read-only 진단, 외부 참고 35개 제공처별 작품 행 비교, 공식 근거 확인 후보 2개, 단위 검사.
- 기존 checkout: backend `codex/app-auth-phone-ready` `ff263e5` clean, app `3541d05` 개인 signing dirty 보존.
- 예상 실패: 글로벌 Netflix 후보를 KR 게시물로 오인, TVING+Wavve 목록을 TVING 단독으로 간주, 12월 수집 누락, 서로 다른 출처/OTT 중복 합산, 회차를 신작으로 오인.
- LEARN-ID: 해당 없음(수집 제품 진단, 일반화 학습 자료 미작성).

## 2026-11-11 조사

StreamPick 월별 페이지는 11월 Netflix 16·TVING 9·Disney+ 4, 12월 Netflix 2·TVING 3·Disney+ 1을 표기한다.
URL: https://streampick.io/calendar/2026-11/ / https://streampick.io/calendar/2026-12/.
이는 외부 참고목록이며 **KR 실제 서비스별 최초 공개일을 공식적으로 검증한 결과가 아니다**. 여러 OTT에 걸친 작품은 각 제공처 숫자에 중복되고, 12월은 아직 발표/등록이 적다. Coupang Play에 해당 월별 요약 숫자가 없어 null로 기록한다. 회차 정보는 작품 출시일과 분리한다.

로컬 저장된 `work/ott-lineups/state.json` 88건을 진단 명령으로 재집계:

| 월 | 제공처 | 날짜 있는 후보 | KR 최초공개 근거 플래그 | 외부 비교 건수 |
|---|---|---:|---:|---:|
| 11월 | Netflix | 71 | 2 | 16 |
| 11월 | TVING | 7 | 0 | 9 |
| 11월 | Disney+ | 2 | 1 | 4 |
| 11월 | Coupang Play | 0 | 0 | 미집계 |
| 12월 | Netflix | 0 | 0 | 2 |
| 12월 | TVING | 2 | 0 | 3 |
| 12월 | Disney+ | 0 | 0 | 1 |
| 12월 | Coupang Play | 1 | 1 | 미집계 |

88건 대부분이 자동 수집 결과가 아닌 **11월 글로벌 Netflix 목록 수동 전사 69건**, TVING Ads 후보 11건 등이다. 현 `prepare-ott-lineup`은 시장/최초공개 검증 없이 `market=null, premiereConfirmed=false`를 허용하도록 의도됐으며, staging은 공식 RSS 후보 저장소와 분리돼 제품 DB로 게시되지 않는다. 즉 `88건 수집`을 `88건 한국 정규화 완료` 또는 `88건 게시`로 말하면 안 된다. 최신 DB 게시 9건은 DATA-16의 로컬 실행 기록이며 이번 진단은 DB를 재조회하지 않았다.

## 재실행

```sh
node scripts/audit-ott-coverage.mjs work/ott-lineups/state.json data/reference/streampick-2026-11-12-counts.json
node --test tests/ott-coverage.test.mjs
node scripts/compare-ott-reference.mjs
node --test tests/ott-reference-compare.test.mjs
```

`referenceLeadGap`은 **조사 우선순위 참고 숫자**일 뿐이고 외부 사이트에서 검증된 누락이나 실제 수집률이 아니다. `publishedCount=null`은 DB 미조회 표기다.

### 제목 단위 누락 비교 및 공식 근거 보강

- StreamPick 11월·12월 월별 표시 중 대상 3개 OTT(Netflix/TVING/Disney+)의 제공처별 **35개 행**을 `data/reference/streampick-2026-11-12-titles.json`에 검토 기준으로 정리했다. 사이트 자체에 해당 월 Coupang Play 신작 요약은 없어서 이 목록만으로 Coupang Play의 0건을 추정하지 않는다.
- `compare-ott-reference.mjs`는 월·OTT·제목·시즌별로 staging과 대조하여 누락 제목과 날짜 불일치를 출력한다. **처음 88건 staging과 비교했을 때 35행 중 32행은 제목 매칭도 없었다.** Netflix 글로벌 목록의 영어 제목과 한국어 제목 표기 차이도 있을 수 있으므로 모두 실제 미수집 작품이라고 단정할 수 없다.
- Netflix 한국 뉴스룸 공식 공지 `천천히 강렬하게`(12/11)를 KR 최초 공개 근거로 추가했고 Disney+ 공식 한국 홈페이지의 `스타일 워즈`(11/11)는 **한국 스트리밍 날짜만** 확인하여 최초 공개 근거는 false로 보존했다. 두 건 staging 추가로 **88→90 후보**, 재비교 결과 **35행 중 30행 제목 매칭 없음**. 제목 매칭 5행, 날짜 일치 5행, 이중 KR 최초 공개 근거 플래그 3행. **DB 신규 게시 0**.
- StreamPick 11월·12월 총합 숫자는 해당 사이트의 등록 현황이고 전체 신규 입점 수가 아니다. 매주 회차는 별도 캘린더로 분리되어 있으며, 방송 전용 작품·Wavve·Watcha 등 4개 대상 밖의 플랫폼이 합산돼 보이는 점을 확인했다. 제3자 데이터만으로 KR 최초 공개를 인증하거나 게시하지 않는다.
- 검증: `node --test tests/ott-coverage.test.mjs tests/ott-reference-compare.test.mjs` **4/4 통과**. 전체 `npm test`는 기존 `dist` 파일 unlink EPERM/Node20 (프로젝트 요구 Node24) 문제로 이번 작업에서 통과 확인 못함. 실행 환경 제약으로 외부 사이트 직접 HTTP 자동 수집 실행 불가(DNS resolve 실패), 실DB 재조회·실폰 연동 미실행.

## 필요한 후속 작업

1. 매일 Netflix 한국 공개 목록, TVING 작품별 한국 최초 공개, Disney+ KR, Coupang Play KR를 페이지별·월별 증분 수집하고 11~12월 coverage 로그를 남길 것. RSS 공지 수집만으로 월별 편성표를 대체하지 않는다.
2. 외부 캘린더와 차이를 제목·시즌·제공처·시장·공개 사건 단위로 대조하되 해당 참고 사이트의 날짜를 공식 근거로 무조건 승격하지 말 것. 새로운 입점은 신규 시즌/최초 공개와 별도 eventType으로 정의(계약·DB 변경 선행).
3. `lineup staging → 공식 출처 검토 → candidate/review → stable mapping → publish` 경로 연결. 날짜·시장 확인 실패, 포스터 권리 불명, 방송 편성만 확인된 항목은 보류 목록에 남길 것.
4. 2026-11-11~12-31 100건 목표는 검증된 예상 실적이 아닌 제품 수집 목표로 추적. 플랫폼별 공식 공개 후보 수/검토 수/게시 수/보류 사유를 분리하고 실제 coverage를 측정할 것.

## 자체 검사 및 인계

- `node --test tests/ott-coverage.test.mjs`: 2/2 PASS.
- `node scripts/audit-ott-coverage.mjs ...`: exit 0, 위 표 재현.
- API 계약/DB migration/독립 verifier 승인 불변. app 개인 signing 파일 유지. 배포·폰 실제 조회 미실행.
