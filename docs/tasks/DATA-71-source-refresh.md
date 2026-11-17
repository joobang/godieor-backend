# DATA-71 · 게시 원천 재검증과 첫 자동 일간 실행 관측

- requirement PROD-005/006/007/008/009, GD-005/006/007/008/009 초안. acceptance0.1.0-draft 변경 없음.
- 상태: 이번 구현·자체 검사·실제 실행 관측 완료. 담당 codex-data71-01 해제. 독립 제품 승인/전체 수집 완료와 구분한다.
- app base028c28e1eca8cbc86c488131133fee1d3d1d0d6e(개인 pbxproj dirty 보존), backend base d2e84ad6b717f13f263e521ac9e2a51780c90183, verifier base6567fa9(clean).
- backend 구현274358746575074ee7678f5152765b9e5a68481e / 기수 보완4f395bc8d254a34596541c1ea4595abb81c95dce. 앱 코드 변경 없음.
- 실제09시 작업 실행 중이어서 backend codex/ott-source-refresh /private/tmp/godieor-data71-backend 별도 worktree에서 구현·빌드·검사. 자동 작업 종료/잠금 해제 확인 후 실제 checkout codex/ott-source-refresh에 연결했고 최종 전체 경로를 재실행했다.
- 범위: DATA70 신규23건의 공식 원천 재검증을 일간 경로에 연결하고 실제 첫09시 자동 실행 결과를 끝까지 확인. 새 날짜/시즌/정체성 변경은 기존 리뷰/DB에 자동 덮어쓰지 않고 보고서와 exit2로 남긴다.
- 예상 실패: 다른 작품/국가·회차를 정답으로 셈, stale 자료를 fresh로 주장, 같은 review revision의 시간/형태 변경 누락, 기사 전체에서 다른 작품의 기수 가져옴, 실행 중 소스 교체, 기존93행/이력 변경.
- ADR022/LEARN0021 연결. 승인 기준·verdict 불변.

## 관측과 구현 결과

1. 실제 launchd가 2026-11-17 09:00:05 KST 기동(runs1, immediate reason xpc event)해09:30:55에 종료했다. Node24.22.3, 기존93 게시 성공, 신규0, TMDB 후보1261/요청오류0, discoveryComplete=false. 최종 exit2는 제공처 미등재/정체성 보류 등을 남긴 부분 완료다. 이 자동 실행은 새 재검증 단계 연결 전의 코드이며, 새 단계는 아래 별도 실제 전체 실행으로 검증했다.
2. Netflix의 오늘78개 목록은 전일과 동일했다. 남은 미정 TVING 영화/기프트 등의 검색에서는 새 정확한 공식 날짜를 확보하지 못했다. 동일 후보를 새 게시나 날짜 확정으로 세지 않았다.
3. 수동 게시23건의 재검증을 `recheck-posted-official-sources.mjs`로 추가. curated batch SHA와 현재 review 전체 값·revision·고정 content/event 키를 먼저 대조하고 공식 원천만 읽는다. 리뷰·DB 변경0. sourceRefresh binding의 actor/기수 기준은 DATA70 당시 실제 원문 hash와 대조해 추출한 공개 자료이며 test fixture가 아니다.
4. Netflix KR 일정+정체성이 결속된 한국 작품 상세의 최초 날짜/형태·canonical ID, Disney+ KR/ko entity의 명시 날짜·시즌/형태/replay, TVING P ID·명시 openText, Coupang 작품별 공개란·배우/시즌·자체 작품 제목의 기수를 대조한다. 원문에 시즌이 없으면 null을 보존한다. 돌싱N모솔의2기는 다른 작품이나 시즌 개수가 아닌 그 작품 자체 heading에서 재확인한다.
5. 공식 Netflix가 `/title/ID?locale=ko-KR`를 거쳐 한국 canonical 주소로 이동하는 실제301을 관측했다. 첫 허용 규칙이 이를 누락해3건을 보류했던 문제를 수정했다. 한국 로케일 단일 query와 같은 host의 결속된 최종 ID만 허용한다. 외부host·다른국가·다른작품은 따라가거나 성공으로 세지 않는다.
6. 일시 fetch 실패/5xx는 최대3회로 제한 재시도한다. 429를 무작정 우회/재시도하지 않는다. 같은 실행에서 이미 수집한 Netflix JSON은 공식URL·KR·범위·observedAt(1시간/미래60초)을 검증해 재사용한다. 공유 Coupang 기사도1회 조회해 작품별로 분리한다. 최초 날짜·지역·정체성 누락/변경은 별도 상태로 남기고 나머지 제공처 검사는 계속한다.
7. 최종 실제 전체 파이프라인의 새 단계23/23 matched·gaps0·reviewsModified0. 기존93 전체 event 행/ID/변경 이력과 실행 전 hash 동일, API목록93 및 관련23 상세200. 신규 적재0. 전체 결과는 남은 발견/식별 격차로 exit2이며 전체 자동 수집/제품PASS가 아니다.

## 실제 실행한 검사

| 실제 명령·단계 | 종료 | 결과 |
|---|---|---|
| launchctl print + 프로세스·로그/잠금 관측 |0|오늘09시 실제 자동 기동→09:30 종료,93 게시. 다음 자동 실행의 새 단계 성공을 미리 선언하지 않음 |
| 별도worktree npm run build (Node24.22.3, DB접속 없는 dummy URL) |0|Prisma/TS 생성·컴파일. 최초 빌드 전 도구 import는 dist 부재로 실패했고 빌드 후 재실행 |
| node --test posted-source-recheck/official-ott-pipeline/netflix-kr-schedule |0|관련21/21 후 기수 반례 포함 posted 검사11/11, 최종 전체288에 통합. 실제 소스20/23→공식redirect 수정23/23, 네트워크 실패는9/23로 기록 후 재시도 보완 |
| Node24 PATH npm test (별도사본) |0|최종288/288. TVING identity mismatch의 throw를 분류 결과로 정리한 뒤 통과. 날짜/시즌/지역/형태·배우·기수 변경, partial failure, URL·redirect, stale snapshot, review binding·재시도/공유조회 반례 |
| node scripts/recheck-posted-official-sources.mjs |0|실제23/23·gaps0·review수정0. root 전체 실행 보고서로 최종 증거 갱신 |
| node scripts/run-official-ott-pipeline.mjs --reuse-recent-tmdb (최종4f395bc) |2|최근 실제TMDB snapshot검증 재사용, 새 공식원천 단계0/23일치, 전체93 게시 성공. failedSources0, discoveryComplete=false 유지 |
| 기존93 snapshot→실제전체 실행→SQL·임시API 검증 |0|93 전체event/ID/이력·hash 불변, API목록93·관련23 상세/출처/날짜/시즌200. productPublicationDelta0 |
| git diff --check |0|공백 검사 |

증거 `docs/tasks/evidence/data71/`: scheduled-run-2026-11-17.json(실제 자동 실행), live-source-recheck.json(최종 실제 원천 검사), pipeline-integrated.json(새 단계 포함 별도 실제 실행), db-http-preservation.json. 원시 임시 로그는 /private/tmp/godieor-data71-*.
검사는 실제 운영 장애/사용자 성과 측정이 아니다. source 날짜 변경 반례는 가상이며 오늘 실제23에서는 날짜 변경을 관측하지 않았다. 기존 pg 동시 query 향후 호환성 경고는 이번 API 검사에서도 관측됐으나 실패가 아니며 별도 미해결이다.

## 인계

- API0.1.0-draft.5 manifest SHA256 0ffd7cbcdcb3c46b450e626ced90055e985308d728c279832aa00ec76b24e9c9.
- migration digest ec6966538bd599bf0dcee21ec0e0fb03a63b513ae01654d52b9e2badf5697fd7.
- acceptance0.1.0-draft SHA256 c4906283810c8b378800b67930028685a41b6a051923ea9f9415346b2d657063.
- app/backend base는 위 기록, 코드 head4f395bc. 최종 문서head는 종료 Git 이력/최신 전달본 참조. verifier 기준·verdict/승인자 변경 없음.
- backend-only 작성자 자체검사/로컬 SQL/API 관측. 독립 runner/review·iOS/폰/클라우드/OS격리 검증은 이번 미실행. 전체 제품PASS 아님.
- 이번 기능은 DATA70의23건을 대상으로 한다. 나머지 기존70의 전부를 새로 공식 확인했다고 표현하지 않는다. Netflix 조회월 밖의 과거일은 catalog-only와 기존KR 검토 근거 보존을 구분한다.
- 남은 범위: 날짜/시즌 변화가 관측되면 원문 근거 검토 후 기존 eventKey로 갱신, 미정 작품은 날짜 발표 시 후속 처리. 새로운 일반 최초 공개 자동 승인/미등재provider 완전성은 해결하지 않았다. 오전 자동 실행을 중복 수동 신규 게시로 세지 않는다.
- status/handoff/plan 공통 사본과 ADR022/LEARN0021 후속 갱신. 개인 signing 설정 보존, 외부 push/배포 미실행.
