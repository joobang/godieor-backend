# OTT 공지 후보 수집·검토 CLI

DATA-02A / Node 24 / 수동 실행. 제품 API·PostgreSQL과 분리된 공개 전 staging이다.

## 실행

```sh
npm run build
npm run test:candidates
npm run candidates -- collect
npm run candidates -- list
npm run candidates -- add --file /경로/공식링크.json
npm run candidates -- review --file /경로/검토.json
npm run candidates -- export
```

collect는 Netflix 한국어 RSS/Coupang 뉴스룸/CJ 뉴스룸의 robots 확인 후 고정 URL만 요청한다.
일반 봇 제한을 따르고 타 봇으로 가장하지 않는다. 응답당 2MB·20초, redirect 거부, DTD/entity 선언 거부.
정규식 XML 파서를 만들지 않고 fast-xml-parser 5.12.0을 고정했다.
Disney+는 자동 요청하지 않는다. 공식 한국 페이지/공지를 읽어 확인한 링크를 add/review로 입력한다.
후보 목록에는 기업·예능·영화 뉴스도 있다. 작품 플랫폼을 발행사 이름에서 추정하지 않는다.
자동 하루 갱신/과거 전체 채우기는 아직 연결하지 않았다. 수집 한 번의 성공은 2026 전체 coverage가 아니다.

## 검토 전 입력과 정확한 날짜 기준

add JSON 예시(가상 입력, 실제 페이지라고 표현하지 않음):

```json
{"source":"disney","url":"https://www.disneyplus.com/ko-kr/browse/example","headline":"가상 작품","publishedRaw":null,"evidenceRevision":"직접 확인한 근거 버전"}
```

source는 netflix/coupang/cj/disney 중 하나다. URL은 해당 공식 host의 https만 허용한다.
단순 추적 쿼리는 제거한다. CJ의 ?p=숫자는 후보 링크로 보존하지만 제품 연결 때 canonical URL과 계약 제약을 대조해야 한다.
본문은 저장하지 않고 RSS 본문/제목/게시일의 fingerprint만 저장한다. 수동 evidenceRevision은 관찰 버전 식별자이며 실제 HTML hash라고 주장하지 않는다.

list에서 id와 현재 revision을 복사해 검토 JSON을 만든다. reviewer는 실제 작성자/운영자 식별명이며 제품 승인자/독립 reviewer의 신원을 가장하지 않는다.

```json
{
  "id":"list의 64자리 id", "revision":"list의 현재 64자리 revision",
  "reviewer":"실제 확인 담당 식별명", "title":"가상 작품",
  "platform":"disney_plus", "market":"KR", "contentKind":"drama", "premiereConfirmed":true,
  "date":"2027-02-28", "localTime":null, "timeZone":null, "seasonNumber":null,
  "announcedYear":null, "announcedPeriod":null,
  "evidence":"공식 본문의 작품/시장/플랫폼/최초 공개일 확인 근거"
}
```

date가 null이고 announcedYear/announcedPeriod만 있으면 보류된다. 연월·분기에서 날짜를 만들지 않는다.
2026 이전, 시장/플랫폼 미확인, 드라마/최초 공개 근거가 없으면 내보내기에서도 제외한다.
시즌 번호와 시각은 필수가 아니다. 시간대가 없는 로컬 시각을 UTC instant로 바꾸지 않는다.
유효하지 않은 일자·시간대·시간·연도 충돌을 거부한다. 시각의 DST 모호성→instant 변환은 후속 publish 설계 대상이다.

## 파일·변경·실패

- 상태: `work/ott-candidates/state.json`, 검토 후보: `work/ott-candidates/reviewed.json`. Git 제외, 새 파일 모드 0600.
- 로컬 JSON staging을 택했다. 제품 PostgreSQL/마이그레이션은 그대로이며 별도 DB 서버를 늘리지 않는다.
- 공지 URL 기반 안정 id와 내용 hash/변경 회차 token을 분리한 revision 이력을 유지한다. 동일 RSS 반복은 중복 생성하지 않고 fingerprint 변경 시 검토를 무효화한다.
- RSS fingerprint는 전체 원문 수정 탐지가 아니다. 전체 본문이 RSS에 반영되지 않으면 재검토가 누락될 수 있어 publish 전 근거 재확인이 필요하다.
- 수동 add의 evidenceRevision과 RSS fingerprint는 별도 관찰 방식이다. 같은 URL을 다른 방식으로 다시 관찰하면 보수적으로 검토가 초기화될 수 있다.
- collect/add/review는 시작 시 이전 reviewed.json을 무효화한다. 최신 검토 상태에서 export로 다시 생성해야 한다.
- A→B→A처럼 내용이 되돌아와도 발생 token이 달라 오래된 검토 입력을 거부한다.
- 저장 format은 v2다. v1 파일을 읽으면 후보/이력을 보존해 변환하고 구버전 검토/내보내기를 무효화하므로 새 token으로 재확인한다. 미지원/손상 형식은 내보내기를 지우기 전에 거부한다. 기존 제품 데이터 migration과는 무관하다.
- 소스 하나가 실패해도 기존 후보/다른 소스 성공은 보존하고 CLI는 종료 코드 1로 부분 실패를 알린다.
- writer.lock의 배타 생성과 임시 파일 rename으로 동시 쓰기/부분 기록을 제한한다. 충돌 시 재시도하며 임의 lock 삭제를 하지 않는다.
  비정상 중단으로 lock이 남으면 실제 실행 프로세스가 없음을 확인하고 운영자가 복구한다. 프로세스/전원 장애의 완전한 내구성 보장은 아니다.

export는 검토 후보 파일일 뿐 제품 DB에 publish하지 않는다. 기존 API는 여전히 fixture다.
현재 검토는 공지별 선택한 작품 한 건이다. 다작품 공지 분해, 다른 공지의 동일 작품 병합, 신뢰할 수 있는 작품/시즌 키,
공지 정정 시 동일 이벤트 유지, 검토 후보→Canonical adapter는 후속이다.

## 실제 실행 · 2026-11-09

실제 RSS 15/12/50 = 공지 77개를 수집했다. 작품 77개라는 의미는 아니다.
공식 링크 4건을 작성자 근거 확인으로 입력하고 4개 후보를 내보냈다(총 공지 후보 80개, 기존 URL 중복 포함).
Netflix 천천히 강렬하게 / Coupang 하우스 오브 드래곤 시즌3 / TVING 유미의 세포들 시즌3 / Disney+ 비엔나 게임이다.
시각이 있는 세 후보도 명시적 timezone 확인 전에는 null로 두고 date_only로 내보냈다. 없는 시즌 번호는 null이다.
이 네 건은 자동 정확도·사용자 승인·독립 검증 결과가 아니다. 실제 웹 근거는 DATA-01 조사 원본 및 이번 작업 카드에 연결한다.

## 후속 제품 반영 · DATA-02B

현재 검토본의 명시적 고정 키 매핑을 받아 수동 publish하는 [별도 절차](reviewed-publish.md)를 구현했다. 이 문서의 export는 여전히 중간 후보 파일이며 자동 제품 공개/독립 승인이 아니다.
