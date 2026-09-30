# 화면 증거

2026-09-30 총괄이 CUA로 실제 localhost 화면을 조작하고 저장한 PNG다. 모든 지갑·규칙·제보 입력은 합성 시험 자료이며 실제 사용자·상품·권리·원문 검수 증거가 아니다.

| 파일 | 확인한 결과 |
|---|---|
| mobile-public-empty.png | 390px 최종 웹 화면, 실제 API 동기화·공개 자료 0개·계산/자동 알림 보류 |
| mobile-demo.png | 390px 웹 가상 예시. UNKNOWN 제외, 조건 확인 뒤 12,000원 → 즉시 1,000원·결제 11,000원·청구 550원 |
| mobile-wallet.png | 시험 지갑 등록·수정·재실행 보존. 당시 API 실패 표시는 서버 연결 성공 증거가 아님 |
| mobile-personal.png | 직접 작성 규칙의 미검수 표시와 단말 계산 |
| admin-rollback.png | 빈 시험 버전 게시 후 차단·모든 flag OFF·이전 버전 롤백. API bootstrap에서도 revision 1·누적 차단·OFF 확인 |
| mobile-report-deleted.png | 합성 제보 POST → reviewer inbox 분류·종결 → 앱의 삭제 토큰으로 서버 삭제. 이후 inbox는 빈 배열 |
| mobile-data-cleared.png | 시험 지갑·개인 규칙·조건·캐시·동의 전체 삭제 후 빈 지갑. 재실행에서도 비어 있음 |
| admin-audit.png | 실제 서버 감사 조회. 수행자·행위·대상·시각만 있고 제보 본문·토큰·IP 없음 |

`ui-empty-20260930-v1/v2`, `TEST-EMPTY-NO-ORIGINAL-REVIEW`, `TEST-empty-no-rules`는 규칙 0개 카탈로그의 local 역할 분리 시험이다. 자동 시험의 `HUMAN_REVIEW_RECORD` 행위명이 실제 사람이 원문을 검수했다는 증거가 되지 않는다. 실제 공개 규칙은 0개, 배경 자동 기능은 OFF다.

웹 캡처는 native SecureStore·권한·스크린리더·실기기 배터리·현장 품질 증거가 아니다. 네이티브 빌드/설치/실행과 외부 시험은 [기기 기록](../device-test.md), 전체 검사는 [검증 레저](../verification-ledger.md)에 구분한다.
