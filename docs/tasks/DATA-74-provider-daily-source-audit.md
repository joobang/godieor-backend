# DATA-74 · 제공처 일일 자동 실행·실패 복구·IGDB 원천 추적

- requirement PROD-005/006/007/008/009, GD-005/006/007/008/009 초안. 상태: 이번 구현·설정·자체 검사·실제 기동/복구·선택49건 감사 완료. 담당 codex-data74-01 해제. 전체 데이터 단계는 미완료.
- base app9682899dee8378958831b0a42b8f2e841ab8169a(개인 pbxproj dirty 보존), backendf40e5c73764cdafc091390bbd14626dbef84edad(clean), verifier06b1404d7cc06fc366894aa618403f5f0fc1dd21(clean).
- backend codex/provider-daily-and-source-audit 단독 checkout. 시작 시 수집 프로세스 없음. 빌드 후 실제 작업을 실행했고 실행 중 dist를 교체하지 않았다. 동시 개발 세션 없음.
- 범위: KOBIS/EPL/IGDB 일일 runner·개별 실패 격리/마지막 성공·잠금/시간제한/신호 중단·재실행, macOS08:30 KST 등록·명시 기동. 선택49 release ID의 현재 공식 관계와 DB 새ID 충돌 읽기 전용 감사.
- 예상 실패: 등록을 다음 자연 기동 성공으로 셈, 같은 날 skip을 새 수집으로 셈, 원천 하나 실패로 전체 중단, 원천 부재를 삭제/취소로 추정, 제목만 병합·기존 ID/찜 참조 손상, 키 로그 노출, 시간제한 뒤 후손/잠금 잔류.
- ADR024/LEARN0006, 기존 ADR023 연결. 앱 코드/API/migration/독립 기준·verdict 불변.

## 실제 결과

1. dev.godieor.provider-daily LaunchAgent를 매일08:30 KST로 실제 등록했다. Node24.22.3 영속 경로·backend WorkingDirectory·RunAtLoad=false. 기존 OTT09시 job은 별도다. 명시 launchctl kickstart3회 모두 exit0,당일9범위 skip을 실제 확인했다. **다음08:30 자연 calendar 기동은 미관측**이다.
2. KOBIS 자식에만 접속 불가능한 loopback 시험 DB URL을 주입한 제어된 실패를 실행했다. .env/제품DB는 수정하지 않았다. KOBIS 실패 뒤 EPL·IGDB 계속 실행/당일8범위skip, rootpartial/exit2, 기존 마지막 성공 파일 byte 보존을 확인했다. 실제 발생한 서비스 장애와 구분한다.
3. 정상 --force 복구 실행은 실제9범위 수집/exit0. 게임29914→29924(**신규10**), 영화1909/EPL760/OTT93 유지. 전체 기존32683 event ID·행·이력·작품/팀/지역 binding 불변, 신규10은 실제 공식 작품ID/본편종류/플랫폼/지역/날짜와 상세API200으로 모두 대조했다.
4. KR/WORLD 게임+EPL2026~2027 월별24창/API30125 ID가 실제 DB와 일치했다. 마지막 최종 OS 명시 기동도0수집/9skip이었으며 전체32693행·이력 불변/잠금 해제를 확인했다. fixture7은 실데이터 건수에서 제외한다.
5. 당일 한 번 성공한 뒤 실패한 scope가 last_successful_at만 보고 다시 skip되던 조건을 보완했다. 마지막 시도도 succeeded인 경우에만 skip한다. 최종 고정digest 일회용 PostgreSQL에서 성공→잘못된 입력 실패→일반 daily 재시도 성공→그 뒤 skip/기존 ID를 확인했다.
6. 최종 전체 자체331/331, 일회용DB migration/DI/API·시간/이력·실패·계정/찜·검토 게시 회귀 성공. timeout후 실제 가상 자식·후손 종료/중단/잠금·원자 보고서 실패/마지막 성공 보존도 검사했다.

## 원천49건 현재 분류

게임 고정ID29개를 모두 공식 games에서 찾고 release_dates 관계를 끝까지 조회했다(현재56행). 원래 release ID를 작은 배치로 직접 재조회한 결과5개는 여전히 존재했다. 과거 DATA73의 빈 응답을 모든 ID 삭제의 확정 근거로 사용하지 않았다.

| 현재 판정 | 건수 | 처리 |
|---|---:|---|
| 날짜가 있는 다른 release 후보 |37|후보 날짜 보존, 자동 재결속 안 함 |
| 부분 날짜/미정인 다른 release 후보 |4|월/분기/연도/TBD를 확정일로 만들지 않음 |
| 현재 출시 없음 또는 복수 |3|모호함 유지 |
| 현재 본편이 아닌 game_type |5|이전 분류 변경 원인은 미확정, 현재 제외 조건만 확인 |

새 release 후보가 이미 다른 event ID로 저장된 경우38건은 **중복 가능성**이다. 같은 이벤트라고 승인하지 않았다. 원래 숫자 release_region을 canonical 기록에 남기지 않았고 WORLD는 여러 원천 지역을 합친 범위다. 같은 작품/플랫폼·현재 유일 후보만으로 원래 지역별 이벤트의 동일성을 증명할 수 없다. 기존 공용ID·찜 참조를 지우거나 날짜/취소를 추정하지 않았으며 감사 DB변경0이다.

현재49건의 오래된 날짜·현재 비본편 게시·가능 중복이 해결됐다고 선언하지 않는다. 다음은 원천 region provenance와 미검증/중복 이벤트의 게시 상태를 공용ID·찜 참조에서 분리하는 설계/구현, 필요한 source/event alias 및 계약·DB/API 재검사다. 감사는 기본49건의 별도 수동 명령이며 현재08:30 runner의 자동 단계는 아니다.

## 구현

- run-provider-daily.mjs: 제공처별 별도 CLI 프로세스 순차 실행, 실제9scope 결과 검증. 한 실패 뒤 다음 원천 계속 실행. controlled 출력 필드만 보존하고 rawstderr/키를 복사하지 않는다.
- work/provider-daily-last-run.json/last-success.json: 원자 저장, 실패/중단 시 이전 성공 보존. collectedScopes/skippedScopes 구분. job 성공시각과 실제 원천 수집시각(DB/API freshness)은 다르며 게시 스냅샷 건수는 신규가 아니다.
- work/provider-daily.lock: 살아 있는 owner 중복 거절/증명된 dead owner 회복/초기 work 폴더 생성. provider PostgreSQL 잠금 충돌도 성공 skip과 구분한다.
- 제공처별30분 제한/중단 시 process group 종료·잠금 해제. 실행 중 기존 LaunchAgent를 설치로 교체하지 않는다. 로그인된 Mac/가용 DB가 필요하며 원격 상시 운영은 아니다.
- audit-igdb-source-gaps.mjs: manifest에서 고정 release ID만 받고 현재 DB game/source binding을 Prisma findMany로 읽는다. 공식 ID 직접·부모게임/플랫폼/지역/페이지/관계·현재 DB 새ID를 대조하며 리뷰 후보만 기록한다.
- 운영 명령·결과/재실행의 의미는 docs/provider-daily-operations.md. 공식 필드 참조 https://api-docs.igdb.com/#release-date. API 비밀은 .env/자식 환경에만 있으며 plist/앱/fixture/공개 보고서에 넣지 않았다.

## 실제 실행한 검사

Node /Users/dojoohwan/.local/share/godieor/node-v24.22.3/bin/node. 전체 before/after/final DB snapshot은 /private/tmp/godieor-data74 보존, Git에는 공개 원천/집계·hash·도구를 남겼다.

| 실제 명령·단계 | 종료 | 결과 |
|---|---|---|
| PATH=<Node24bin> npm test |0|Prisma생성·TS빌드,같은 날 재시도 보완 포함330/330 |
| node --test tests/*.test.cjs tests/*.test.mjs |0|최종 JS lock bootstrap 포함331/331 |
| node scripts/install-provider-launchd.mjs --install + launchctl print/kickstart |0|08:30 KST/고정Node·backend경로,명시3기동 exit0/9skip. 다음 정시 미관측 |
| 제어 실패 주입 runProviderDaily 실행 |정상적으로partial/2|KOBIS 접속 실패,다른2제공처 계속,마지막 성공 보존. 비밀 출력 없음 |
| node scripts/run-provider-daily.mjs --force |0|실제9범위 수집,신규게임10,이전32683행·ID·이력 보존 |
| node --env-file=.env scripts/audit-igdb-source-gaps.mjs |2|읽기 전용49건,게임29/현재 release56,원래5ID 존재. 검토대기37/4/3/5·가능중복38/DB변경0 |
| node --env-file=.env /private/tmp/godieor-data74/verify.cjs (schedule/fixture=false,provider-only=true) |0|공식 신규10 전부/10상세200,월별24창API30125 ID·DB 일치 |
| env -u <실원천 키> COLLECTION_INCLUDE_FIXTURE=true node scripts/check-refactor-db.cjs |0|최종 고정digest 일회용DB회귀,같은 날 실패 범위 일반 재시도/성공 후skip·ID보존. 컨테이너 제거 |
| 최종 명시 기동→SQL snapshot 비교 |0|32693 전체event/이력 불변,lock 해제 |

기존 pg 동시 query deprecation warning은 관측했으나 이번 장애로 단정하지 않았다. 최종331개 자체 검사는 독립 승인/전체 제품PASS가 아니다.

## 독립 handoff·다음

- app base/head 런타임 위9682899 동일,이번 app 변경은 공통 문서만. backend 구현 head는 이번 커밋/Git 이력,종료 문서 head는 각 저장소 Git 이력 참조. verifier base 위06b1404,독립 기준/verdict 불변.
- API0.1.0-draft.5 manifest SHA256 0ffd7cbcdcb3c46b450e626ced90055e985308d728c279832aa00ec76b24e9c9, migration digest ec6966538bd599bf0dcee21ec0e0fb03a63b513ae01654d52b9e2badf5697fd7 불변.
- acceptance0.1.0-draft SHA256 c4906283810c8b378800b67930028685a41b6a051923ea9f9415346b2d657063 불변. 개인 pbxproj SHA256 f8ef38b1a44d31034be8137e7c149616c8d10b5fec23d23c50ad5445342b54ba 보존.
- 독립runner/리뷰·iOS/실폰·클라우드·push 미실행. source49 교정/미정 게임 및 OTT 새 시즌/나머지 원천 일반 자동 검토/TMDB 전체 실행은 남는다. 데이터100% 후 배포→기본기능→디자인 순서 유지.
- ADR024/LEARN0006 및 status/handoff/plan·원천 범위/README·공통 사본을 갱신한다. 종료 시 보호 지문/문서 일치/diff/context 전달본 검사. 별도 사용자 결정이나 추가 계정/암호를 요구하지 않는다.
