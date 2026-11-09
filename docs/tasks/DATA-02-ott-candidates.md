# DATA-02A · 정확한 날짜 기준과 OTT 공지 후보 수집

- requirement: PROD-005/007/009, P05/P07/P09. 사용자 확정: 연·월·일이 있는 일정만 달력에 반영,
  시각/시즌은 있는 값만 사용, 연/월 등 불완전 날짜는 후보로 보류해 추후 갱신. 모든 작품 확보를 약속하지 않음.
- 담당: codex-data-02. 상태: 구현·작성자 검사 완료, 담당 해제. 제품 publish·독립 검증 전.
- 기준: app 1854771/dev, backend b0c7f25/main, verifier ae17a5b/dev. 시작 clean.
- 범위: 공통 정책/인계 갱신, backend 후보 수집 CLI·검토 입력·날짜 검사·로컬 staging·자체 검사.
  제품 공개 API/DB 스키마/기존 migration/승인 acceptance의 임의 변경 없음.
- 완료 조건: 공식 RSS에서 원문 링크 후보 수집, 일자 검증/보류 및 반복 수집·변경 이력,
  Disney+는 자동 접근을 강제하지 않고 공식 링크의 검토 입력 지원. 실제 소량 수집 및 결정적 반례 확인.
- 실패 가설: 게시일→공개일 오인, 연/월→가짜 일자, 시즌1 추정, 회차/플랫폼/시장 오인,
  재수집 중복, 변경 후 이전 검토 재사용, 부분 실패가 기존 후보 삭제, 원문 재배포·임의 URL 요청.
- 운영 선택: 공지 후보는 공개 전 단계이며 검토된 필드만 별도 내보내기. publish adapter 연결은 후속 작업.
- ADR-010 / LEARN-0008. 검증 기준 변경은 proposal만 작성하고 승인 상태는 변경하지 않음.

## 실행·종료

| 실제 명령/동작 | 결과 |
|---|---|
| npm registry 조회, Node24 임시 캐시 준비 | fast-xml-parser stable 5.12.0 고정, Node24.19.0. 시스템 Node20 설정 미변경 |
| npm install --save-exact fast-xml-parser@5.12.0 | 8패키지 추가, lock 고정 |
| npm run build 최초 | TS2783 중복 id 오류. 필드 제거 후 재실행 exit 0 |
| npm run test:candidates | 최종 빌드에서 14개 통과. 합성 입력으로 날짜/보류/중복/변경/출처/부분 실패/동시 writer 검사 |
| npm run candidates -- collect | 실제 공지 RSS 15/12/50 = 77개 수집, 제품 publish 0 |
| 공식 페이지 재확인 + add/review/export | 실제 근거 샘플 4개 작성자 확인·내보내기. 총 후보80개, 제품 publish0 |

작성자 확인 샘플: Netflix 천천히 강렬하게(2026-12-11), Coupang 하우스 오브 드래곤 S3(2026-06-23),
TVING 유미의 세포들 S3(2026-04-13), Disney+ 비엔나 게임(2026-11-18).
공식 URL은 로컬 reviewed.json/기존 DATA-01 조사와 사용법에 연결한다. 검토자는 implementer-source-check이며 사용자 승인/독립 검증으로 표시하지 않았다.
시간대 없는 시각을 UTC로 만들지 않고 시즌 번호가 없으면 null을 유지했다.

제품 DB·API·기존 migration/고정 계약은 변경하지 않았다. Node24 실행은 /private/tmp 캐시 경로를 PATH 앞에 두었다.
자체 검사에는 임시 디렉터리를 사용하고 DB가 필요하지 않았다. 운영 중인 DB/기존 프로세스를 변경하지 않았다.

다음: 안정 작품/시즌/이벤트 매핑과 다작품 공지 처리→검토 후보 ProviderAdapter 연결→독립 입력/DB/API 검사.
현재 한 공지별 선택한 작품 하나를 검토하며 전체 커버리지나 자동 필드 추출 정확도를 측정하지 않았다.
최종 커밋·문서/전달본 검사 결과는 후속 종료 확인에 남긴다.


## 코드 리뷰·후속 검사

별도 컨텍스트 reviewer가 내보내기 파일 잔존·A→B→A 옛 검토 재사용 2개 P2를 재현했다.
변경 시 export 무효화와 발생 token 분리 후 새 회귀를 포함한 `npm run test:candidates`(빌드 선행) 15개 통과.
구버전은 이번 세션의 Git 제외 출력뿐이며 이력을 보존한 v2 변환 뒤 공식 샘플 4건을 새 token으로 재확인/내보냈다.
공통 5문서 일치, 기존 계약/Prisma/migration 변경 없음, 새 학습 링크·생성기 구문 확인.
`python3 scripts/export-context.py` / `--check`: 47개 출처 생성/최신 확인 성공. 최종 커밋 후 재생성한다.
리뷰 원본 연결: verifier `reviews/2026-11-09-ott-candidates.md`. 승인 기준·제품 verdict는 변경하지 않았다.

추가 리뷰 지적 OTT-REV-03: 기존 v1 상태에서 조회 불가/내보내기 선삭제. v1→v2 후보 이력 보존 변환,
변환 성공 후 구버전 검토·내보내기 해제, 손상 상태의 원본 보존으로 수정했다.
최종 `npm run test:candidates` 빌드 포함 exit0/17개 통과. 실제 기존 후보80개/검토4개도 최종 코드에서 읽고 내보내기 성공.

최종 별도 리뷰 재확인 수신: 세 지적의 수정과 v1/손상 상태 파일 보존을 별도 CLI로 재현 확인했고 추가 지적 없음으로 보고됨.
이 코드는 아직 제품 publish 어댑터/고정 snapshot 통합 검증이 아니므로 acceptance/PASS는 그대로 유지한다.
