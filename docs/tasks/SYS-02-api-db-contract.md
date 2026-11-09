# SYS-02 · API·DB 계약 초안

- 날짜: 2026-11-09 KST. requirement: PROD-001~010. 범위: backend 계약 + app 소비 메모 + verifier 검토 제안/학습.
- 사용자 확정: 시즌 최초 공개, 공개 조회/인증 저장, 영화·OTT 기본, 작품·일정 찜, 하루 1회 갱신, V1 알림 제외.
- 기술 제안: OpenAPI 3.1.1, 관계/제약 DDL, 62일 요청 폭/50~100 페이지, revision 재조회, opaque session/30일 제안.
- 완료 기준: 리뷰 가능한 정의·DB 관계·가상 응답·소비/검토 관찰점·내용 digest. 런타임 구현 완료가 아니다.
- 예상 실패: 날짜만 값을 UTC 자정으로 왜곡, nullable CHECK 우회, 잘못된 시즌/작품 연결,
  수집 중 월 합계와 페이지 버전 혼합, 찜 합집합 중복, 다른 사용자 데이터 노출, 설정 분실 갱신.

## 변경 전후

변경 전에는 정책/아키텍처만 있고 계약 파일은 없었다.
이제 contracts/openapi.yaml·database.sql·database.md·README·가상 응답·manifest가 있으며 실행 코드는 없다.
DB가 직접 보장하는 FK/CHECK와 최소 연결 수/지원 국가 등 도메인 검사 책임을 구분했다.
한글 커밋 지시를 세 AGENTS와 공통 정책에 반영했다. 기존 이력은 재작성하지 않았다.

## 실제 수행한 형식 점검

| 명령/작업 | 결과 |
|---|---|
| Ruby YAML.safe_load(OpenAPI) | 종료 0, 14 경로/33 schemas 파싱 |
| Python JSON 모델 대조·내부 ref·operationId/path/security 선언 확인 | 종료 0, 내부 참조 156개/operation 17개 확인 |
| 공통 문서 byte 비교·Markdown 로컬 링크 존재 확인·JSON 구문 파싱 | 종료 0 |
| SHA-256 manifest 파일 대조·git diff --check | 종료 0 |
| acceptance.yaml과 git show HEAD 파일 byte 비교 | 동일, 수정/승인하지 않음 |

위 결과는 작성자가 수행한 문서 형식 점검이다. 정식 OpenAPI 전체 meta-schema 검증, SQL 파싱/DB 적용,
Prisma schema 검증, Google 실제 로그인, iOS 실행, 제품 테스트와 독립 리뷰는 실행하지 않았다.
유료 가입·외부 배포·push도 하지 않았다.

## 버전/후속 handoff

작성 시작 base SHA:

- app: `ec5308287079f0e43e5c40140f21cb8a10963229`
- backend: `83c05945110f7bc5c47d0ce548de37d178530130`
- verifier: `8403161a560abeee07ef00b9365c582f971c4ebd`
- acceptance digest: `c4906283810c8b378800b67930028685a41b6a051923ea9f9415346b2d657063` (draft, 미승인)

이 기록 작성 시 변경은 미커밋이었다. 최종 backend 계약 commit과 파일 digest는 app/docs/api/contract-reference.json,
verifier/docs/contracts/reference.json에서 고정한다. migration 집합은 아직 없다. 계약 DDL은 migration 증거가 아니다.
후속 독립 검토자는 고정 commit/manifest와 제품 정책을 입력으로 사용하고 구현 대화는 상속하지 않는다.
현재 verifier v1은 이 API/DB 조합을 실행 검증하지 못하며 통합 PASS를 생성하지 않는다.

## 결정·학습

원본 ADR-008, 통합 LEARN-0005. 종류는 예방 설계이며 실제 장애/운영 성과나 사용자 이해 완료로 기록하지 않는다.
다음 작업은 계약 소비자·독립 검토, 로컬 도구 버전 고정, Prisma schema/migration·NestJS fixture API다.
