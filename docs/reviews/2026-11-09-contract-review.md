# 계약 작성자 검토 · SYS-02 / BE-01

- 입력: 계약 0.1.0-draft.1, 정책 SYNC-2026-11-09-12, 관련 DB DDL.
- 출력: 0.1.0-draft.2와 로컬 공개 조회/가상 수집 구현.
- 검토 주체: 구현 담당인 같은 대화의 작성자. 독립 AI 리뷰/승인/PASS가 아니다.

| 발견 | 영향 | 반영 |
|---|---|---|
| 외부 팀 식별자 매핑 누락 | EPL 경기를 수집할 때 팀 이름으로 중복·오병합 위험 | team_source UNIQUE(provider, external_id) + 내부 Team FK |
| 계약 DDL과 Prisma 표현 차이 | CHECK/부분 인덱스를 모델만으로 재현했다고 오인 | 초기 SQL migration에 제약 보존, 스키마와 책임 분리 |
| JSONB 객체 키 순서 | 재수집 시 내용이 같아도 변경 이력 생성 가능 | canonical snapshot의 키를 정렬해 비교 |
| source key에 날짜를 넣는 설계 위험 | 연기 시 새 이벤트로 생성돼 찜 연결 단절 | 외부 ID+고정 variant로 매핑, 날짜는 UPDATE |
| 부분 정규화/저장 실패 | 한 scope의 일부 데이터만 공개될 수 있음 | 전부 정규화 후 트랜잭션 publish, 실패 시 마지막 성공 보존 |
| 날짜 선택·페이지 중 수집 변경 | 합계/목록 혼합 | DB RepeatableRead + catalogRevision 비교/409 |
| 도메인 제약과 단일 행 CHECK 혼동 | OTT 서비스/게임 기기가 없는 이벤트 공개 | publish 전에 kind/서비스/기기/시즌 관계 검증 |

구성 실행: migration deploy 완료, 23 모델 introspection/Prisma client 생성, TypeScript build 완료,
가상 7건 수집과 로컬 API 구동·응답 조회. 이는 테스트 suite/회귀 검사/독립 DB 검증 결과가 아니다.
실패/경합/보안 반례와 실제 제공처 응답은 아직 검증하지 않았다. acceptance는 draft 그대로다.
