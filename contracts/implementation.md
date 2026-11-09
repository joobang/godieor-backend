# 계약과 로컬 구현 범위

2026-11-09 / 0.1.0-draft.2. API 계약 전체 완료나 독립 검증 PASS를 뜻하지 않는다.

| 범위 | 현재 상태 |
|---|---|
| 공개 /catalog/options, /calendar, /events, /events/:id, /contents/:id | Prisma/실제 로컬 DB 조회 구현 |
| /health | 로컬 운영용 DB 연결 상태, v1 prefix 사용. 제품 계약 외 운영 경로 |
| 수집 | fixture 어댑터 1개, 네 분야 scope. 정규화·출처 키 매핑·잠금·원자적 저장·상태 기록 구현 |
| 일정·작품·시즌·팀·계정/찜 스키마 | 23개 Prisma 모델과 초기 migration 적용 |
| Google/서비스 세션 | 미구현. /auth/google은 503 AUTH_NOT_IMPLEMENTED |
| /me 전체·세션 폐기 | 아직 유효 세션을 발급하지 않음. 어떤 bearer도 승인하지 않고 401 |
| 찜/설정 쓰기·개인 달력 | 스키마/계약만, 기능 미구현 |
| 공개 API 요청 제한 | 429는 계약에 있지만 제한기 구현 전 |
| 일일 갱신 | 06:00 KST 스케줄 뼈대, 기본 OFF. 켜도 현재는 fixture만 연결됨 |
| 실제 제공처 | 아직 연결하지 않음. 조사 결과는 docs/data-source-assessment.md |

빌드·migration·클라이언트 생성·가상 수집·API 구동/응답 조회를 수행했다. 테스트 코드는 추가하거나 실행하지 않았다.
현재 verifier evidence v1은 이 backend/DB를 검증하지 않는다. 작성자의 확인을 독립 통합 검증으로 표현하지 않는다.
