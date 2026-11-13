# BE-AUTH-07 실제 재현 근거

baseline.log는Git703a8e1의기존코드를임시DB에서실행한2개실패, fixed.log는같은교차쓰기조건의수정2개성공이다. 기존코드는스크립트내명시한Git원본을메모리에서변환하며checkout을되돌리지않는다. product/개발DB는사용하지않았다. summary.json은임시컨테이너정리결과다.

실제사용한임시DB실행orchestrator 사본은run-temporary.py, 검사구현원본은scripts/check-account-snapshot-db.cjs이다. backend의컴파일된소스와Node24/형제verifier/Docker가필요하다. Node경로는당시환경이며다른환경은설정해실행한다. env는일회용DB주소만주입하고민감값은출력하지않는다. 기본전체검사156개에는이2개실제DB케이스가포함되지않으므로별도실행한다. targeted.log6개와test-tracked.log156개는각각기존회귀검사다.

실폰·실제Google·계정설정UI왕복·독립승인증거는아니다. 원본사건은예방설계가아니라합성동시성검사에서재현된결함이며실사용자장애나성능개선측정으로표현하지않는다.
