# DATA-07 · 해외 게임 출시 일정 확대

- Requirements PROD-002, PROD-005, PROD-009. verifier 기준/승인 불변.
- 상태 구현 완료·독립 검증 대기, 담당 해제(codex-global-games-01). 기준 backend fc153286, app 7b109849 (개인 Xcode signing 보존), verifier b88a5e3.
- 브랜치 codex/app-auth-phone-ready. 수정 범위 IGDB 해외 지역 조회·페이징/검증·실수집 점검.
- 사용자 확정 세계 게임과 모바일 플랫폼, 하루 1회 수집. WORLD 범위로 북미·유럽·아시아 등 지역 출시를 조회하여 한국 기본 달력에도 노출하고 국가별 지역 릴리스는 따로 보존한다.
- 예상 실패 해외 지역 누락, 페이지 절단, 외부 429, 장기 DB 트랜잭션, 미래 미정 출시일을 달력에 잘못 배치.
- 완료 기준 해외 리전 수집 자체 테스트·빌드 성공, 가능한 경우 실제 원천/DB 조회. 미실행은 명시.
- ADR/LEARN 신규 없음. 기존 수집기 범위 확장.

## 구현·검증·인계

- backend IGDB WORLD에서 Europe(1), North America(2), Asia(7), Worldwide(8) 출시일을 통합 수집. KR/JP/AU/NZ/CN/BR 별도 지역 보존. 플랫폼별 실제 날짜 유지. 30일 윈도 페이징으로 페이지 2천 건 조기 절단 제거, 요청 간 275ms 간격, IGDB 게시 트랜잭션 제한 180초.
- 자체 실행 `npm test` 63/63 PASS, `git diff --check` PASS. `npm run collect:daily` exit 0, KOBIS/EPL/KR은 당일 수집 완료로 skip. 해외 신규 출판 WORLD 4,761건, JP 75건, AU 3건, NZ 2건, CN 1건, BR 4건.
- 로컬 PostgreSQL 재조회 WORLD 4,761, JP 75, BR 4, KR 3, AU 3, NZ 2, CN 1건. `Grand Theft Auto VI` WORLD 날짜 2026-11-19 (PlayStation/Xbox 등 플랫폼별 별개 일정). 해당 날짜는 조회 시점 IGDB 제공 데이터이며 확정 공식 출시일 검증은 별도.
- 남은 작업 글로벌 출시 데이터 API/iPhone 표시 실제 확인, IGDB 날짜/데이터 품질 재점검, 이미지·포스터 메타데이터 및 OTT 전수 수집, 클라우드 적재, 독립 검증. API 계약/마이그레이션/verifier 승인 불변. 개인 Xcode signing 미수정.
