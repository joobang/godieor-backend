# DATA-96 · 쿠팡 뉴스룸 접근 거부와 TVING 공식 예정작 경로

- GD-005 / PROD-005, GD-008 / PROD-008 운영 진단. backend base `33371c032c8ebe0c1f546ad97ba478ee48a59df2` 별도 worktree.
- 범위: GitHub와 Mac에서 동일 공개 링크의 응답을 확인하고, 확인 가능한 TVING 공식 목록 경로를 재검증한다.
- 실패 예상: 403 사유를 근거 없이 확정, 홈페이지 또는 전용 페이지의 비예정작 유입, 다른 주소로 리다이렉트된 응답 허용, 수집 실패로 기존 검토 일정 게시 중단.

## 같은 공개 주소의 러너별 응답

| 주소 | Mac | GitHub Actions |
|---|---|---|
| 쿠팡플레이 뉴스룸 카테고리 | 200 | 403, Akamai, Access Denied |
| 쿠팡플레이 공지 본문 한 건 | 200 | 403, Akamai, Access Denied |
| 쿠팡이 뉴스룸에서 직접 안내하는 카테고리 RSS | 200, 12항목 전체에 본문 있음 | 403, Akamai, Access Denied |
| TVING 홈 | 200, 공개 예정 6개 | 200, 공개 예정 범위 검증 실패 |
| TVING 공식 공개 예정 전용 페이지 | 200, 공개 예정 6개 | 500, 원래 경로와 다른 응답 |
| TVING 보도자료 뉴스룸 | 200 | 200 |

- Mac과 GitHub ubuntu-latest 모두 Node 24.22.3의 기본 HTTPS 요청을 사용했다. [목록 및 기사 비교](https://github.com/joobang/godieor-backend/actions/runs/45339797463), [RSS 및 보도자료 비교](https://github.com/joobang/godieor-backend/actions/runs/45340036752). 별도 테스트 브랜치에서 운영 비밀과 DB 없이 상태·제한된 헤더 분류만 기록했다.
- 우리 API 호출이나 원문 파싱 전에 쿠팡 공식 호스트에서 거절된다. 관측은 Akamai에서 반환된 접근 거부까지다. 국가, IP 대역, 봇 정책 등 구체적인 차단 조건은 제공처 설정 또는 로그가 필요하다.
- 뉴스 목록 요청과 기사 요청의 상태를 분리했다. 동일한 공식 목록이 직접 403을 반환한 실행에서는 해당 목록으로 시작하는 두 번째 공개일 수집 단계를 건너뛴다. 다른 URL로의 리다이렉트, 개별 기사 403, 목록 429는 이 조건에 포함하지 않는다. 검토 완료 OTT 게시와 다른 제공처는 기존 흐름을 사용한다.

## 공식 일정 확인

- Mac TVING 공개 예정작 6개 조회 성공, 원천 오류 0, 신규 검토 제안 0. 무쇠소녀단3(11/26), 그냥사람친구(11/27), 보검매직컬 시즌2(11/29), 대탈출 : 도시괴담(12/2)은 운영 KR API에 `tving`과 동일한 날짜로 모두 반환됐다. 기프트와 두번째 시그널은 TVING 작품 페이지에서 명시 일자를 확인하지 못했다. 뉴스룸의 보도자료는 예정작 전체 목록을 대체하지 않는다.
- Mac 쿠팡플레이 공개일 3건을 실제 공지와 TMDB로 대조했다. 세 건 모두 최초 공개 명시 부족으로 보류, 그중 1건은 출연진 대조도 미완료. 신규 승인·게시 0건. [공식 뉴스룸](https://news.coupang.com/archives/category/coupangplay/).

## 검증과 인계

- app base/head `bad2576eaf2907018219cd4f01d64d1b2e3d63b6`; backend base `33371c032c8ebe0c1f546ad97ba478ee48a59df2` 및 해당 작업 커밋. API 0.1.0-draft.5 manifest `04cfea7456d83ca141ba64c6d6568365b00cbdf2d5e95eacd8c4dad7249a0f2e`, migration manifest `feeb684462340075302b9a05ff3102740f6fe7d87c667ea8c455752c1433ba1b`.
- verifier checkout `8fe280c`, acceptance 0.1.0-draft SHA256 `c4906283810c8b378800b67930028685a41b6a051923ea9f9415346b2d657063`. 독립 통합 runner와 판정 미실행. 별도 컨텍스트 코드 리뷰에서 리다이렉트 응답과 429의 분기 지적을 반영했다.
- LEARN-0022의 실패 분류와 민감정보 배제 원칙을 재검토했다. 기존 제공처 접근 경로와 배포 구조를 유지한 진단 보완으로 신규 ADR 미작성.
- 구현 head `e277fa7dd727de03dd282116803df88ee6d81790`. Node24.22.3 합성 DB 설정에서 `npm test` exit 0, 387/387. 리다이렉트 원천·경로, 기사 단독 403, 목록 429 및 검토 완료 일정 게시 유지 검사.
