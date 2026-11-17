# DATA-71 · 게시 원천 재검증과 첫 자동 일간 실행 관측

- requirement PROD-005/006/007/008/009, acceptance 0.1.0-draft 불변.
- 진행, 담당 codex-data71-01. app base028c28e(개인pbxproj 보존), backendd2e84ad(clean), verifier6567fa9(clean).
- backend codex/ott-source-refresh /private/tmp/godieor-data71-backend 별도 worktree. 기존 checkout의 09시 launchd 실행 중이므로 현재 파이프라인 코드를 병행 수정하지 않는다.
- 관측: 2026-11-17 09:00 KST launchd 자동 기동 runs1/xpc event/Node24, 09:23 TMDB 전수수집 진행. Netflix78은 전일과 동일. 미정 영화/기프트 검색에서는 아직 새 공식 일자 확보 안 됨.
- 범위: DATA70 신규23의 공식 원천 재검증을 일간 경로에 연결, date/season/type/identity 변경과 실패를 명시하고 기존93 보존. 실제 09시 job 종료까지 결과 관측.
- 실패 사례: 변경된 일자를 묵인, 오래된 원문을 fresh로 주장, 다른 작품/지역/회차 배너 매칭, 기존 review를 자동 덮어쓰기, 실행 중 코드 교체, 중복 게시.
- ADR022/LEARN0021. 자동 재검증은 새 최초일 승인이나 independent verdict가 아니다.
