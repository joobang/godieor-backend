# DATA-85 · 수집 워크플로우 실패 복구

- requirement: PROD-009/GD-009, PROD-010/GD-010. acceptance draft 미승인, SHA256 c4906283810c8b378800b67930028685a41b6a051923ea9f9415346b2d657063.
- 상태: 로컬 구현 완료·원격 검증 인계 대기. 담당: codex-collection-workflow-repair, 종료 시 담당 해제.
- backend base: 321fd83cf202a23cde374863cc6b64286cc195be main clean → codex/collection-workflow-repair, /private/tmp/godieor-workflow-fix.
- app base: 1ed896294a6a6430a96b66e7e16139454a0bf4bb main clean. verifier base: 99daa397a587eec8e3ad239b79e9a5918056440b.
- 범위: 수집 Secret 사전검사, 비밀을 노출하지 않는 오류 분류/단계/시장 보고, OTT 실패 보고서, 클라우드 트랜잭션 실행 한도. API/DB 계약과 승인 기준 불변.
- 관측: Actions 44056014741, job 133945486454에서 TMDB 토큰 공백, KOBIS/EPL/IGDB 일부 COLLECTION_FAILED, OTT publish 자식 exit1. 일부 IGDB scope 성공. 실제 하위 예외는 기존 코드가 버려 원인 미확정.
- 가설: 원격 DB의 순차 쿼리가 기존 영화/EPL/OTT 30초·IGDB180초 트랜잭션 한도에 걸릴 수 있음. 실환경 재검증 전 확정하지 않음.
- 예상 실패: Secret 공백, HTTP429/401, 네트워크/DB timeout, 트랜잭션 rollback, 자식 stdout에만 실패 원인이 존재, 실패 도중 보고서 유실, 오류 원문 비밀 누출.
- push/원격 Secret 변경/운영 DB 재실행은 이번 로컬 수정에 포함하지 않음.
- ADR: 이 카드에 제한 선택 근거 기록. LEARN-0006/0021 기존 결과를 변경하지 않으며 새 진단 해설은 이 카드 후속 본문에 작성.

## 구현과 검증 기록

- 필수 설정은 common(DB/서명)과 provider별로 나누어 검사. TMDB 누락은 경고하며 OTT 내부 원천별 실패 격리도 유지해 공식 원천·이미 검토된 매핑 게시를 계속한다. 값은 출력하지 않는다.
- 수집결과에 시장·실패단계·허용된 HTTP/Prisma/네트워크 분류를 추가. 예외 원문·SQL·접속 URL은 버린다. CLI bootstrap도 Nest 원문 로그 대신 같은 분류를 출력한다.
- publish 트랜잭션 timeout은 로컬 기본값 유지, CI만900000ms. 원자적 scope 경계 불변. 15분은 잠금/rollback 비용이 있는 실행한도 설정이며 성능 개선 측정치가 아니다.
- OTT 자식 실패는 실제 스크립트+exit code와 stdout의 안전한 실패 JSON을 읽는다. 멀티라인 JSON 지원. 실패 보고서에 이미 끝난 단계와 필수단계 실패를 보존, 게시 후 감사 실패 시 published=true 유지.
- 독립 컨텍스트 코드 리뷰 지적: 전체 Secret 검사에 의한 실패격리 회귀, 숫자 HTTP 오류 코드의 일일runner 호환성 및 OTT 내부 TMDB 실패격리 3건. 공통/제공처 검사 분리 및 runner 허용 필드/검증과 합성 회귀 추가로 수정. 승인 기준·verdict 작성 없음.

| 실제 실행 | 결과 |
|---|---|
| 공식 Node24.22.3 `npm run build` (합성 DATABASE_URL) | 최초 DATABASE_URL 미지정시 Prisma 설정 실패; 합성값 지정 후 성공 |
| 관련4파일 `node --test` | 17/17 성공 |
| 최초 sandbox `npm test` | 343/344, HTTP서버 listen EPERM 1건 |
| 허용 실행 `npm test` | 350/350 성공 |
| 리뷰보완 후 진단/워크플로우/일일runner `node --test` | 23/23 성공 |
| 최종 허용 실행 `npm test` | 353/353, skip0 성공, /private/tmp/godieor-workflow-final-test.log |
| Ruby YAML.load_file + 각 run의 `bash -n` | YAML/스크립트9개 성공 |
| `git diff --check` | 성공 |

전체 테스트용 기존 work 스냅샷2개는 원본 backend checkout에서 복사해 Git무시 work에서만 사용했다. 새 회귀는 합성 프로세스·오류를 사용하고 기대값을 구현 산출물에서 복제하지 않았다. 실제품 DB·제공처 호출·독립 통합runner·iOS빌드·운영Actions재실행은 미실행이다. 테스트용 HTTP서버는 localhost 임시 포트이며 운영 DB 연결을 하지 않는다.

## 독립 검증 인계 binding

- app base 1ed896294a6a6430a96b66e7e16139454a0bf4bb; backend base321fd83cf202a23cde374863cc6b64286cc195be. head는 이 카드가 포함된 최종 Git커밋에서 확인. 세 저장소 작업브랜치 `codex/collection-workflow-repair`.
- 계약0.1.0-draft.5, contracts/manifest.json SHA256 `04cfea7456d83ca141ba64c6d6568365b00cbdf2d5e95eacd8c4dad7249a0f2e`, 변경 없음.
- migration 집합 SHA256 `83a824f7b4e40d844331ee6660361da4a309c1170cce5e5f688cd75c3f3a227f`, 계산은 정렬된 각 상대경로+NUL+파일내용+NUL 순서, 변경 없음.
- verifier base99daa397a587eec8e3ad239b79e9a5918056440b; acceptance SHA256는 상단과 동일. 검사 범위 backend-only. 별도컨텍스트 코드 리뷰는 지적3건 해결 재확인 및 Node24 관련23/23 실행. 이는 verifier runner 승인/OS격리/전체제품PASS가 아니다.
- 다음: GitHub Actions Secret의 TMDB 토큰 등록(로컬/Render값과 별개) → 사용자요청 범위에서 push → 원격 backfill 실행 → 실제 코드/시장/phase·소요시간·DB/API보존 확인. 사라진 과거 예외는 추정으로 채우지 않는다. 긴 트랜잭션 한도 초과가 실제 관측되면 SQL왕복 최적화/배치복구 정책 검토.

## 선택 이유·학습

기술 선택과 비용의 해설은 verifier `docs/learning/entries/0022-safe-collection-diagnostics.md`(LEARN-0022). 기존 LEARN-0006/0021의 과거 실행 결과는 이번 결과로 덮어쓰지 않는다. ADR 별도 추가 없음: 진단·시간설정은 기존 원자적 게시 경계를 유지하는 운영 보완이며 선택 근거는 이 카드와 연결 해설에 남긴다. 공통 status/handoff는 앱 원본에서 동일 revision으로 동기화하며 기존 backend DEPLOY-02 기록도 과거 제안임을 표시해 보존했다.
