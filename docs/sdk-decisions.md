# 구현 SDK 결정과 확인

## 0.3.0 쓸때 브랜드·공식 서비스 안내

새 SDK·금융 로그인·제휴 API를 추가하지 않았다. 기존 React Native `Linking.openURL`로 `providers.ts`에 고정한 공식 HTTPS 안내만 연다. providerId는 로컬 지갑 참조로 저장하며 API 요청·URL에 지갑 이름·코드·금액·위치·자격을 덧붙이지 않는다. 공개 도움말 웹 도착과 설치된 앱의 코드 화면 도착은 다른 결과다.

네이버·T/KT/U+ 멤버십은 정적 코드 입력 대신 공식 안내를 사용하고 배민클럽은 공식 주문서 혜택으로 안내한다. 일반 멤버십의 기존 정적 코드 렌더는 유지한다. 직접 저장과 복원 경계에서도 공식 제공사의 코드 저장을 차단한다. 제공사·종류·등급·버전 변경 시 기존 자격과 소유 수단을 확인할 수 없는 임시 누락 규칙의 조건을 제거한다. 개인 카드 조회 API·MyData의 가능 범위·운영 조건은 [카드 조사](provider-card-research-2026-09-30.md), 개인 코드 정책은 [멤버십 조사](provider-membership-research-2026-09-30.md)에 있다.

0.3.0은 Expo 표시명과 앱/적응형/알림/favicon 자산을 교체했다. 기술 package/bundle ID·저장 키는 유지하며 실행 결과는 [최신 검증](sseulttae-provider-implementation.md)을 따른다.

## 0.2.0 서비스 UI·멤버십 코드

Expo 호환 [SafeAreaContext](https://docs.expo.dev/versions/latest/sdk/safe-area-context/) `~5.7.0`, [아이콘 모듈](https://docs.expo.dev/guides/icons/) `@expo/vector-icons ^15.1.1`를 사용한다. 설치 버전은 각각 5.7.0·15.1.1이다. Ionicons 직접 import로 실제 양 OS TTF 1개와 원본 SHA 일치를 확인했다. QR/CODE128/EAN13은 [bwip-js 공식 generic SVG](https://github.com/metafloor/bwip-js) `@bwip-js/generic 4.11.4`와 `react-native-svg 15.15.4`로 단말에서 렌더한다. 별도 원격 생성·카메라/OCR·사진 권한을 추가하지 않았다.

QR 512 UTF-8 bytes, CODE128 ASCII 80자, EAN13 13자리 checksum을 검사한다. 사용자가 정적 멤버십 코드임을 확인한 값만 기존 보호 저장소에 보관한다. 코드값은 계산·제보·URL·로그에 자동 첨부하지 않는다. 동적 코드·실제 스캐너 판독은 지원/통과로 표시하지 않는다. 웹 preview는 합성 시험 코드만 사용했다.

최종 0.2.0 양 OS production 빌드·compiled 권한·source/산출물을 다시 대조했다. validation 설치/launch는 마지막 기본 수단/수동 refresh 두 수정 직전 source다. [최신 결과](service-verification.md)·[기기 기록](device-test.md)을 따른다. 아래는 초기 검증판 결정 이력이다.

2026-09-30 [Expo 공식 SDK](https://docs.expo.dev/versions/latest/), [Location](https://docs.expo.dev/versions/latest/sdk/location/), [TaskManager](https://docs.expo.dev/versions/latest/sdk/task-manager/), [Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/), [SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/)와 설치한 `expo/bundledNativeModules.json`을 대조했다. Expo 57.0.26의 호환값 React 19.2.3/RN 0.86.3을 루트와 모바일 workspace에 고정했다. peer 자동 호이스트로 RN 0.87.1이 선택돼 web export가 실패한 문제는 호환 버전 정합 후 해결했다. 앱 UUID는 `expo-crypto`를 사용한다. Expo Go는 배경 실기기 증거로 쓰지 않는다.

SecureStore는 항목별 크기를 분할하고 새 bank 저장 후 pointer를 변경한다. iOS `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`만으로 동일 단말 백업 복원을 막았다고 보지 않는다. 백업에서 제외되는 Caches의 설치 marker가 없으면 저장 상태를 먼저 삭제한다. 캐시 축출도 안전하게 삭제하는 조건이며 iOS 앱 제거 뒤 Keychain 잔존 가능성에 대응한다. 재설치·복원 실기기 시험은 미수행이다. Android는 SecureStore backup 제외 설정을 사용한다. 앱 내 전체삭제는 작업 중지·단말 삭제를 서버 연결과 독립 수행하고 미삭제 제보 토큰은 경고와 재시도 UI에 남긴다.

[Spring 공식 시스템 요구](https://docs.spring.io/spring-boot/system-requirements.html)는 Boot4.1.1이 Java17~26/Gradle8.14~9를 지원한다고 안내했다. 설치된 Java25 LTS와 Gradle9 계열, Boot4.1.1을 선택했다. TypeScript 계산은 서버에 복제하지 않는다.

[Android 공식 다운로드](https://developer.android.com/studio)의 Mac ARM 명령 도구 15859902를 받고 SHA-256 `835b62a26162b229b441d1f6d4680383815a270809eb33522c0d480fa5002c4e` 일치를 확인했다. Android SDK/Build Tools 37, NDK 27.1.12297006, RN 프로젝트 Gradle 9.3.1을 사용했다. Java 25에서 Prefab 빌드가 실패해 Android native만 Temurin JDK 21.0.11로 빌드했고 arm64 Debug·내부 검증판 Release가 성공했다. BE Java 25 선택과 Android 도구 선택은 별개다.

Xcode 27.0 build 27A266a, iOS 26.5/27.0 시뮬레이터를 확인했다. iPhone 17 Pro Simulator에서 unsigned 내부 검증판 Release 컴파일·설치·launch가 성공했다. JS bundle을 포함하는 Android APK와 iOS simulator 앱, 실제 명령·해시는 [기기 시험 기록](device-test.md)에 남겼다. 연결된 물리 iPhone/Android는 발견하지 못했다. 시뮬레이터 빌드·화면 확인을 배터리·절전·현장 위치의 실제 기기 결과로 표시하지 않는다.

내부 검증판 Release는 `APP_ENV=validation`, `EXPO_PUBLIC_VALIDATION_BUILD=true`, `NODE_ENV=production`과 명시한 개발 HTTP API를 사용한다. Production은 HTTPS를 요구하고 검증판 flag가 `true`면 app config 단계에서 차단한다. Production 설정에서 dev-client config plugin·배경 위치 권한과 사용하지 않는 FaceID/motion 목적문구를 제거했다. Production clean prebuild 뒤 unsigned iOS device Release·Android arm64 AAB 빌드가 성공했다. 컴파일된 iOS Info.plist에서 `NSAllowsArbitraryLoads=false`·한국어 WhenInUse·Always/Motion/FaceID 없음·background fetch만 확인했으며 Android release merged Manifest에서 `usesCleartextTraffic=false`, 배경 위치·foreground service·외부 저장소·system alert 권한 없음과 SecureStore backup/data extraction 제외 규칙 참조를 확인했다. 이 빌드의 `https://api.hyetaekpass.invalid`는 HTTPS 구성 검사 placeholder다. 실제 운영 API 연결·배포·실물 설치는 수행하지 않았다. Android 생성 signing은 debug 키이고 운영 스토어 키는 없다. Notifications·SecureStore 전이 모듈의 POST_NOTIFICATIONS/boot/biometric/network/wakelock/c2dm/badge 권한은 Manifest에 남아 있다. 앱 코드는 push token을 등록하지 않지만 권한 선언과 실제 수집 동작은 별도로 점검해야 하며 스토어 개인정보 선언은 외부 제출 준비 항목이다. 실제 공개 규칙 0개와 OS·장소별 위치 flag OFF를 유지하며 법률·권리·실제 사람 검수·현장 품질 확인 전 배경 파일럿을 공개하지 않는다.

최종 의존성 점검에서 `npm audit`은 moderate 10개, high/critical 0개를 보고했다. 남은 항목은 Expo 빌드 도구의 `xcode`/`uuid` 전이 의존성 경로이며 앱 UUID 구현은 `expo-crypto`다. `npm audit fix --force`가 제안한 Expo 46으로의 강제 변경은 호환성과 빌드 검증을 깨뜨리므로 적용하지 않았다. 잔여 항목을 해소한 상태는 아니며 audit 등급·의존 경로만으로 실제 바이너리의 안전성 또는 취약점 도달 가능성을 확정하지 않는다. 호환되는 상위 SDK 수정 여부를 후속 점검한다.

AWS 요금·법률·상품조건·스토어 정책은 기획 조사값을 실제 계약/공개 운영 승인으로 사용하지 않는다. 지금 실제 상품자료 반입·외부 연락·AWS 생성·스토어 제출은 수행하지 않는다. 각각의 실행 직전에 공식 조건과 사용 권한을 다시 확인한다.
