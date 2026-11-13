# DATA-48 작성자 실행 근거

runner-command.json은 최종 실행 argv, steps.json은 단계별 실제 argv/종료코드/로그hash, evidence/report는 검사한 고정 source binding과 실제 ERROR 판정이다. receipt.json은 이전 실패 실행도 요약한다. 원시 build/log는 /private/tmp 경로에 남으며 이 폴더는 값이 없는 판정·hash 및 관련 자체검사 로그만 보관한다. 공식 Node 다운로드 출처와 checksum, 임시DDL경계검사 입력, DB읽기감사 결과도 포함한다. 독립 승인 아님.

secret 탐지는 backend official-sources.ts의 환경변수 참조다. 실제 키가 아니라는 작성자 관측과 scanner FAIL을 구분하며 규칙·예외·finding을 변경하지 않았다. 독립 검토가 필요하다.
