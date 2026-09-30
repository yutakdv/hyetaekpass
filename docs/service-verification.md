# 혜택패스 0.2.0 서비스 흐름 검증

2026-09-30 Asia/Seoul, `codex/validation-build`, 초기 검증판 `faf30de` 이후 서비스 구현 작업 트리. 총괄과 전문 에이전트의 실제 실행 결과다. 최종 커밋은 이 문서를 포함한 Git 이력으로 확인한다. 공개 규칙 0개·공개 위치 OFF를 유지한다.

사용자가 정한 우선 과업은 **현재 매장에서 가장 유리한 멤버십 바코드·QR 또는 카드 혜택 찾기**다. 보유 수단 후보를 기존 TypeScript 엔진으로 각각 비교하고 확인된 조건의 결과·제시 순서·등록한 멤버십 코드로 연결한다. UNKNOWN 후보가 남으면 전체 최대 할인은 확정하지 않는다.

## 실행 결과

| ID | 실제 실행·결과 | 범위·증거 |
|---|---|---|
| SX-01 | `npm test` 67/67, 실패·skip 0; `npm run typecheck` exit 0 | 계산/안전, 로컬 모델 이행·월/등급 무효화·대기 쓰기/삭제 세대·제보 보상 삭제·코드 형식/크기·관리 분류 80자 경계. `/private/tmp/hyetaekpass-service-node.log` |
| SX-02 | `npm run build:admin` 및 validation `npm run build:web` exit 0 | `/private/tmp/hyetaekpass-service-admin-build.log`, `/private/tmp/hyetaekpass-service-web.log` |
| SX-03 | 390px 웹 빈 카탈로그·온보딩·지갑 등록·4단계 개인 조건 작성 | 시험 멤버십과 비개인 데이터. 인간 사용성 시험 아님 |
| SX-04 | UNKNOWN에서 계산 금액 없음 → TRUE·잔여 1,000원/1회 → 12,000원 즉시 1,000·지금 결제 11,000·청구 0원 | 개인 10%·상한 1,000원, ORIGINAL/FLOOR/INSTANT, 2026-09-30~12-31 KST. [결과](verification-evidence/service/checkout-result-390.png) |
| SX-05 | 결과 코드 CTA → 정적 QR 표시. 재실행 후 지갑·규칙·QR 보존 | 시험값 `HYETAEKPASS-DEMO-MEMBER-0001`. [390px QR](verification-evidence/service/membership-qr-390.png), [320px QR](verification-evidence/service/membership-qr-320.png) |
| SX-06 | 준비된 재방문 과업 1회 10.569초에 결과 도달 | CUA 홈→내 조건→12,000원→조건→결과 벽시계 시간. 등록한 시험 데이터·같은 달 확인 조건 사용. 인간 성공률·현장 적용 증거 아님 |
| SX-07 | 저장·해제·재저장·상세 후 최근 확인 1/10, 저장 1/40 | 금액/거래 결과 없이 ID로 최신 자료 조회. 320px QR/저장 화면 DOM 가로 overflow false |
| SX-08 | 새 UI 제보→영수증→기존 제보 삭제 후 수정 접수→inbox 새 ID 1건→분류 저장→단말 삭제→양쪽 빈 목록 | 로컬 실제 Spring/PostgreSQL. 시험 ID `42728d6d…`→`ef69940e…`, 토큰 미표시. [관리 분류](verification-evidence/service/admin-report-classified.png) |
| SX-09 | iOS validation Release Simulator 설치·launch PID 82853·프로세스 유지, JS fatal/error 패턴 0건 | 마지막 기본 수단/수동 refresh 두 수정 직전 source. native GUI 미검증. `/private/tmp/hyetaekpass-service-ios-runtime.log` |
| SX-10 | Android validation APK install Success·launch PID 3614·프로세스 유지·오류 로그 0 bytes | 같은 직전 source. API 37 Google APIs arm64 headless emulator. `/private/tmp/hyetaekpass-service-android-runtime.log` |
| SX-11 | 최종 source iOS unsigned iphoneos Release `BUILD SUCCEEDED`, Android arm64 AAB `BUILD SUCCESSFUL`, exit 0 | 아래 source/산출물 대조. 운영 API·서명·스토어 제출 아님 |
| SX-12 | compiled iOS ATS false·Always/Motion/FaceID 없음·background fetch만. Android cleartext false·배경 위치/foreground service/외부 저장소/system alert 없음 | privacy manifest tracking false·collected data 빈 배열, SecureStore backup 제외 참조. 실제 수집/스토어 심사와 구분. [SDK 결정](sdk-decisions.md) |
| SX-14 | 웹의 이번 합성 지갑·규칙·QR·즐겨찾기·최근 전체 삭제 후 reload | 온보딩·지갑 0개·저장 0/40·최근 0/10 확인. [재실행](verification-evidence/service/deleted-restarted.png). 실제 사용자 자료/OS backup 시험 아님 |
| SX-13 | 독립 AI 리뷰 P2/P3 수정 후 회귀. 후속 기본 선택/refresh/분류/코드 범위 25/25 PASS, 새 P1/P2 없음 | 실제 App action harness와 소스 검토. 할인 원문 사람 검수·물리 시험 아님 |

비교는 한 카드와 최대 한 멤버십 시나리오를 공통 엔진에 넣는다. 새 금액 산식을 만들지 않고 검수된 조합 관계가 없으면 합산하지 않는다. 여러 카드 후보·UNKNOWN 제외·검수된 가상 1,550원 조합 회귀를 포함한다. 개인 규칙의 합성 source 권리/신선도는 화면에 검수 증거로 표시하지 않는다.

BE·AI·계산 엔진·infra는 이번에 변경하지 않았다. 기존 Java 10/10·실제 HTTP 9개·Python 18/18·독립 journal 복구 3개·source Docker/빈 DB migration·cfn-lint 35 resources 결과는 [기존 레저](verification-ledger.md)에 보존한다. 이전 검사를 0.2.0에서 재실행한 것으로 표현하지 않는다. 새 제보 API는 SX-08에서 실제 재실행했다.

## 최종 native 산출물

같은 컴퓨터의 ignored `.local-tools/artifacts/`에 있다. 생성 프로젝트·도구 캐시는 Git 제외다.

| 산출물 | 크기·SHA-256 |
|---|---|
| `hyetaekpass-service-production-internal.aab` | 22,640,168 bytes · `3d995a85f0c7ecf15e85c3b419eacb5cfac0897cc14f506175f2420b916c9e59` |
| `hyetaekpass-service-production-unsigned.app` | 파일 합계 34,339,909 bytes. main.jsbundle 4,938,862 bytes · `adb5c7f6a1e0de478a6dd0f8cff33887b4ff535ca9b7e3053182c1c575793a5e` |
| `hyetaekpass-service-validation.apk` | 32,327,357 bytes · `069895ac2e03d67ed2864a70699cdf1f230acd560e5eb2d812ea9536a3462b11` |

최종 App SHA `634ce9f6b380af5ea1f7a5ee2ba57779a020fbd397792548df65e2d50eeefa06`, ServiceUI SHA `2a9216ac2746a444274b38b22f6a349a6583e0d7477516e4b1d2baa25b6e3ab3`. source 31개 및 실제 output/복사본 일치를 대조했다. [native 증거](verification-evidence/service/native-build.json)의 원본은 ignored `.local-tools/artifacts/service-native-evidence.json`이다.

21:38 KST 최종 문서 변경 뒤 typecheck와 Node 67/67을 다시 확인했다(`/private/tmp/hyetaekpass-service-final-node.log`). 변경 Markdown 10개 링크/코드 fence 오류 0건, native source 31개 SHA 일치. 최종 그래프 재색인 1,647 nodes/3,999 edges 후 MCP에서 `compareWallet`의 새 파일 매핑을 확인했다.

Production은 `APP_ENV=production EXPO_PUBLIC_API_URL=https://api.hyetaekpass.invalid NODE_ENV=production`, `EXPO_PUBLIC_VALIDATION_BUILD` unset이다. HTTPS placeholder이며 운영 연결은 미수행이다. iOS unsigned, AAB 실제 debug 인증서 서명이다. 최종 로그 `/private/tmp/hyetaekpass-service-ios-production-final.log`, `/private/tmp/hyetaekpass-service-android-production-final.log`. [기기 시험](device-test.md)에 명령·설치·endpoint가 있다.

## 남은 실제 시험과 외부 게이트

- 200% OS 글씨·VoiceOver/TalkBack·실물 키보드/safe area·매장 QR/CODE128/EAN13 스캔은 미검증이다. RN 글씨 확대·터치 영역·접근성 이름/상태·키보드 회피를 구현했으나 통과로 표시하지 않는다. CUA 브라우저 확대 키는 viewport/ratio를 바꾸지 않아 확대 증거가 되지 않았다.
- 모든 상태의 양 OS native 과업·오프라인·권한 거절·삭제/재설치·backup·현장 위치/배터리 시험은 외부 대기다. 일부 웹 흐름/자동 검사로 전체 native 통과를 선언하지 않는다.
- 실제 자료 권리·작성자 외 실제 사람 검수·사업/법률/상표·위치/광고 동의·운영 OIDC/MFA/HTTPS·AWS 비용/배포/복구·스토어 키/승인은 미완료다. 공개 데이터/자동 위치는 0개/OFF다.
- 공개 혜택 0개에서는 사용자가 기록한 조건으로만 계산한다. 모든 혜택을 자동으로 아는 앱이나 실제 할인 적용을 보장하는 출시 서비스로 표현하지 않는다.
