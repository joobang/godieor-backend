# DATA-50 · 미확인 한국 OTT 일정과 작품 식별 근거 재검토

- 요구사항 PROD-004/005/006/007/009, GD-004/005/006/007/009. acceptance draft/승인상태 불변.
- 상태 후보추가·근거검토·자체검사완료/독립검증인계대기, 담당 codex-data50-01. 구현 담당/순차 작업. 원본backend/docs/tasks/DATA-50-official-gap-review.md.
- base app b6afda7af3dfe60c20147c14ca78cafaa45debc5 / backend 8e974640cd3eb0848753de084181dbb1531ca99e / verifier 3294d08bcf74db05758fd88c939f51987ab5be1a.
- branch 세 저장소 codex/data50-official-gap-review. 기존checkout 순차 사용/동시작업없음. 기존 app pbxproj, backend .env.example/package.json 및 미추적 감사스크립트2/테스트2 보존. 비밀값 수동조회/커밋/출력 금지(DB읽기검사는Git제외.env 설정로드).
- 범위: 기존 미확인3행(전지적 집착 시점/문무/나인 투 식스)의 목표OTT 한국날짜 근거와 PAW Patrol: The Game의 정확한 식별을 공식출처 우선으로 재검토. 근거·반증·미확인 이유를 영구입력/결과로 남긴다. 충분한 공식한국첫공개근거일때만 검토/게시하고 SQL·API·반복게시확인. 부족하면 게시0과 다음해결조건 기록.
- 예상실패: 방송일=OTT일자추정, 검색0건=미공개단정, 비슷한게임명으로동일작품판정, 장르/플랫폼전수지원과정확한작품식별혼동, 이전61건을새실측으로기록, 작성자검사를독립승인으로표현.
- 완료조건: 4항목별검토결과/출처/시점/변경전후상태, 실제실행명령/결과, 공통상태/인계갱신과선별커밋. 새정책은확정하지않음. ADR013/017 기존증거·고정키원칙, LEARN-0011관련. 독립finding/runner판정은수정하지않음.


## 실제 결과

- PAW의미확인원인은콘텐츠title경로만검사했던정체성공백이었다. Netflix game/83098128이 App Store id6818349835로redirect되는관측을얻고,정확한slug의공식Store페이지에서PAW Patrol: The Game NETFLIX/Netflix, Inc./Games를확인했다. 이제exclude_game_from_ott로분류한다. Academy와합치지않고게임분야정식출시일로자동게시하지도않았다. 미국Store의등록정보는한국OTT날짜근거가아니다.
- 전지적집착시점: MBC공식티저는11/08방송을확인한다. 제3자StreamPick은캘린더11/08과arrivals11/11의다른의미날짜를보여둘다별도로보존. TVING최초일미확인으로계속보류. 제3자차이를공식날짜충돌로과장하지않는다.
- 문무: 오늘CJ공식티빙추천기사에서TVING공개라인업을새로확인했다. 기존Netflix후보의날짜근거로가져오지않고TVING별도미정후보를추가했다. KBS11/14방송일과언론Netflix보도를한국Netflix일자로대입하지않음. Netflix미공개를단정한것도아님.
- 나인투식스: SBS자사뉴스검색결과로11/25방송근거보강. 프로그램페이지본문은도구에서확인할수없었고Netflix한국일자는여전히미확인. 제3자11/11또는해외Netflix기사는채택안함.
- CJ2026-11-13추천5개: 뜨거운안녕/문무/보스의노골적취향/내새끼의연애3/브라더스. 공식한국TVING제공단서는있으나정확한첫연월일미확인이므로date=null/premiereConfirmed=false/precision=unknown/published=false. 내새끼시즌3만공식본문확인값,다른시즌은추정안함. 브라더스AppleTV+브랜드관구분유지.
- 로컬lineup staging169→174(+5), 재실행신규0/변경0/동일5. 이staging은앱공개일정DB가아니다. 제품DB읽기재측정61건/연중63, 신규게시0. 검토state/63개게시매핑의전후SHA256동일. 런타임/앱/계약/migration/승인기준수정없음.

## 실제 명령과 결과

Node24=/private/tmp/godieor-data48/node-v24.22.3-darwin-arm64/bin/node. 아래node는이경로. 웹도구검색/open은공개페이지를읽었으며로그인/가입/재생/설치없음.

| 명령·관측 | 종료·결과 | 근거 |
|---|---|---|
| 웹공식게임URL /game/83098128 open | AppStore id6818349835로redirect 후도구접근실패 | redirect관측과title명시StoreURL검색/open으로대조 |
| 공식Store slugURL open | 본문확인 | developer/title/게임분류,출시일추론안함 |
| MBC·SBS·Netflix·TVING·CJ검색/open | 성공/일부cache miss·본문없음 | source report에서authority구분. news.kbs.co.kr robots차단은우회안함. 검색부재=제공없음추정안함 |
| node scripts/prepare-ott-lineup.mjs data/lineups/tving-kr-2026-11-week2-undated.json /private/tmp/godieor-data50/prepared.json |0|5개미정후보생성 |
| node scripts/stage-ott-lineup.mjs data/lineups/tving-kr-2026-11-week2-undated.json work/ott-lineups (2회) |0/0|created5→0,stored174,changed0/unchanged5 |
| node --test tests/ott-lineup.test.mjs tests/tvingads-lineup.test.mjs tests/ott-review-backlog.test.mjs |0|기존관련18/18. 입력·잠금·날짜·분류등회귀 |
| node --env-file=.env /private/tmp/godieor-data50/audit.cjs |0|local only/SELECT61·63/검토state·게시매핑hash동일/모든신규날짜null |

새테스트를구현출력으로만들지않았으며관련기존18개만실행했다. 전체154·iOS빌드·독립runner는코드변경없어이번에는재실행하지않았고과거결과와구분한다. 독립review·클라우드·실폰표시·OS격리미실행이다.

## 독립 검증 인계

- app base/head b6afda7af3dfe60c20147c14ca78cafaa45debc5/동일(후속문서커밋제외).
- backend base 8e974640cd3eb0848753de084181dbb1531ca99e / 데이터head2028bd5cb14e1d9b6b62f8feb7247310d7c04245(후속카드/근거제외).
- verifier base3294d08bcf74db05758fd88c939f51987ab5be1a. 이후공통문서/학습관측만갱신. 새로운독립판정없음.
- 계약0.1.0-draft.4 manifest SHA256 `96cc08536324f8b5a7c537783caa93a1ce33de533526032e01621282fb601122`, migration집합runner SHA256 `853337eadc11cd3c8c619c9e53d961cb7eead5fe0a79368c5d167324598bb697`. 실제파일재계산/불변.
- acceptance0.1.0-draft SHA256 c4906283810c8b378800b67930028685a41b6a051923ea9f9415346b2d657063/미승인불변. DATA-48 secret룰환경변수참조탐지FAIL·필수SKIPPED·전체ERROR는그대로남는다. 작성자후보검사를통합PASS/외부승인으로표현하지않음.

## 다음 개발 세션 인계·학습

- 새로운행은달력배치하지말고TVING작품별첫제공일의정확한날짜원문을확보한다. 기존Netflix문무후보와TVING후보는별개로보존한다. 다른날짜/시장/서비스를제목만으로병합하지않는다.
- PAW정확한게임식별은해결됨. Academy도움말을다시찾는작업을반복하지않는다. 게임일정게시는별도범위이며이번작업으로추가하지않음.
- 전지적집착/문무Netflix/나인투식스Netflix3개목표날짜는미확인유지. 검색·도구제약과제공없음사실을구분. 날짜차이/기타OTT공식원천확대/독립finding검토가남음.
- 새ADR없음: 기존근거·날짜정밀도·서비스별이벤트정책적용. LEARN-0011에정확한route/앱ID연결과후보/게시분리관측연결. 실제장애/성과/사용자이해도추정없음.
- status/handoff3사본·OTT인계·학습갱신,기존개인dirty보존. 담당codex-data50-01해제. 최종SHA는Git이력조회(자기SHA미기재).
