# ADR-004 · 계정 기반 + Google 연동

- 날짜: 2026-11-09 KST
- 상태: **계정/Google 방향은 사용자 선택, 아래 실행 흐름·세션 상세는 설계 제안**.
- 사용자 답변: “로그인은 계정넣어야지. 구글 연동 하면 좋을듯?”
- 관련 정책: P03. 후속 답변으로 개인 설정·찜의 계정 저장/복원, Google 로그인 사용자 이용을 확정했다. acceptance 승인은 별도다.

## 제안 흐름

iOS Google 로그인 → Google ID token을 HTTPS로 backend에 전달 → 검증 → 내부 계정 식별 → 서비스 세션.
backend는 Google 공식 Node 인증 라이브러리로 서명·issuer·audience·만료 등을 확인한다.
검증된 provider+sub를 계정 연결 키로 삼으며 클라이언트가 보낸 email/ID 문자열만으로 로그인시키지 않는다.
서비스 세션의 저장/갱신/폐기·수명과 앱의 자격 저장 방식은 계약 단계에서 정한다.
Google Drive/Calendar 접근이나 서비스용 Google API 비밀을 앱에 배포하는 것은 범위에 포함하지 않는다.

## 추가 결정과 실행 준비

- Google 인증 사용자 이용은 허용한다. 필수/선택 로그인 화면·계정 삭제·연결 상세는 후속 설계한다.
- 개인 설정·찜을 계정별 서버 저장하고 재로그인·재설치 시 복원한다. 찜 대상 단위·충돌 정책은 후속 설계한다.
- iOS/서버 OAuth client ID와 동의 화면 설정, 테스트 계정, 실제 서명된 기기에서의 확인.
- 실제 Google 접근 검사와 결정적 가상 token 검사를 별도 기록.
- 공개 App Store 배포 시 Apple 4.8 적용·예외와 동등한 대체 로그인 조건을 검토.
  지금 Sign in with Apple을 추가로 승인받았거나 구현한 것으로 처리하지 않는다.

계정/로그인 코드는 아직 구현하지 않았고 OAuth 프로젝트·클라이언트 생성이나 외부 로그인은 수행하지 않았다.

## 공식 근거 · 2026-11-09 조회

- [Google iOS backend authentication](https://developers.google.com/identity/sign-in/ios/backend-auth)
- [Google iOS 설정](https://developers.google.com/identity/sign-in/ios/start-integrating)
- [Apple App Review 4.8](https://developer.apple.com/app-store/review/guidelines/#login-services)
