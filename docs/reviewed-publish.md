# 검토한 OTT 후보를 제품 일정으로 반영

이 단계는 공식 공지의 작성자 검토를 제품 DB로 옮기는 수동 절차다. 자동 전수 수집·독립 승인과 구분한다. Google/개인 API 구현과 무관하다.

```sh
npm run build
npm run publish:reviewed -- --file data/curated/ott-reviewed-mappings.json
```

Node24와 로컬 `.env`/migration 완료 PostgreSQL이 필요하다. CLI는 현재 작업 디렉터리의 `work/ott-candidates/state.json`을 읽는다. 후보 상태 파일과 비밀 설정은 Git에 넣지 않는다. 다른 장치에서는 후보 수집/공식 링크 등록·검토를 먼저 재현해야 한다. 오래된 검토/매핑이면 실패하므로 강제로 revision을 바꾸지 말고 근거를 재확인한다.

## 매핑과 경계

`data/curated/ott-reviewed-mappings.json`은 공개 출처 후보 ID/revision과 수동 고정한 contentKey/eventKey를 기록한다. 이 키는 제목·날짜·시즌에서 계산하지 않고, 날짜/제목 정정 시 그대로 사용한다. DB UUID는 별도로 유지된다. 기존 키를 다른 국가/플랫폼/작품에 재사용하지 않는다. 알려진 시즌이 바뀌거나 null로 퇴행하면 거부하고, 새 시즌은 별도 eventKey로 등록한다. 미정 시즌에 근거가 생겨 번호를 보완하는 경우는 허용한다.

한 후보의 검토는 현재 한 작품/한 공개 사건만 표현한다. 여러 작품을 담은 공지에서 임의의 나머지 작품을 생성하지 않는다. 같은 제목만으로 자동 병합하지 않는다. 서로 다른 국가/서비스는 서로 다른 이벤트다.

매핑 version1은 `candidateId`, `revision`, `contentKey`, `eventKey`, 선택적 `sourceUrl`을 받는다. 명시적 공식 query-free permalink가 필요한 CJ 공지에는 sourceUrl을 사용한다. 같은 공식 호스트여도 정확히 같은 공지인지는 검토자가 확인해야 한다. 소스 간 작품 자동 연결/기존 다른 provider 중복 해소는 아직 없다.

현재 검토 revision과 정확한 날짜·국가·OTT·드라마·최초 공개 근거를 확인한 뒤 전체 입력을 정규화한다. 시각+시간대가 모두 있고 DST로 모호하거나 존재하지 않는 시간이 아닐 때만 instant로 변환한다. 시간대가 없으면 날짜만 반영한다. 게시일/관측 시각을 sourceUpdatedAt으로 대입하지 않는다.

후보 파일 writer lock을 DB 반영 종료까지 유지한다. DB identity 검사는 기존 provider advisory lock 안에서 수행한다. 기존 수집 Service/Repository의 scope별 트랜잭션을 재사용하며 실패 시 기존 이벤트·마지막 성공 수집 시각을 보존한다. 전처리/identity 오류는 첫 scope 반영 전에 거부하지만 DB 장애 시 여러 국가를 아우르는 전체 배치의 원자성은 보장하지 않는다. 성공/실패 결과를 확인하고 같은 키로 재실행한다.

ReviewedOttModule은 수동 CLI만 사용한다. API의 fixture scheduler에 연결하지 않았으며 매핑 파일 없이 자동 실행하지 않는다. 출처 coverage는 partial이다. 파일 잠금은 같은 로컬 후보 디렉터리의 writer 협약이며 여러 호스트를 아우르는 잠금/OS 권한 격리가 아니다.

## 로컬 실행 사실 · 2026-11-09

공식 페이지의 날짜를 다시 확인하고 검토 4건을 제품 DB에 수동 반영했다. 동일 매핑을 두 번 실행해 provider 이벤트는 4건, 변경 이력도 최초 4건으로 유지됐다. 기존 가상 7건은 보존했다.

| 작품 | 서비스 | 공개 날짜 | 시즌 | 근거 |
|---|---|---|---|---|
| 천천히 강렬하게 | Netflix | 2026-12-11 | 미표기 | [공식 공지](https://about.netflix.com/ko/news/tantara-date-announcement) |
| 하우스 오브 드래곤 시즌3 | Coupang Play | 2026-06-23 | 3 | [공식 공지](https://news.coupang.com/archives/63151/) |
| 유미의 세포들 시즌3 | TVING | 2026-04-13 | 3 | [CJ 공지](https://cjnews.cj.net/?p=75075) |
| 비엔나 게임 | Disney+ | 2026-11-18 | 미표기 | [공식 작품 페이지](https://www.disneyplus.com/ko-kr/browse/entity-5bd39bd1-01a0-4c7a-bb7a-c0eb4f2c7088) |

현재 검토 입력의 timeZone은 모두 null이므로 네 건 모두 date_only다. 매체별 시간 관행을 추정하지 않았다. 공식 페이지의 변경 가능성·RSS 누락·실제 인증 API/전수 coverage 한계는 유지한다. 원 조사 파일은 조사 시점 미반영 사실을 보존한다.

새 Nest HTTP 인스턴스에서 상세 4건·Disney+ 11월 달력·health mixed를 확인하고 종료했다. 기존 3000 포트의 이전 프로세스를 재시작하지 않았다. 새 코드는 `npm start`로 실행할 수 있다. health의 realProvidersConnected는 provider 행의 존재를 뜻하며 실시간 외부 인증/접속 점검이 아니다.

검사: `npm test` 47개 통과. `npm run test:db`는 일회용 PostgreSQL에서 반복 저장/날짜·시즌 보완/identity 변경 거부/오래된 매핑/불완전 배치를 검사한다. 실제 로컬 DB를 삭제하는 검사가 아니다. 자세한 실행 기록은 [DATA-02B](tasks/DATA-02B-reviewed-publish.md), 결정은 ADR-013 / LEARN-0011이다.
