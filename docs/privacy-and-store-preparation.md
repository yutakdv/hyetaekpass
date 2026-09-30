# 개인정보 흐름과 양 스토어 제출 준비

기준일 2026-09-30. 구현에 맞춘 검토 초안이다. 사업 주체·법률 적용·처리방침 확정·실기기 통신·스토어 제출/승인은 미수행이다. [법률 원문](05_법률개인정보_및_출처.md)의 확인 과제를 유지한다. 공개 위치 기능과 자동 알림은 OFF다.

## 현재 데이터 흐름

| 항목 | 처리 위치·목적 | 외부 흐름·삭제 |
|---|---|---|
| 지갑 | 이름·종류·등급·상품 버전, 단말 보호 저장 | 서버 전송 없음. 번호/CVC/금융 로그인 입력 없음. 앱 전체 삭제 및 보유 수단 삭제 |
| 개인 조건·작성 규칙 | 자격 TRUE/FALSE/UNKNOWN·잔여·월·혜택 버전·입력 시각, 단말 계산 | 서버·외부 모델 전송 없음. 수정/삭제/월·버전 변경 재확인 |
| 현재 위치 | 명시 요청한 주변 거리 계산, 선택형 내부 파일럿의 실제 관측 | 서버 좌표/이동 이력 없음. 후보는 메모리. 철회 시 OS 등록·작업·후보·알림 정리 |
| 알림 | 단말 로컬 알림·일 한도·브랜드/점포 쿨다운 | 서버 APNs/FCM 요청·push token 테이블 없음. 카드·등급·좌표·보장 금액 없는 문구 |
| 공개 자료 | bootstrap/safety와 허용 catalog JSON | 최대 정상 안전 확인 24h 및 원문/혜택/권리 중 이른 기한. 파일 실패는 기한 연장 금지. 차단/OFF 먼저 |
| 오류 제보 | 사용자가 입력한 rule/category/message, API/PostgreSQL | 자유 입력 개인정보 경고. 삭제 토큰은 단말, 서버 SHA256만. 본문·토큰 로그/AI 전송 없음 |
| 서버 제보 보존 | 종결 30일 또는 생성 90일의 제품 제안 구현 | 독립 journal 선기록 삭제와 복구 replay. 실제 법정 의무 확인 후 기간 조정 |
| 관리 인증·감사 | 실제 운영자 subject·role·시간·대상·행위 | OIDC 제공자와 서버. 본문·삭제 토큰 감사 복제 없음. 법정 접속 기록 보호/기간 별도 확정 |
| HTTP/IP | 요청 연결·rate limit에 필요한 서버 원격 주소 | 메모리 rate limit, 기본 access log 꺼짐. 실제 ALB/WAF/인증 제공자 처리·국가·계약 별도 확인 |
| 소스·검수 증거 | 실제 이용권·원문 검수 문서, private 파일/S3 | 공개 catalog와 분리. 실제 접근·보존·철회 권리 필요. AI 검토가 사람 원문 검수를 대신하지 않음 |
| AI 도구 | 허용 비개인 CSV/JSON 로컬 후보·차이·근거·전체 시간 | 네트워크/model 호출·게시 권한 없음. 민감 항목 거절. 수동 경로 유지 |

단말 처리만으로 법률 의무의 면제를 주장하지 않는다. 위치 사업·광고 수신·위치 확인 기록·개인정보 위탁/국외 처리·법정 관리 기록은 실제 주체의 흐름을 근거로 별도 확인한다. 제품 cache TTL이나 제보 30/90일 제안으로 법정 기록을 삭제하지 않는다.

## SDK와 바이너리 대조

버전은 `package-lock.json`과 [SDK 결정](sdk-decisions.md)을 따른다. Expo/React Native를 사용하고 SecureStore, FileSystem, Location, Notifications, TaskManager, Crypto를 호출한다. 외부 광고·분석·crash·런타임 AI SDK는 추가하지 않았다. Expo development client는 내부 개발 용도다. 웹 미리보기는 브라우저 저장소를 사용하므로 **가상 입력만** 시험한다.

SecureStore는 iOS Keychain/Android 보호 저장을 사용한다. [Expo 안내](https://docs.expo.dev/versions/latest/sdk/securestore/)의 uninstall·Android backup 한계를 고려한다. [Apple Keychain 문서](https://support.apple.com/guide/security/keychain-data-protection-secb0694df1a/web)에 따라 `THIS_DEVICE_ONLY`만으로 같은 기기 backup 복원 방지가 끝났다고 표시하지 않는다. backup 제외 설치 marker를 사용하고, marker 유실/재설치/복원에서 초기 삭제하도록 구현한다. 실제 같은 기기 복원 시험은 [기기 절차](device-test.md)의 외부 대기 항목이다.

운영 prebuild는 HTTPS를 요구하고 배경 위치·개발용 권한을 제외한다. 내부 검증용 HTTP/LAN build와 스토어용 production build를 구분한다. 제출 전에 생성된 Info.plist, Android merged manifest, PrivacyInfo.xcprivacy, 의존 SDK privacy manifest, 실제 release 통신과 데이터 안전/개인정보 답변을 같은 binary hash에 묶어 재검토한다. manifest 파일 존재만으로 store privacy 신고가 완료된 것이 아니다.

## 제출 내용 초안

- 이름: **혜택패스**, 영문 **Hyetaekpass**. bundle/application ID: `com.hyetaekpass.app` (개발 ID이며 계정에서 소유·사용 가능 여부 미확인).
- 짧은 소개: “결제 전에, 조건을 또렷하게.” 카드·멤버십 조건을 직접 확인하고 예상 금액과 필요한 이용 순서를 구분하는 무료 검증판.
- 설명: 지갑과 개인 조건은 단말에 저장한다. 적용을 보장하지 않으며 “모름”인 조건은 예상 합계에서 제외한다. 현재 실제 공개 계산 자료는 0개다. 가상 예시가 실제 혜택이 아님을 설명한다.
- 심사 안내: 계정 없이 지갑/개인 작성/수동 계산을 시험한다. 위치·알림 거절 시 수동 경로를 유지한다. 공개 배경 자동 기능은 OFF이며, 운영 build에는 미승인 배경 권한을 포함하지 않는다.
- 지원 URL·개인정보 URL·사업/판매자 명의·연락처·연령등급·국가·저작권·실제 screenshot·privacy 답변은 소유자가 확정해야 한다. `.invalid` 개발 링크를 공개 지원 주소로 제출하지 않는다.

## Apple 준비 — 미제출

[App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)의 개인정보·권한 목적과 배경 서비스 범위를 확인한다. 단말 위치와 광고성 로컬 알림의 실제 동의·설정·철회를 심사 설명과 일치시킨다. [개인정보 HIG](https://developer.apple.com/design/human-interface-guidelines/privacy/)에 따라 목적을 해당 기능 요청 시 설명한다. 원문 권리, privacy manifest의 required reason API, SDK 서명, encryption 답변은 제출 binary로 점검한다.

필요 입력: Apple 계정 유형/역할, signing team/profile·certificate 보관 책임, 사용 가능한 bundle ID, 실제 iPhone, App Store Connect/TestFlight 권한, 공개 HTTPS 지원/정책 주소. 비밀 키를 채팅·저장소에 넣지 않는다. Simulator `.app`이나 unsigned iphoneos build는 설치 가능한 TestFlight/IPA가 아니다.

## Google Play 준비 — 미제출

[새 개인 계정 시험 요구](https://support.google.com/googleplay/android-developer/answer/14151465)는 2023-11-13 이후 생성된 개인 계정에 대해 최소 12명이 14일 연속 참여한 closed test 후 production access 신청을 요구한다. 계정별 실제 적용을 Console에서 확인한다. 기간 경과가 자동 출시 승인은 아니다. [내부/closed test](https://support.google.com/googleplay/android-developer/answer/9845334)의 초대·서명·테스트 참여도 실제로 확인한다.

[배경 위치 선언](https://support.google.com/googleplay/android-developer/answer/9799150)이 필요한 기능은 실제 허용 목적·동의·동영상·권한 선언을 준비한 뒤 별도로 판단한다. 현재 production 배경 기능은 OFF다. Data safety 답변에는 제보 자유 입력·인증 제공자·네트워크/IP를 포함한 실제 수집·공유·삭제 흐름을 대조한다. target API 요구는 제출 시 [공식 정책](https://support.google.com/googleplay/android-developer/answer/11926878)을 재확인한다.

필요 입력: 계정 생성일/개인·조직 유형/production access 상태, upload key와 Play App Signing 관리·복구 책임, 실제 Android 기기와 참여자, 공개 support/privacy 주소. 내부 debug key 서명 APK/AAB를 스토어 승인 바이너리로 표시하지 않는다.

## 외부 준비를 받기 전 유지할 상태

실제 소스 승인·작성자 외 사람 검수 없으면 공개 규칙 0개. 위치/광고/권리/OS·장소별 실측 증거 없으면 자동 flag OFF. 가용시간·사업 명의·지원·예산·스토어 계정 미확정이면 출시일을 약속하지 않는다. 제출과 비용 발생은 준비 자료 검토 후 소유자에게 필요한 권한만 요청한다.
