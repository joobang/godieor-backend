# DATA-80 · 데이터 적재 1~5번 실환경 재점검 (2026-11-17)

- 요구: PROD-005/006/007/009, GD-005/006/007/009. 기존 DATA-79 이후 실환경 확인.
- 범위: OTT 신규 작품/시즌 발견·검토·게시, TMDB 제공처 커버리지, IGDB 과거 49개 공개 참조, 일일 수집, DB·API·회귀 검증.
- 예상 실패: 비밀 설정이 누락된 체크아웃에서 수집기 전체가 조기 실패, 이전 스냅샷을 새 수집으로 오인, 발견 가능한 작품을 자동 승인으로 오인, 중복 가능 IGDB 원본을 추측으로 병합, 지정 시각 수동 재시작을 자연 기동으로 잘못 보고.

## 수행 및 확인

1. 실행환경: 현재 backend `.env`에는 처음 DATABASE_URL만 존재하여 일일 제공처 수집 3개 모두 `PROVIDER_PROCESS_FAILED`로 종료했다. 직접 실행에서 `CURSOR_SIGNING_KEY` 누락을 확인했다. 이전 체크아웃의 보관 `.env`에서 누락된 실행·제공처 키를 현재 Git 무시 `.env`에 복원하고 0600 파일 권한을 유지했다. 비밀값은 문서·커밋에 기록하지 않았다.
2. KOBIS/EPL/IGDB 일일 수집 재실행: `node scripts/run-provider-daily.mjs` (Node v24.22.3, 비밀 설정 복원) exit 0, 전체 상태 `completed`, 9개 scope `already_collected_today`, 새 수집 scope 0. 동일 날짜 중복 적재 없음. 실제 OS 자연 08:30 기동의 증거가 아니다. LaunchAgent 두 개 모두 현 backend 경로/공식 Node24, 제공처08:30·OTT09:00을 가리키는 것을 확인했다.
3. 과거 IGDB 공개 참조: `node --env-file=.env scripts/audit-igdb-public-references.mjs docs/tasks/evidence/data74/igdb-review-queue.json /private/tmp/godieor-igdb-audit-20261117-1418.json` exit 0, 49개 원본 ID/source binding 불일치 0, 읽기 전용, DB 수정 0. 기존 38개 중복 가능성 및 과거 지역 미확정을 해소했다는 뜻은 아니다. 49개 모두 원래 ID와 연결을 유지하고 자동 alias/삭제/교정은 하지 않았다.
4. DB 조회: `event=32693`, `event_source=32693`, `event_favorite=1`, `ott_reviewed=93`, `igdb=29924`. OTT 52개 제삼자 참조 기준 읽기 전용 비교 결과 26개 정확 일치/2개 날짜 상이/24개 미게시(exit 2). 제삼자 기준만으로 KR 첫 공개일 게시를 승인하지 않았다.
5. Node v24.22.3 `npm test`: 340/340 통과(exit 0). 자체 테스트와 독립 검증 승인·전체 제품 PASS는 다르다.
6. OTT 공식 전체 수집: 2026-11-17 14:17~14:42 KST, `node scripts/run-official-ott-daily.mjs` 종료코드 2, `published_with_discovery_gaps`. 개별 source의 실행 오류는 0개였으나 누락/검토 보류 때문에 전체 성공이 아니다. TMDB 전체 후보 1,254개, 신규 2개, 검토 준비 49개이며 `discoveryComplete=false`(Coupang Play 영화 제공처 미발견). Netflix 공식 78개, 공식 상세 조회 실패 3개; Coupang 첫 공개 검토 3개 전부 보류(정체성 오류 1). 날짜 미정 정체성 57개 중 힌트 33·미발견 9·모호 14·조회 미완 1. 자동 검토 승인 0, 기존 리뷰 매핑 93개, 신규 게시 0, 전체 게시 93개. 같은 실행에서 Netflix 최초 공개 재검토 2개, Coupang 재검토 2개, 날짜 미정 식별 2개가 새로 발견되었으나 게시 조건에 도달하지 않았다. 실행 로그 `/private/tmp/godieor-ott-daily-20261117-1418.log`, 마지막 보고서 `work/ott-official-daily-last-run.json`.
7. 현재 실 DB 전후 차이: `event=32693`, `event_source=32693`, `event_favorite=1`, `ott_reviewed=93`, `igdb=29924`로 수집 전후 일치. 신규 적재 0이며 원래 공용 ID·찜을 변경하지 않았다.

## 판정

- 작업 1: 신규 OTT 후보 발견·첫날 확인·자동 심사 경로를 실환경에서 실행했으나 자동 승인 0/신규 게시 0. 전체 신규 게시 완성 미입증.
- 작업 2: 오늘 TMDB 전체 발견 1,254행/49검토준비, `discoveryComplete=false`, Coupang Play 영화 `provider_not_found` 1범위. 공식 대체 근거로 확정 전에는 누락 판정 유지.
- 작업 3: IGDB 49개 공용 ID·찜 안정성 재감사 통과; 지역 provenance와 가능 중복 38개는 재분류/승인 대기.
- 작업 4: 명시적 오늘 재실행 9/9 skip 검증. 등록 당일 이후 첫 자연 08:30 기동은 아직 관측 전.
- 작업 5: DB 참조·일부 OTT 비교·자체 테스트 통과; 실제 새 OTT/모든 플랫폼 API의 독립 최종 통합 검증은 미완료.

**데이터 적재 100% 완료 불가.** 미검증 자료를 임의로 승인하거나 기존 ID·찜을 깨는 교정은 금지한다. 클라우드 배포·push·verifier verdict 변경은 수행하지 않는다.
