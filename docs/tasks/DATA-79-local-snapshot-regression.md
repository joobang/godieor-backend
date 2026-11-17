# DATA-79 · 데이터 적재 점검 환경 복구와 전체 회귀 (2026-11-17)

- 요구 ID: PROD-005/006/007/009, GD-005/006/007/009. DATA-77/78 후속. 상태: 개발 환경 복구 완료, 데이터 적재 완료는 미달.
- 범위: 읽기 전용 작업 스냅샷 복원, 공식 Node 버전 전체 회귀, 미완료 원천 목록 갱신. DB 적재/출시일 변경, ID/찜/계약/verifier verdict는 범위 밖.
- 예상 실패: 서로 다른 checkout의 임시 파일을 최신 게시 근거로 오인, 사라진 후보 파일 때문에 테스트 실패, Node22의 우연한 성공을 공식 Node24 성공으로 오인, TMDB discoveryIncomplete를 100%로 오인.

## 실제 실행 및 관측

| 실행 | 결과 | 근거 |
| --- | --- | --- |
| 기존 백엔드 보관 checkout의 `work/ott-candidates/state.json`과 `work/tmdb-release-candidates/latest.json`을 현 checkout의 Git 무시 `work/`에 복원, 원본과 SHA256 비교 | 일치. 199 후보, TMDB 최신 결과 1,261행, `discoveryComplete=false`, 검토 준비 49건/원천 범위 29개/오류 0 | `state.json` SHA256 `9f93f7c86a6f6e7ff5946909d382f51166ead730a97124f211ae685e7f4bcebd`; `latest.json` SHA256 `0bb607eee0ed409348284e8336af7ac4dd40af79b7b827021dc5990b2fdd84f1` |
| `/Users/dojoohwan/.local/share/godieor/node-v24.22.3/bin/node` 환경에서 `npm test` | exit 0, 빌드/전체 340 테스트 통과, 실패 0 | `/private/tmp/godieor-data78-tests-20261117.log` (로컬 임시 로그) |
| `git status --short` | 코드 dirty 없음. 복원된 작업 스냅샷은 `.gitignore`의 `work/` 대상 | 로컬 체크아웃 |

## 데이터 100% 완료 판정

- 미완료: TMDB 스냅샷 `discoveryComplete=false`이며, 정상 공식 근거가 있는 신규 작품/새 시즌의 전 제공처 자동 발견→게시→API 검증은 아직 완료되지 않았다.
- 미완료: DATA-77의 역사적 IGDB 49건은 숫자 지역 전부 NULL, 중복 가능 38건 수동 보류. ID/찜 보존을 검증하지 않은 alias 병합 금지.
- 미완료: KOBIS/IGDB/EPL 08:30 자연 정시 실행은 기존 기록에서 미관측, 일부 OTT 공식 첫날·Coupang 영화 TMDB provider 미등재 및 원천 커버리지 격차가 남는다.
- 따라서 **데이터 적재 100% 완료 선언 불가**. 테스트 340 통과와 DB 32,693건 적재는 이 결론을 바꾸지 않는다. 실제 진행률을 근거 없이 백분율로 환산하지 않는다.

## 후속

- 새로운 공식 후보 입력으로 각 OTT 신규 작품·시즌의 첫 공개일 검증과 게시까지 끝나는 실제 파이프라인을 검증하고, 실패 시 원천별 원인을 기록한다.
- TMDB 영화 provider 미등재 등 누락 경로의 공식 대체 근거 확보, 과거 IGDB 지역 미확인·alias 정책 별도 검토, 다음 자연 일일 실행 관측, DB/API·독립 검증 후 완료 판단.
- ADR: 변경 없음(환경 복원/기존 운영 규칙). 학습: LEARN-0006·0021의 원천 검증 구분 유지. 독립 승인/검증은 미실시.
