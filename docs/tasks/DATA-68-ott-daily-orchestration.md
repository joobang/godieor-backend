# DATA-68 · OTT 일간 자동 수집·게시 실행

- Requirement: OTT KR first release; StreamPick 26/52는 이번 완료 기준에서 제외 (2026-11-16 사용자 결정).
- 범위: 한국 공식 Netflix/TVING·Ads/Disney+/Coupang Play 수집, TMDB Changes 및 월별 발견, 확인된 첫날 자동 검토, 매핑·PostgreSQL 게시, launchd 매일 09:00 KST 실행.
- 실패 사례: 미완료 소스, provider 발견 범위 부족, 오래된 월별 스냅샷, 중복 정체성, 시즌/날짜 불일치, 일반 회차 혼입, 중복 실행.
- 기존 확정된 공식 근거와 TMDB 정체성이 함께 다시 확인된 경우만 자동 검토한다. 미검증 새 후보는 staging에 남긴다.
- 비교 대상 StreamPick은 `--compare-reference` 사후 감사로만 실행한다.

## 검사·실측

- 전체 `npm test`: 268/268 PASS (변경 직전); 후속 대상 회귀 10/10 PASS.
- 첫 실연계: 기존 reviewed 70건 로컬 PostgreSQL 게시 성공, 신규 첫날 게시0. TMDB writer_locked로 최신 독립 발견 불완전, `published_with_discovery_gaps` exit2.
- 실행 스케줄 파일 `dev.godieor.official-ott-daily` macOS LaunchAgent 설치 성공(09:00 KST). 익일 자동 실행은 미관측.
- 재실행 중 로컬 workspace 잠금 파일 `EPERM` 발생; 권한 보완 실행을 별도 검증한다.
- 임의 날짜 생성 금지. 신규 공식 작품이 첫 공개일을 명시하지 않거나 시즌 식별이 불확실하면 DB 게시 대상이 아니다.

## 통합 검증 인계

- backend base aecbe99, branch codex/ott-animation-support. app ce8443d, 기존 pbxproj signing dirty 보존. verifier 2ad3d0a.
- API 계약·migration·verifier acceptance 및 verdict 불변.
- 신규 독립 runner, 클라우드 배포, 실 iPhone 확인 미실행. 기존 승인과 별개.
- LEARN-ID: 해당 없음. 기존 데이터 확인 정책을 재사용한 CLI·스케줄 결합 작업.
- 후속: 실 TMDB 완주 및 자동 검토에서 최초 신규 DB 행 생성 실측; StreamPick parity 개선은 별도 작업.
