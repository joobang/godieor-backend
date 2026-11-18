# 영화·EPL·게임 일일 수집 운영

## GitHub Actions 클라우드 배치 (2026-11-17)

`.github/workflows/daily-collection.yml`은 매일 **08:30 KST** (`23:30 UTC` 전날) KOBIS·EPL·IGDB와 검토된 OTT 공개 일정 게시 파이프라인을 실행한다. GitHub Actions 예약 실행은 지연될 수 있다. Render Free 서버가 잠들어 있어도 Actions runner에서 Supabase에 직접 연결한다. 각 제공처의 실패를 격리하고 마지막 단계에서 실패 여부를 요약한다. 전체 작업 제한은 110분이다.

GitHub 저장소 **Settings → Secrets and variables → Actions**에 `COLLECTION_DATABASE_URL`, `COLLECTION_CURSOR_SIGNING_KEY`, `KOBIS_API_KEY`, `FOOTBALL_DATA_API_KEY`, `IGDB_CLIENT_ID`, `IGDB_CLIENT_SECRET`, `TMDB_API_READ_ACCESS_TOKEN`을 등록한다. Render 환경 변수는 Actions로 자동 공유되지 않는다. TLS 인증서가 필요한 환경이면 PEM을 base64 인코딩해 `COLLECTION_SUPABASE_CA_PEM_BASE64`에 등록한다. 인증서 검증은 끄지 않는다.

**Actions → Daily provider collection → Run workflow → Branch: main → mode: backfill → Run workflow** 를 실행하면 2026-10-01 컷오프부터 KOBIS·EPL·IGDB 백필 후 OTT 공식 수집 및 기존 검토 게시를 시도한다. `daily`는 당일 변경분을 수집하며, OTT 공식 후보 재확인/게시는 동일하게 수행한다. OTT는 Git 추적된 `data/curated/ott-reviewed-candidates-snapshot.json`에서 **리뷰 94건**의 ID/revision 결속을 복구한다. 리뷰하지 않은 106건은 이 스냅샷에 없으며 자동 승인하지 않는다. 신규로 발견된 미검토 후보는 자동 게시되지 않는다. Actions 실행 후 Artifact `ott-collection-report`에서 실행 산출물을 확인한다.

### 실행 전 검사와 실패 진단 (DATA-85)

`Validate collection configuration`에서 공통 DB·서명 설정의 공백 여부를 먼저 검사한다. 제공처 키 누락은 경고하고 해당 제공처 실행에서만 처리하므로 TMDB 설정 누락이 영화·게임·EPL을 막지 않는다. TMDB 누락도 OTT 전체를 조기 종료하지 않고 기존 원천별 실패 격리를 통해 공식 수집·이미 검토된 매핑 게시를 계속한다. 누락 이름만 출력하며 값은 출력하지 않는다. 특히 `TMDB_API_READ_ACCESS_TOKEN`은 Render나 로컬 `.env`와 별개로 GitHub Actions Secret에 등록해야 한다. `.env not found. Continuing without it.` 자체는 오류가 아니다. CI는 환경 변수로 값을 전달한다.

제공처 실패 결과는 `market`, `phase`(fetch/normalize/refresh_missing/validate/publish), `errorCode`, 필요 시 `causeCode`를 포함한다. 예: `phase=publish`, `DB_TRANSACTION_FAILED`, `P2028`은 DB 트랜잭션 오류다. `PROVIDER_HTTP_429`는 원천의 요청 제한이며 DB 제한을 늘려 해결하지 않는다. `CONNECTION_FAILED`는 안전한 원인 코드만 남기며 쿼리·응답 본문·접속 문자열·예외 원문은 출력하지 않는다. 알 수 없는 오류는 계속 `COLLECTION_FAILED`로 남긴다.

CI의 `COLLECTION_PUBLISH_TIMEOUT_MS=900000`은 순차 쿼리를 사용하는 원격 DB 적재에 최대 15분을 허용한다. 범위별 전체 commit/rollback과 기존 ID 보존은 그대로다. 로컬 기본값은 기존 30초/IGDB180초이며 설정 허용 범위는 30초~30분이다. 한도를 늘리는 것은 데이터 양에 비례하는 순차 왕복 비용을 제거하지 않는다. `P2028` 관측 여부와 실제 수행 시간을 보고 배치/쿼리 최적화를 별도로 판단한다. GitHub 전체110분 제한은 유지된다.

OTT 필수 단계가 실패해도 JSON 보고서에 이전 단계와 실패한 스크립트, 안전한 stdout 오류 코드를 보존한다. Artifact를 확인한 뒤 실패 원인을 해소하고 재실행한다. 부분 발견 exit2는 계속 경고이며 실제 게시 실패 exit1을 성공으로 바꾸지 않는다. Secret 설정·원격 재실행 없이 로컬 테스트만 통과한 상태를 운영 복구 완료로 표시하지 않는다.

**제한:** Actions의 로컬 파일 변경은 다음 실행에 자동 보존되지 않는다. 새 검토/신규 후보를 영구 보존하려면 검토 후 버전 관리 스냅샷에 반영해야 한다. OTT의 공식 수집 일부가 실패하거나 미확정이면 파이프라인은 `published_with_discovery_gaps` (exit 2)를 반환하며 경고와 보고서로 남긴다. 이는 검토된 일정 게시 성공 가능성과 **전체 원천 100% 검증**을 구분하기 위한 결과다. 실제 Supabase 행 수와 Render `/v1/health`의 dataMode는 실행 후 확인해야 한다. GitHub runner에서 실제 클라우드 적재 성공은 아직 검증되지 않았다.

실제 로컬 등록: 2026-11-17, LaunchAgent `dev.godieor.provider-daily`, 매일 **08:30 KST**. 기존 OTT09시 job은 별도로 유지한다. 로그인된 Mac과 접근 가능한 DB가 필요하며 클라우드 상시 운영은 아니다. 등록과 `launchctl kickstart` 실제 기동은 확인했지만 다음08:30 자연 calendar 기동은 아직 관측하지 않았다.

## 실행·등록

backend root에서 Node24 경로를 사용한다. plist에는 키를 넣지 않으며 각 자식 CLI가 backend의 .env를 읽는다.

```sh
/Users/dojoohwan/.local/share/godieor/node-v24.22.3/bin/node scripts/install-provider-launchd.mjs --install
/Users/dojoohwan/.local/share/godieor/node-v24.22.3/bin/node scripts/run-provider-daily.mjs
/Users/dojoohwan/.local/share/godieor/node-v24.22.3/bin/node scripts/run-provider-daily.mjs --force
launchctl print gui/$(id -u)/dev.godieor.provider-daily
launchctl kickstart gui/$(id -u)/dev.godieor.provider-daily
```

설치 도구는 실행 중인 기존 job을 교체하지 않는다. RunAtLoad=false이며 kickstart는 명시 실행이다. package 명령은 collect:providers:daily / collect:providers:install-schedule이다. PATH의 node가24여야 한다.

## 결과와 재실행

- work/provider-daily-last-run.json: 마지막 job 결과. completed/partial/failed/interrupted와 제공처별 결과를 기록한다.
- work/provider-daily-last-success.json: 전체 제공처 job이 정상 종료한 가장 최근 결과. 실패·중단 시 보존한다.
- collectedScopes는 실제 수집·게시한 scope 수, skippedScopes는 당일 이미 성공해 건너뛴 수다. publishedSnapshotRows는 이번 게시 스냅샷 크기이며 신규 증가 건수가 아니다.
- 위 파일의 finishedAt/previousSuccessfulRunAt은 job 시각이다. 실제 마지막 원천 수집 시각은 DB collection_scope.last_successful_at/API freshness를 본다. skip 결과를 새 원천 수집으로 세지 않는다.
- stdout/stderr 위치는 work/provider-launchd.stdout.log와 work/provider-launchd.stderr.log다. runner는 자식의 stderr/임의 출력·환경변수를 보고서에 복사하지 않고 허용한 결과 필드만 기록한다.

KOBIS→EPL→IGDB를 각각 별도 프로세스로 순서대로 실행한다. 한 제공처 실패도 다음 제공처 실행을 막지 않는다. 성공한 scope는 당일 일반 재실행에서 건너뛴다. **마지막 시도가 실패/중단 상태인 scope는 앞서 같은 날 성공했어도 일반 daily로 재시도**한다. 전체를 다시 확인하려면 --force를 쓴다. DB 연결이 시작 단계에서 실패했다면 기존 수집 성공 상태가 그대로일 수 있으므로 새 수집이 필요할 때 --force를 쓴다.

work/provider-daily.lock의 살아 있는 소유자는 중복 실행을 막는다. 소유 PID가 실제로 없는 것이 확인된 경우에만 stale lock을 자동 회복한다. 알 수 없거나 살아 있는 소유자 잠금을 무조건 지우지 않는다. collector의 별도 PostgreSQL 제공처 잠금 충돌도 실패로 남긴다.

제공처별 제한시간은30분이다. timeout/SIGTERM/SIGINT 시 해당 자식 process group을 끝내고 중단/실패를 기록한 뒤 잠금을 해제한다. 보고서는 임시 파일→rename으로 교체한다. 보고서 쓰기에 실패해도 잠금은 해제하고 기존 성공 보고서를 유지한다.

## IGDB 원천 검토

```sh
/Users/dojoohwan/.local/share/godieor/node-v24.22.3/bin/node --env-file=.env scripts/audit-igdb-source-gaps.mjs
```

기본 입력은 DATA73에서 목록에 나타나지 않은49개 release ID다. 다른 명시 manifest와 출력 경로도 인자로 줄 수 있다. 감사는 현재 게임ID·release 관계·플랫폼·지역·DB의 새 source binding을 읽기만 하며 work/igdb-source-gap-audit.json에 남긴다. 검토 대기 결과 exit2는 정상 수집/자동 병합 승인이 아니다. 이 감사 명령은 현재08:30 job의 자동 단계에 포함하지 않았으며 별도 실행이다.

현재49건은 게임29개를 모두 찾았고 기존 release ID는5개가 직접 재조회됐다. 날짜 있는 새 후보37/부분 날짜·미정 후보4/현재 출시 없음 또는 복수3/현재 비본편5로 분류했다. 다른 DB 이벤트와 겹치는 후보38은 **중복 가능성**이며 동일 이벤트라고 확정하지 않았다.

원래 숫자 release_region이 canonical 기록에 없고 WORLD가 여러 원천 지역을 포함하므로 새 ID와의 플랫폼·게임 일치만으로 이전 이벤트를 병합하지 않는다. 날짜만/월·분기·연도/TBD를 혼동하지 않는다. 현재 이벤트를 유지한 채 지역 provenance와 공용 event ID alias/찜 참조 보존 전략을 보완해야 한다. 공식 필드 관계: [IGDB API](https://api-docs.igdb.com/#release-date).

실제 기동·제어된 실패·복구·DB/API 결과는 [DATA74](tasks/DATA-74-provider-daily-source-audit.md)를 따른다. 수집 job 성공과 전체 데이터100%·독립 승인은 별개다.
