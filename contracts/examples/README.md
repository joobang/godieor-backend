# 가상 응답 예시

모든 제목·ID·날짜·출처는 가상이다. 실제 API 연동/검증 fixture 결과가 아니다.

- [calendar.json](calendar.json): GET /v1/calendar?month=2026-11&country=KR&timeZone=Asia%2FSeoul&categories=movie,ott
- [events-page.json](events-page.json): GET /v1/events?schedule=dated&from=2026-11-11&to=2026-11-13&country=KR&timeZone=Asia%2FSeoul&categories=movie,ott&catalogRevision=1
- [event-detail.json](event-detail.json): 가상 OTT 시즌 2 최초 공개의 상세. 11월 11일 15:00 UTC는 KST로 11월 12일 00:00이다.
- [settings.json](settings.json): 로그인 후 신규 계정 기본값. 기존 설정을 덮어쓰는 명령이 아니다.

Swift decode/화면 계약을 읽기 위한 예시다. 독립 검증 담당은 구현 출력/이 예시를 그대로 정답으로 복사하지 않고 정책에서 자체 기대값을 구성한다.
