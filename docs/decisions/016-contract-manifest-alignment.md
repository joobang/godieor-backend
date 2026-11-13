# ADR-016 · 기존 계약 변경과 manifest/소비자 참조 정리

- 2026-11-13. 상태: 구현 담당의 호환성 검토·정리 초안, 독립 승인 아님.
- 원본 작업 DATA-48. LEARN-0005(계약)·LEARN-0015(검사 범위) 연결.

## 실제 문제

고정 backend 9f7e1b2의 openapi.yaml/database.sql은 manifest에 적힌 해시와 달랐다. 앱/검증기 reference는 이전6258118 계약을 가리켰고 정식 runner가 snapshot 준비에서 거부했다. 과거 작성자 npm test 성공은 이 binding 오류를 검증한 결과가 아니었다.

## 검토와 선택

기존6258118 이후의 실제 API 변경은 ios/android Device 추가, nullable Event.ottCategory 추가, settings.devices 최대4→6이었다. 현재 iOS는 문자열 분류와 nullable 필드를 읽고 서버 기기 선택값을 사용하므로 소비 가능하다. 새 유형이나 API 동작을 추가하지 않고 현행 내용을0.1.0-draft.3에 고정한다. 참조DDL에 빠진 OTT분류 컬럼·CHECK도 기존202611100001 migration과 맞춘다. 실제 migration은 변경하지 않는다.

manifest는 각 계약 파일 실물의 SHA-256으로 다시 만들고 backend commit 이후 app/verifier reference를 같은 manifest와 전체 runtime 파일 집합으로 연결한다. draft-not-approved/독립review pending 상태는 유지한다. 승인 기준·필수 검사·판정을 낮추지 않는다.

## 검증과 남은 범위

참조DDL과 migration DB의 OTT movie/series 허용·잘못된 분류 거부를 임시DB로 비교하고, 고정 소스 runner로 compile/CJS+ESM/API/DB/iOS를 실제 실행한다. 결과는 DATA-48에 기록한다. 다큐/애니 지원과 제품 범위 정리는 별도 사용자 결정이며 이 ADR로 확정하지 않는다.
