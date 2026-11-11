# DATA-09 · 공식 OTT 검토 데이터 7건으로 확대 (2026-11-11)

- 요구사항: PROD-005/007/009, 공식 OTT 실데이터의 안전한 수동 확장.
- 담당: codex-ott-review-09, 구현·로컬 게시 완료, 담당 해제.
- 기준: backend b6e55456ebe14aabb83ab7c81cdb3cf945328856 / codex/app-auth-phone-ready, 시작 dirty 없음. app 998465ed49b7af98e3d6215bae12e836d60d0276 / 동일 브랜치, 개인 `ios/GODIEOR.xcodeproj/project.pbxproj` 변경 보존.
- 범위: `data/curated/ott-reviewed-mappings.json`의 공식 소스 후보 세 건 추가와 기존 한 건의 최신 후보 revision 재검토. API·스키마·마이그레이션·verifier 승인 기준 불변.
- 예상 실패: 오래된 revision(STALE_MAPPING), 공지에 포함된 여러 작품을 잘못 병합, 공지일을 공개일로 오인, 미확정 시간대 생성, 로컬 데이터가 클라우드에 자동 복사된다고 오인.

## 검토한 공식 근거

| 작품 | 카테고리 | 서비스 | 공개 날짜 | 근거 |
|---|---|---|---|---|
| 데블스 플랜: 데드 어게인 | 예능 | Netflix | 2026-11-10 | https://about.netflix.com/ko/news/the-devils-plan-dead-again-teaser |
| 심장소리 | 영화 | Netflix | 2026-11-02 | https://about.netflix.com/ko/news/heartbeat-arrives-netflix-november-2 |
| 대리수능 | 오리지널 시리즈 | TVING | 2026-11-23 | https://cjnews.cj.net/티빙-오리지널-시리즈-대리수능-메인-포스터-공개/ |

- 기존 검토 네 건(천천히 강렬하게·하우스 오브 드래곤 S3·유미의 세포들 S3·비엔나 게임)을 유지. `천천히 강렬하게`의 재수집으로 변경된 후보 revision을 날짜 공식 근거 재확인 후 갱신.
- 날짜만 확인된 사건은 `date_only`, 시간·시간대는 null. 자동 OTT 전수 커버리지나 영화/OTT 포스터 완비를 뜻하지 않음.

## 실제 실행과 결과

- `npm run candidates -- review --file /private/tmp/godieor-review-new-{0,1,2}.json`: 세 후보 각각 exit 0.
- 최초 `npm run publish:reviewed -- --file data/curated/ott-reviewed-mappings.json`: 기존 Netflix 후보 STALE_MAPPING으로 exit 1, 게시 이전 차단.
- 공식 날짜 재확인 후 `/private/tmp/godieor-review-refresh.json`으로 기존 후보 재검토: exit 0.
- 전체 사전 검사: prepared 7. 같은 publish 명령 재실행: exit 0, `ott_reviewed` provider succeeded, 로컬 PostgreSQL 7건 게시.
- Cloud Supabase DB 게시·Render 서비스 생성·실폰 조회·독립 verifier run은 **미실행**. 작성자 로컬 실행 결과만 기록. 계약/migration digest 변동 없음.
- ADR/LEARN: 기존 ADR-013/LEARN-0011 절차 적용, 새 기술 결정·학습 기록 불필요.

## 다음 세션

- 신규 Supabase Free 프로젝트와 Render Free 서비스의 실제 자격 증명/배포 연결 확인. 비밀은 각 서비스 Secret에만 저장.
- 새 DB migration 적용 후 공식 수집 및 OTT 후보 검토/게시를 재현하고 `/v1/health`·일정·포스터 API 확인.
- iOS 공개·인증 API URL을 같은 Render HTTPS 주소로 설정해 새 빌드 설치. 개인 signing 변경은 이번 커밋에서 제외.
- 자동 OTT 수집은 아직 공지 후보화 단계이며, 검토된 공개일의 자동 게시로 오인하지 않음.
