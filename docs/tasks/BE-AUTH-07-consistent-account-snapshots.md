# BE-AUTH-07 · 계정 설정·찜의 일관된 읽기

- 요구사항 PROD-003/006/010, GD-003/006/010. acceptance draft/승인 불변. 상태 구현·자체검사 완료/독립검증 인계 대기, 담당 codex-account-consistency-01.
- 사용자 수정: 작품별 적재 반복을 중단하고 원인별 일괄 처리 후 제품 완성 우선. 이번 데이터 추가/후보 조사/게시0.
- base app6a530ffb8fe07e45ad0455c115449ba063ae2114 / backend703a8e157ba007aa10f2f6f8a63a642cf5e2b051 / verifier48348c40f338a42660dc1c3855f0186aca8c8d1c.
- branch 세곳 codex/product-account-consistency. 기존checkout순차/동시작업없음. 개인pbxproj/backend.env.example/package.json/미추적감사스크립트·테스트 보존.
- 코드검토상문제: 설정version/mainrow와relation조회가같은snapshot을보장하지않음. 찜3개병렬조회는items/version을서로다른DB상태에서가져올수있음. 설정저장응답은write transaction밖에서재조회해다른기기후속저장을자기저장결과로반환가능. 실운영장애가아닌코드상위험이며합성동시실행으로재현한다.
- 범위/완료: 설정·찜 읽기를RepeatableRead snapshot으로묶고,설정저장은자기transaction의결과를반환. 실제분리된임시DB에서읽기중다른기기의저장을주입하는재현/회귀확인,관련/전체자체검사. API계약/기준/마이그레이션변경없음.
- 예상실패: 반환version만정합하고목록은구버전,계정간혼합,조회중갱신분실,transaction밖응답재조회,합성검사를실기기/Google/독립PASS로표현.
- ADR/학습은검사후연결. 원본backend/docs/tasks/BE-AUTH-07-consistent-account-snapshots.md. 공통작업우선순위/인계갱신.

## 구현·실제 검사

- 설정/관계 및 찜 items/version 읽기는RepeatableRead 트랜잭션. 찜은같은연결순차조회. 설정저장은자기write transaction안에서응답을확정하며기존409충돌정책유지.
- 실제분리된일회용PostgreSQL에서다른연결의원자적쓰기와교차시켜baseline 두케이스실패(exit1),fixed 두케이스통과(exit0). baseline은Git703a8e1의원본repo코드를메모리에서TS변환해실행했고과거이력을수정하지않음. 합성계정/일정만생성,제품DB/실사용자/Google접근없음. container정리완료.
- `node node_modules/typescript/bin/tsc -p tsconfig.json`: exit0.
- `node --test tests/account-repository.test.cjs tests/auth-sync.test.cjs`: exit0,6/6.
- `python3 /private/tmp/check-account-snapshot.py`: exit0. 고정verifier의database()컨텍스트/기존고정image를이용해migration실행후 `ACCOUNT_SNAPSHOT_TEST_DATABASE_URL=<임시주소> node scripts/check-account-snapshot-db.cjs --baseline` exit1(의도한2실패),같은환경fixed 명령exit0(2/2). 주소/비밀번호는로그미기록. 실행script는backend cwd. pg동시query deprecation경고는Prisma기존경로에서남으며해결주장없음.
- `node /private/tmp/godieor-account-snapshot/test-tracked.cjs`: exit0,추적CJS+ESM전체156/156. 전체argv/test로그는evidence/be-auth-07. 새동시성DB검사는이156개와별도이며위명령으로필수실행한다.
- node경로: /private/tmp/godieor-data48/node-v24.22.3-darwin-arm64/bin/node. 개발DB적재·후보수집·외부배포0. 로컬기존63건은DATA-52관측값을유지한것이며이번에재조회/완전성확인한수치아님.

## 범위와 인계

- 상태: 구현·합성동시성재현/회귀·전체자체검사완료,독립검증인계대기. 담당해제.
- ADR019/LEARN-0019. 미완료: 실제iOS계정전환·저장/복원·찜연동/오프라인/실폰재시작,독립새컨텍스트리뷰. 합성서버검사를폰/Google/전체제품PASS로표현하지않음. 새정식runner판정없고이전ERROR·secretfinding·acceptance미승인유지.
- 다음주작업은데이터추가가아니라공통plan의계정설정·찜사용흐름검증이다. 데이터는ott-batch-backlog유형별로모아준비된배치만기존CLI전체입력으로처리한다. 같은페이지를작품별로재조회하며작업종료를반복하지않는다.
- API계약/migration/승인기준변경없음. 독립handoff의backend실제코드head는커밋후아래기록(문서최종head와구분). app/verifier는이번코드변경없음. 기존개인dirty보존.

- 실제 backend 코드 head `a960ac796c839a8980995a72677b60fe2a39622d` (추후 문서커밋 제외). app base/head `6a530ffb8fe07e45ad0455c115449ba063ae2114`/동일(문서변경제외), verifier base `48348c40f338a42660dc1c3855f0186aca8c8d1c`(학습/문서만후속변경).
- 계약0.1.0-draft.4 manifest SHA256 `96cc08536324f8b5a7c537783caa93a1ce33de533526032e01621282fb601122`, migration집합runner SHA256 `853337eadc11cd3c8c619c9e53d961cb7eead5fe0a79368c5d167324598bb697`/불변. acceptance0.1.0-draft SHA256 c4906283810c8b378800b67930028685a41b6a051923ea9f9415346b2d657063/미승인. 검사범위backend-only작성자/새독립runner미실행.

종료검사: 최종tsc/세저장소git diff --check exit0. 공통status/handoff/plan/ott-batch-backlog사본동일, data/가base703a8e1대비변경없음,합성실패2·수정통과2·컨테이너정리기록확인exit0. 코드커밋후문서최종HEAD와검사대상코드HEAD를구분한다. 공통문서첫동기화는기본sandbox의backend쓰기권한오류후허용재실행으로완료했다.
