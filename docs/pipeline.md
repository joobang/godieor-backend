# 수집 파이프라인 뼈대

```text
ProviderAdapter.fetch(scope, mode)
  → normalize(출처 자료·분야·지역·시간 정밀도 검증)
  → provider+external_id+variant 매핑
  → 한 scope의 이벤트·출처·변경 이력·catalogRevision 원자적 publish
  → API 읽기 snapshot → 캘린더/목록
```

현재 FixtureAdapter 하나만 등록했고 네 분야 scope를 제공한다. 실제 API 호출은 없다.
provider별 PostgreSQL session advisory lock으로 동시 실행을 제한한다. 수집 I/O는 DB publish 트랜잭션 밖에서 수행한다.
실행 시작/성공/실패와 성공 수집 시각을 분리한다. 실패는 기존 이벤트/마지막 성공 시각을 지우지 않는다.
원본이 목록에서 사라졌다는 이유만으로 취소하지 않는다. 변경·취소는 제공처의 명시 근거로 갱신해야 한다.

원본은 실행 중 메모리에서 읽고 canonical snapshot/출처 키·URL/관측 시각을 DB에 남긴다.
원본 응답 전체를 영구 보관하는 raw archive, 자동 재시도·dead letter queue, 실제 제공처별 rate limit/timeout은 다음 어댑터 구현에서 추가한다.
실제 출처는 scope 단위로 페이지를 모두 모으고 정규화해야 한다. 초기 이력 backfill은 무료 할당량에 맞춰 구간으로 나눌 계획이다.
어댑터 fetch timeout·페이지 종료·누락을 확인하기 전 실제 수집 완료로 표시하지 않는다.

정식 검증은 아직 없다. 실패/동시 실행/반복 수집/연기 이력·접근 경계의 독립 검사는 별도 작업이다.


## 선행 후보 수집 · DATA-02A

제품 Pipeline 앞의 [공지 후보 CLI](ott-candidates.md)를 추가했다. 별도 수동 실행이며 자동 스케줄은 아직 연결하지 않았다.
실제 RSS 후보→검토/날짜 보류→내보내기를 실행했다. 검토 내보내기→제품 ProviderAdapter/Canonical/publish 연결은 후속이다.
기존 FixtureAdapter만 등록된 상태와 후보 수집을 구분한다.
