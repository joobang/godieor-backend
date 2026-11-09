# BE-01/02 · 로컬 백엔드·DB·파이프라인

2026-11-09 KST / SYS-02, BE-01/02, DATA-01 문서 조사. PROD-001~010 중 공개 조회/저장 기반.
사용자 순서대로 계약 작성자 검토 → 로컬 구성 → 출처 적합성 조사를 수행했다.

## 실제 실행

| 명령/동작 | 결과 |
|---|---|
| npm registry 버전/engines, 기존 Docker·Node 조회 | Node 24.19.0 지원 런타임, Nest 12.4.0, Prisma 7.10.1 안정 버전 선택 |
| npm install | 256 packages 설치, package-lock 고정. 테스트 실행 없음 |
| scripts/setup-local.mjs | 기존 설정 없을 때 전용 .env(0600) 생성, 비밀 출력 없음 |
| docker compose up -d --wait postgres | 신규 godieor-local 전용 네트워크/볼륨/컨테이너, healthy |
| prisma migrate deploy | 202611090001_initial 적용 완료 |
| prisma db pull / prisma generate | 23개 모델 생성, CHECK 미표현 안내 확인. CHECK/부분 인덱스 SQL 원본 유지 |
| npm run build | Prisma client 생성·TypeScript compile 성공 |
| npm run collect:fixture | 영화 2/OTT 시즌 2/기기별 게임 2/EPL 1 = 가상 7건 publish |
| npm start | 루프백 127.0.0.1:3000/v1 시작 |
| API 조회 | health DB connected, 11월 기본 영화/OTT 두 날짜 표시, 전체 11월 일정 5개, 미정 1개. catalogRevision=10 |
| 공식 문서 조사 | KOBIS/TMDB/IGDB/football-data 필드·무료 조건/제약 기록. 본인 키 호출 없음 |

이것은 구현 담당의 실행 기록이다. 테스트 코드는 추가/실행하지 않았고 회귀/실패/경합·독립 검증은 수행하지 않았다.
Google/개인 쓰기·실제 iOS/실제 제공처·외부 배포도 아직 없다.
기존 다른 프로젝트 컨테이너/볼륨은 수정하지 않았고 DB reset/볼륨 삭제를 하지 않았다.

## 문제·선택·후속

시스템 기본 Node 20 대신 제공된 Node 24 사용. Prisma 8 RC를 피하고 stable 7.10.1을 고정했다.
SQL 제약을 초기 migration에 보존하고 Prisma 모델에 없는 보장을 문서화했다.
JSONB 비교·팀 키 매핑·이전 유효 시각·중복 scope 최신성 집계를 코드 검토 중 보완했다. 테스트 재현으로 과장하지 않는다.
ADR-009 / LEARN-0006. 가상 자료는 실제 공개일/실제 경기로 표현하지 않는다.
독립 handoff: 계약·migration·schema digest와 최종 backend commit은 app/docs/api/contract-reference.json 및 verifier/docs/contracts/reference.json.
현재 verifier v1은 이 backend/DB를 실행 검증하지 못하므로 통합 PASS를 만들지 않는다.
