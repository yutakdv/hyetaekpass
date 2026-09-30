# 혜택패스 iPhone·Android 설치와 현장 시험

기준일: 2026-09-30 · 상태: 양 OS 내부 검증판 Release와 Production 구성 컴파일 성공, iOS 시뮬레이터·Android 에뮬레이터 설치·실행 성공. 실물 설치·현장 시험·운영 배포 미수행

기준은 [위치 정책](01_위치알림_정책과_검증.md), [아키텍처](03_아키텍처_Docker_AWS.md), [개발·출시 기준](04_개발계획_비용_출시운영.md), [개인정보](05_법률개인정보_및_출처.md)와 [검증 레저](verification-ledger.md)다. 시뮬레이터·에뮬레이터는 상태/화면/빌드 검사에 사용할 수 있지만 실제 수신 지연·배터리·절전·강제 종료의 통과 증거로 사용하지 않는다.

## 시험 준비와 보호

첫 시험은 보유 iPhone부터 진행하고 Android 기본 빌드는 함께 유지한다. iPhone 모델·OS와 Android 실기기는 아직 확인되지 않았다. 공개 위치 기능은 법률·권리·동의·정책·현장 품질 게이트를 충족한 OS·장소만 켠다. 준비되지 않은 상태에서 공용 자동 기능은 OFF로 둔다.

## 현재 빌드·화면 증거와 한계

총괄이 실행한 결과를 인계받고 Release 로그·산출물 크기·APK 해시를 대조했다. iOS 시뮬레이터 설치와 `com.hyetaekpass.app` 실행은 성공했으며 native 화면 과업 검사는 미확인이다. 현재 CUA가 native Simulator UI 제어를 지원하지 않아 설치·launch 성공으로 화면 과업을 통과 처리하지 않는다. 실물 iPhone·Android 연결은 확인되지 않았다. 실물 설치·서명·backup 복원·VoiceOver/TalkBack·배터리·절전·강제 종료·현장 위치는 미수행이다.

| 구분 | 실제 확인 결과 | 범위·남은 확인 |
|---|---|---|
| 공통 코드 | `npm test` 42/42, `npm run typecheck` PASS | 계산·동기화·제보 토큰·지갑 조건 무효화·시계 변화·철회 경쟁·오프라인 단말 삭제 회귀 포함. 실기기 동작 증거 아님 |
| 웹 산출물 | `npm run build:web`, `npm run build:admin` PASS | native 빌드와 별도 |
| iOS 내부 검증판 Release | Xcode 27.0 build 27A266a, iPhone 17 Pro Simulator iOS 26.5 `xcodebuild` PASS; 설치·앱 실행 성공 | `CODE_SIGNING_ALLOWED=NO`, simulator 전용. `main.jsbundle` 2,018,374 bytes 포함, native UI 과업 미확인 |
| Android 내부 검증판 Release | Temurin JDK 21.0.11·Gradle 9.3.1·SDK/Build Tools 37·NDK 27.1.12297006·arm64-v8a `assembleRelease` PASS | APK에 JS 포함. debug 키 서명 내부 검증판이며 스토어 배포 산출물 아님. Pixel 9 Android 37 Google APIs arm64 headless 에뮬레이터 adb install Success·am start 성공·프로세스 유지·runtime 오류 없음. native GUI 과업 미확인 |
| Android 이전 실패 | Java 25 Android Prefab 실패 뒤 JDK 21로 성공 | BE Java 25 지원과 별개; 실패 로그 보존 |
| 가상 계산 웹 UI | CUA 390px에서 12,000원 UNKNOWN 숫자 없음→조건 확인 후 즉시 1,000/결제 11,000/청구 550 | [모바일 화면](evidence/mobile-demo.png). 실제 상품/POS 적용 아님 |
| 로컬 지갑 웹 UI | 등록·수정·웹 재실행 보존 확인 | [지갑 화면](evidence/mobile-wallet.png). 웹 preview 저장소이며 native SecureStore·backup 시험 아님 |
| 사용자 작성 웹 UI | USER_INPUT 브랜드/규칙·미검수 label·공통 엔진 즉시 1,000/결제 11,000 확인 | 운영 카탈로그 자동 편입·실제 원문 검수 아님 |
| Production iOS 구성 | `xcodebuild Release -sdk iphoneos`, generic iOS·`CODE_SIGNING_ALLOWED=NO` PASS | ATS arbitrary loads OFF·한국어 WhenInUse·Always/Motion/FaceID 없음·BackgroundModes는 fetch만 확인. unsigned이며 실제 iPhone 설치 미수행 |
| Production Android 구성 | JDK 21·arm64 `bundleRelease` PASS, AAB 20,531,098 bytes | APK가 아닌 AAB. debug 키 서명 내부 산출물이며 스토어 키·제출 없음. merged Manifest에서 cleartext OFF·배경 위치/foreground service/외부 저장소/system alert 권한 없음·SecureStore backup 제외 참조 확인 |
| UI/API 통합 | 웹에서 빈 초안 import/검수/수정 승인 무효화/403/재검수 게시/차단/롤백/감사, 합성 제보 분류·종결·토큰 삭제, 단말 삭제/재실행 통과 | native UI·실물 과업과 구별. [화면 증거](evidence/README.md) |
| 공개 데이터·위치 | 실제 공개 규칙 0개, 위치 기능 OFF 유지 | 권리·실제 사람 검수·법률·동의·정책·현장 품질 외부 대기 |

빌드 로그는 `/private/tmp/hyetaekpass-ios-validation-release.log`의 `** BUILD SUCCEEDED **`, `/private/tmp/hyetaekpass-android-validation-release.log`의 `BUILD SUCCESSFUL in 5m 43s`다. 산출물은 `.local-tools/artifacts/hyetaekpass-validation.app`와 `.local-tools/artifacts/hyetaekpass-validation.apk`에 복사했다. APK는 27,975,545 bytes이며 SHA-256은 `057a7b83148f2fb0829e085e0a8b3f6d834f5d79de55fae4eecc05f3af3713bb`다. 산출물·도구 캐시는 Git에 포함하지 않는다.

Production 구성 로그는 `/private/tmp/hyetaekpass-ios-production-unsigned.log`의 `** BUILD SUCCEEDED **`, `/private/tmp/hyetaekpass-android-production-bundle.log`의 `BUILD SUCCESSFUL`이다. AAB는 `FE/mobile/android/app/build/outputs/bundle/release/app-release.aab`이며 SHA-256은 `3bed68be3e60adc5b369b94a36bb726d204c5c263f57aa8edde668ef2e141a81`이다. 내부 복사본은 `.local-tools/artifacts/hyetaekpass-production-internal.aab`다. iOS derived data는 `.local-tools/ios-production-derived`다. 이 빌드는 HTTPS 형식의 `https://api.hyetaekpass.invalid`를 사용한 구성·컴파일 검사다. 해당 주소는 placeholder이며 실제 운영 API 연결·배포 성공을 의미하지 않는다.

시험 담당자는 실제 성인 참여자의 별도 연구 동의·목적·보존기간·철회 방법을 확정한다. 참가자 실명, 카드번호, CVC, 금융 로그인, 원시 GPS 경로, 제보 본문, 계정 비밀을 이 문서나 저장소에 넣지 않는다. 참가자는 임의 ID, 장소는 시험 장소 ID로 기록하고 필요한 시각·정답·기기 상태만 비공개 연구 기록에 보관한다. 결과 공유는 비개인 집계와 허용된 캡처로 한다. 운전자는 기기를 조작하지 않으며 차량 시험은 동승 기록자나 정차 상태에서 수행한다.

| 준비 필드 | 기록할 값 | 현재 |
|---|---|---|
| 시험 ID·담당·참가자 ID | 실제 관찰자와 참가자 구별, 날짜·Asia/Seoul | 미정 |
| 빌드 | commit/작업 트리·앱 버전·build 번호·bundle/application ID·산출물 SHA-256·debug/release | 앱 0.1.0·`com.hyetaekpass.app`, 내부 검증판 Release·APK SHA-256 위 기록. 최종 Git revision 별도 기록 |
| 개발 도구 | Mac·macOS·Xcode/iOS SDK, Android Studio/SDK/Gradle·Node/패키지 잠금 버전 | Node 26.0.0/npm 11.12.1, Expo 57.0.26/RN 0.86.3/React 19.2.3. OS별 도구는 위 표 |
| 실제 기기 | 제조사·모델·OS/patch·지원 최소 OS와 비교, 배터리 건강·시작 잔량 | 미확인 |
| 실행 상태 | 전경/배경/잠금·충전·저전력/절전·Doze·제조사 제한·백그라운드 새로고침 | 미정 |
| 권한과 동의 | 앱 목적별 동의 버전·철회 여부, OS 위치 권한·정밀도·알림·위치 전역 설정 | 미정 |
| 자료 | 카탈로그 release/hash·가상/허가 실자료·권리/검수 상태·안전 확인 시각·가장 이른 만료 | 운영 `empty-v1`, 실제 공개 규칙 0개. 가상 fixture·USER_INPUT 별도 |
| 기능과 정책 | OS·장소별 flag, 엄격/지역/전경 모드, 반경·관측·수명·쿨다운·한도·조용한 시간 | 공개 위치 OFF, 실제 활성 증거 없음 |
| 연결 | 환경 ID·API base URL·Metro 주소·네트워크·VPN/guest Wi-Fi·개발 포트 | 개발 API 기본 127.0.0.1:8080, DB 127.0.0.1:54329. 실물 기기 LAN 연결 미수행, iOS simulator API 화면 과업 미확인 |
| 측정 | 기준 시계와 동기화 방법·수동 시각 오차, 위치 API·진단 수집/삭제 방식 | 미정 |

빌드 담당은 위 필드를 채우고 설치 가능한 산출물·정확한 실행 명령·권한 제한·로그 수집 방법을 인계한다. 총괄은 Expo development build, BE Java 25 Spring·PostgreSQL을 구현 기준으로 공유했다. Android native Debug·Release는 Prefab 실패 뒤 별도 JDK 21로 빌드했다. Docker 29.5.3 사용 가능·연결된 실제 기기 없음은 총괄 탐색 보고다. 실제 기기에서 확인하지 않은 값은 위 simulator·APK 컴파일 결과로 채우지 않는다.

PM은 제품 명령을 실행하지 않았다. 아래에는 BE 담당이 검증해 문서화한 로컬 실행과 아직 미수행인 기기 설치 절차를 구분했다. `npm run prebuild -w @hyetaekpass/mobile`은 네이티브 프로젝트 생성 단계이며 기기 컴파일·서명·설치와 구별한다. `npm run build:web`도 실제 기기 빌드의 증거로 사용하지 않는다.

## 개발 endpoint 연결 절차

1. [BE 로컬 실행](../BE/README.md)의 `infra/local/compose.yml`을 사용한다. 서비스는 `db`, `api`, `test`, 선택형 `tools`이며 `.env`의 DB 비밀은 init 스크립트가 생성한다. 별도 테스트 DB와 가상 자료를 사용하고 운영 비밀은 넣지 않는다. DB 포트는 127.0.0.1:54329이며 LAN에 공개하지 않는다.
2. 개발 Mac에서 DB/API를 시작하고 `/healthz`와 `/v1/bootstrap` 응답을 확인한다. health 성공은 복구/게시 준비 성공과 다를 수 있으므로 bootstrap까지 확인한다. 계약은 [contracts/api.md](../contracts/api.md)다. release ID·해시·안전 시각·차단·flag를 기록하고 요청/응답 본문 전체를 진단 로그에 남기지 않는다.
3. 실기기는 신뢰하는 같은 Wi-Fi에서 개발 Mac의 LAN IP와 공개한 API 포트를 사용한다. Mac 시스템 설정에서 현재 Wi-Fi IP를 확인한다. guest Wi-Fi의 기기 격리·VPN·방화벽 때문에 연결이 막힐 수 있다. LAN 접근을 허용한 개발 API 포트만 확인하며 DB를 열어 해결하지 않는다.
4. 모바일은 `EXPO_PUBLIC_API_URL`에 아래 base URL을 설정한다. 공개 변수에는 비밀을 넣지 않는다. 개발 서버를 종료/재시작하고 연결 주소가 앱 설정 화면에 반영됐는지 확인한다. native 설정 변경이면 다시 빌드한다. 휴대폰의 `localhost`는 개발 Mac이 아니다. Android Emulator의 host loopback 별칭은 `10.0.2.2`다. [Android 주소 공간](https://developer.android.com/studio/run/emulator-networking-address)
5. Mac과 기기의 브라우저 또는 앱 진단 화면에서 같은 bootstrap 응답을 확인한 뒤 앱 내 동기화→지원 목록→가상 조건 계산까지 진행한다. 브라우저 연결 성공과 네이티브 앱 연결 성공을 각각 기록한다.
6. 네트워크를 끊고 만료 전 안전 캐시·만료 후 보류·갱신 실패의 시각 불연장·새 차단+파일 실패를 시험한다. 운영 Release는 HTTPS를 사용한다. HTTP는 Debug 또는 명시한 내부 검증판 Release에서만 허용한다.

| 접근 주체 | 개발 base URL | 주의 |
|---|---|---|
| Mac 관리 화면·iOS Simulator | `http://127.0.0.1:8080` | 관리 UI는 native local 서버 사용. Compose host 경유 관리는 loopback이 아니므로 403 |
| 실제 iPhone·Android | `http://MAC_LAN_IP:8080` | 신뢰 LAN에 공개 API만 허용. 두 기기 접속 미수행. `localhost`·Docker 이름 사용 금지 |
| Android Emulator | `http://10.0.2.2:8080` | 에뮬레이터 전용. 실기기 주소로 재사용 금지 |
| BE→PostgreSQL | Compose 내부 `db:5432` | 모바일 API URL이나 공개 DB URL이 아님 |
| 테스트/운영 release | 별도 승인된 `https://TEST_API_HOST` / 운영 host | 개발/시험/운영 DB·비밀·허용 host 분리 |

Docker의 published port는 바인딩 설정에 따라 host 또는 LAN에서 접근할 수 있으므로 실기기 시험에 필요한 API 바인딩을 BE 담당이 제한해 설정한다. [Docker Desktop 네트워크](https://docs.docker.com/desktop/features/networking/)

다음 로컬 명령은 BE의 실행 문서와 대조했다. DB/API·migration/자동 검사는 총괄/BE 실행 결과가 있으나 새 Dockerfile의 host jar 없는 source build와 빈 DB migration도 통과했다. PM은 재실행하지 않았다.

```sh
python3 infra/local/init-local.py
docker volume create hyetaekpass-safety-journal
docker compose --env-file infra/local/.env -f infra/local/compose.yml up -d --build db api
curl --fail --silent --show-error http://127.0.0.1:8080/healthz
curl --fail --silent --show-error http://127.0.0.1:8080/v1/bootstrap
```

실물 기기 연결 단계는 아직 **미수행**이다. BE JAR를 [BE 빌드 명령](../BE/README.md)으로 준비한 뒤 `python3 BE/run-local.py --lan`을 사용하면 별도 `hyetaekpass_native` DB/journal과 LAN 공개 API를 시작하며 Compose API를 중지한다. 관리 API는 local loopback 요청만 허용한다. 또는 Compose에서 공개 API만 LAN에 열 때 `API_BIND_ADDRESS=0.0.0.0`을 명시한다. 시험 종료 뒤 LAN 프로세스를 정지하거나 기본 loopback 바인딩으로 되돌린다.

`MAC_LAN_IP`는 실제 Mac 주소로 교체하고 다음 development 명령으로 연결한다. 실물 기기 설치 성공은 아직 기록되지 않았다.

```sh
EXPO_PUBLIC_API_URL=http://MAC_LAN_IP:8080 npm run mobile
EXPO_PUBLIC_API_URL=http://MAC_LAN_IP:8080 npm run ios -w @hyetaekpass/mobile -- --device
EXPO_PUBLIC_API_URL=http://MAC_LAN_IP:8080 npm run android -w @hyetaekpass/mobile -- --device
```

## 내부 검증판 Release 빌드

다음은 총괄이 실제 성공한 빌드 명령이다. 저장소 루트에서 실행하며 먼저 같은 환경으로 `npm run prebuild -w @hyetaekpass/mobile -- --no-install`을 수행하고 iOS는 `FE/mobile/ios`에서 `pod install`을 완료한다. 내부 검증판은 `APP_ENV=validation`, `EXPO_PUBLIC_VALIDATION_BUILD=true`, `NODE_ENV=production`을 함께 사용한다. 아래 URL은 simulator/AVD 전용이며 실물 기기는 신뢰 LAN의 Mac 주소로 다시 빌드해야 한다. API 서버는 [BE 로컬 실행](../BE/README.md)대로 별도 시작한다.

```sh
APP_ENV=validation EXPO_PUBLIC_VALIDATION_BUILD=true \
EXPO_PUBLIC_API_URL=http://127.0.0.1:8080 NODE_ENV=production \
xcodebuild -workspace FE/mobile/ios/app.xcworkspace -scheme app \
  -configuration Release -sdk iphonesimulator \
  -destination 'platform=iOS Simulator,id=107746DE-D367-4EE2-A0E2-130CA27ADA13' \
  -derivedDataPath .local-tools/ios-derived CODE_SIGNING_ALLOWED=NO build
```

Android는 저장소 루트에서 아래 환경을 정하고 `FE/mobile/android`에서 실행했다. `REPO_PATH`는 현재 저장소 경로이며 다른 시스템 환경 변수를 대체하지 않는다.

```sh
REPO_PATH="$PWD"
cd FE/mobile/android
APP_ENV=validation EXPO_PUBLIC_VALIDATION_BUILD=true \
EXPO_PUBLIC_API_URL=http://10.0.2.2:8080 NODE_ENV=production \
ANDROID_HOME="$REPO_PATH/.local-tools/android-sdk" \
JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home \
GRADLE_USER_HOME="$REPO_PATH/.local-tools/gradle-mobile" \
./gradlew :app:assembleRelease --no-daemon -PreactNativeArchitectures=arm64-v8a
```

두 Release는 JS를 포함해 Metro 없이 실행할 수 있는 구성이다. iOS simulator 설치·launch 성공과 화면/API 과업 성공은 따로 기록한다. Android headless 에뮬레이터에서 APK 설치·실행·프로세스 유지를 확인했고 ReactNativeJS/AndroidRuntime 오류가 없었다. native GUI 과업은 미확인이다. 내부 검증판의 HTTP 예외·debug 서명을 운영 출시 승인으로 해석하지 않는다.

실제로 성공한 Production 구성은 `APP_ENV=production`, `EXPO_PUBLIC_VALIDATION_BUILD` 미설정, `EXPO_PUBLIC_API_URL=https://api.hyetaekpass.invalid`, `NODE_ENV=production`을 사용했다. 환경 변경 뒤 production prebuild와 pod install을 수행하고, iOS는 다음 명령을 실행했다.

```sh
APP_ENV=production EXPO_PUBLIC_API_URL=https://api.hyetaekpass.invalid NODE_ENV=production \
xcodebuild -workspace FE/mobile/ios/app.xcworkspace -scheme app \
  -configuration Release -sdk iphoneos -destination 'generic/platform=iOS' \
  -derivedDataPath .local-tools/ios-production-derived CODE_SIGNING_ALLOWED=NO build
```

Android는 위 JDK/SDK/cache 환경에서 `APP_ENV=production`, HTTPS placeholder, 검증판 flag 미설정으로 `./gradlew :app:bundleRelease --no-daemon -PreactNativeArchitectures=arm64-v8a`를 실행했다. 운영 배포 때는 placeholder를 실제 승인된 HTTPS endpoint로 교체하고 운영 서명·설치·API 연결을 별도 검증한다. `APP_ENV=production`과 검증판 flag `true`를 함께 주면 설정 단계에서 오류로 차단한다. 운영 API 구축·인증서·서명·계정·스토어 제출은 외부 준비가 필요하며 예시 URL이 실제 endpoint를 대신하지 않는다.

연결 실패는 `API 미시작 / 잘못된 URL·포트 / host-only 바인딩 / Wi-Fi 격리 / 방화벽·VPN / debug HTTP·앱 설정 / 계약 응답 오류`로 구분하고 확인하지 못한 원인은 미확인으로 기록한다. 통신 복구를 위해 기기·관리 인증·TLS·DB 경계를 일괄 해제하지 않는다.

## iPhone 설치 절차

1. Mac에서 Xcode와 선택한 SDK가 실제 iPhone OS·프로젝트의 최소 OS를 지원하는지 확인하고 도구 버전을 기록한다. 저장소의 잠금 파일 기준으로 앱 의존성을 설치한다. 명령은 FE 담당의 검증된 README를 사용한다.
2. iPhone을 USB로 연결하고 신뢰를 허용한다. 필요한 Developer Mode를 기기에서 켜고 Xcode의 연결 대상에 나타나는지 확인한다. 프로파일·서명 team·bundle ID를 확인하고 signing 오류를 원문 그대로 비개인 기록에 남긴다.
3. 확정한 Expo development build를 사용한다. Expo Go로 배경 실행 검증을 대체하지 않는다. 모바일 workspace에서 로컬 기기 설치 후보는 `npx expo run:ios --device`, 개발 서버 후보는 `npx expo start --dev-client`이며 프로젝트의 실제 패키지 명령·네이티브 구성과 대조해 확정한다. Expo 공식 안내는 실제 iPhone 연결·Developer Mode·bundle ID와 `--device`를 요구한다. [Expo development build](https://docs.expo.dev/develop/development-builds/introduction/)
4. signing 설정이 필요한 경우 생성된 Xcode workspace를 열고 signing을 선택한 뒤 실제 iPhone을 Run 대상으로 빌드·설치한다. 시뮬레이터 산출물을 설치 가능한 기기 바이너리로 표시하지 않는다. [Apple 실제 기기 실행 안내](https://developer.apple.com/documentation/xcode/running-your-app-on-simulated-or-physical-devices)
5. 앱 아이콘·첫 실행·지원 목록·API 동기화·권한 거절 상태·가상 계산·재시작을 확인한다. 설치·기기 연결·권한 설정·API 성공을 각각 레저에 남긴다.
6. 현장 시험 전에 케이블·충전·debugger를 분리한 상태에서도 실행한다. debugger가 붙은 개발 실행과 실제 suspend/종료 동작을 혼동하지 않는다. 별도 release 모드 시험을 수행하고, 준비된 계정과 권한 범위에서 TestFlight/등록 기기 배포를 선택한다. 계정·서명·배포 기록이 없으면 release 시험은 미수행이다.

## Android 설치 절차

1. 실제 기기의 제조사·OS·patch·비루팅 상태와 지원 최소 OS를 기록한다. Android Studio·SDK·프로젝트 JDK/Gradle을 잠금 버전에 맞추고 emulator 빌드와 실제 기기 빌드를 따로 기록한다.
2. 개발자 옵션·USB debugging을 켜고 USB로 연결한다. 기기에 나타난 허용 요청을 승인하고 `adb devices -l` 후보 명령에서 authorized 연결 여부를 확인한다. 개인 기기 serial은 공개 로그에서 제거한다.
3. 확정한 Expo development build를 검증된 개발 명령으로 설치한다. 모바일 workspace에서 공식 로컬 기기 설치 후보는 `npx expo run:android --device`다. FE가 확정한 APK 경로가 있으면 `adb install -r APK_PATH`로 설치할 수 있다. AAB는 testing track용이며 AAB 파일 자체를 APK 설치 성공으로 표시하지 않는다.
4. LAN API URL을 설정하고 iPhone과 같은 지원 목록·가상 계산·권한 거절·재시작 흐름을 수행한다. Android Emulator에서 연결됐어도 실제 Android 기기의 연결 결과를 따로 남긴다.
5. 제조사 배터리 최적화의 기본 설정을 먼저 유지하고 화면 잠금·절전·Doze·제조사 제한 시험을 실행한다. 제한을 해제한 실험은 별도 조건으로 기록한다. 그것으로 기본 사용자 환경 품질을 대체하지 않는다.
6. release APK/Play testing track에서 debugger·Metro 없는 실행을 확인한다. target SDK·최소 OS·최종 네이티브 바이너리의 page-size 조건·스토어 계정별 시험 요건은 제출 시 공식 자료로 다시 확인한다. Android 실기기가 없으면 배경 위치·알림·배터리 품질은 미수행으로 유지한다.

## 공통 기기 인수 시험

| ID | 절차 | 기대 결과·기록 | iPhone / Android |
|---|---|---|---|
| D01 | 새 설치→위치·알림 모두 거절→수동 상품/브랜드/점포/채널·모름 입력 | 수동 핵심 기능 유지, 강제 권한 유도 없음 | 미수행 / 미수행 |
| D02 | 지갑 등록/수정→앱 재시작→월/혜택 버전 변경 | 로컬 저장 유지, 기준월·자격 재확인, 서버 지갑 업로드 없음 | 미수행 / 미수행 |
| D03 | 가상 12,000원 멤버십/카드·UNKNOWN·중복 불명·미지원 실행 | 즉시/청구 분리, 미확인 기본 합산 없음, 실제 혜택으로 표시하지 않음 | 미수행 / 미수행 |
| D04 | 빈 운영 카탈로그·로딩/오류·통신 끊김·신선도/권리/혜택 종료 | 설명과 수동 입력 유지, 만료 사전탑재 계산·자동 알림 보류 | 미수행 / 미수행 |
| D05 | 새 차단 응답 후 파일 실패→재시작→이전 release rollback | 최신 차단/OFF 유지, 실패가 안전 확인 시각을 연장하지 않음 | 미수행 / 미수행 |
| D06 | 전경 주변 요청→정밀/대략 위치·전역 위치 OFF·철회 | 목적별 안내, 허용된 단말 거리 목록, 제한 시 직접 지역/점포 선택 | 미수행 / 미수행 |
| D07 | 전체 삭제·기능 철회→재실행→재설치·허용된 backup 복원 | OFF·OS 등록/작업 해제·후보/예약/표시 알림·DB/키 정리, 동의/지갑 자동 복원 없음 | 미수행 / 미수행 |
| D08 | 제보 제출→관리 분류/종결→삭제 토큰으로 삭제 | 실제 inbox·DB 연결, 토큰 안전 보관·서버 hash, 본문/토큰 로그 없음 | 미수행 / 미수행 |
| D09 | 작은 화면·글씨 확대·VoiceOver/TalkBack·오류/빈 상태 | 주요 과업 읽기·포커스·대비·터치 영역·한국어 줄바꿈 확인 | 미수행 / 미수행 |
| D10 | release 빌드 통신·키보드 입력·잠금화면·backup 점검 | 지갑/좌표/금융 인증정보/보장 금액 노출 없음. 실제 SDK 수집 목록 대조 | 미수행 / 미수행 |

삭제·backup 시험은 시험용 데이터와 승인된 기기 백업을 사용한다. 실제 개인 기기 전체 초기화나 개인 backup 덮어쓰기는 이 절차에 포함하지 않는다.

## 현장 시험 시작값과 사례

시작값은 실험 가정이다: 후보 반경 150m, 점포/묶음 5~10개, 엄격 모드 실제 관측 3개 이상·첫~마지막 120초 이상·관측 간격 60초 이하, 마지막 위치 age 30초 이하, 수평 정확도 50m 이하, `거리 + 수평 정확도 ≤ 반경`, 후보 최대 수명 최초 실제 관측 후 5분, 묶음/브랜드 24시간 쿨다운, KST 하루 2건, 조용한 시간 21:00~08:00. 음수 속도·유효하지 않은 정확도는 정지/정확한 위치로 치환하지 않는다.

엄격 모드와 사용자가 선택한 지역 안내 모드를 별도 실행한다. 관측 공백·실행 기회 부족·오래된 ENTER는 보류/만료하며 타이머 경과로 발화하지 않는다. 선택형 지역 안내는 방문·120초 체류 성공으로 집계하지 않는다. 현재 관측 없이 예약한 알림, JS 타이머, BGTask, silent push를 관측 증거로 쓰지 않는다.

| ID | 실제 시나리오 | 기록할 핵심 |
|---|---|---|
| F01 | 실제 지원 매장 방문 3~5분, 짧은 실제 결제 방문 포함 | 물리 도착·결제·이탈, 사건·관측·표시 시각, 누락·결제 전 도달 |
| F02 | 보행 통과 20~60초 | 음성 분모·발화·늦게 도착한 알림 |
| F03 | 횡단보도 60/120/180초 대기 | 정지 오탐, 자동 제외 장소의 실제 방문은 별도 양성에도 포함 |
| F04 | 정류장·차량 정체 3~5분 | 정지·저속을 방문으로 취급하는지, 최신 관측·부적절 발화 |
| F05 | 길 건너·인접 매장·몰 다른 층·매장 앞 줄 | 특정 점포 확정 표현 없음, 전경 목록의 점포 유지 |
| F06 | 화면 잠금 30분·일반 배경·저전력/절전·새로고침 제한·Doze/제조사 제한 | 각 조건별 실제 실행 기회·사건/관측 누락·지연·폴백 |
| F07 | 사용자 강제 종료·시스템 종료·재부팅·업데이트 전후 | 종료 원인별 등록·후보 복구·중복. 시스템 종료를 유도/확인하지 못하면 미수행 |
| F08 | 대략적 위치·GPS 흔들림·통신 없음 | 정확도/age/공백 실패에 보류, TTL·안전 확인 만료 |
| F09 | 권한/동의 철회·장소/OS flag OFF·혜택 차단·기간/권리 종료 | 후보·예약 정리, 늦은 발화 없음 |
| F10 | 20:59→21:00, 07:59→08:00·일 경계·쿨다운·하루 한도 | 조용한 시간 억제, 밀린 알림 없음, KST 날짜별 한도 |
| F11 | 중복/역순 ENTER·EXIT, Inside 재등록·기기 시각 변경 | 물리 순서 단정 없음, 새 방문 즉시 발화 없음, 시간 불확실 시 보류 |
| F12 | 선택한 지역 실제 진입·미진입·무관한 통과 | 선택 지역 과업 전체 분모·지역 알림 적절성·피로·끄기·결제 전 도달 별도 |

조정 전 정책 버전·변경 이유를 기록한다. 튜닝 경로/참여자와 최종 평가 경로/시각을 분리하고, 실제 기기별·사람별·장소별 결과를 남긴다. 동일 기기의 반복을 독립 기기 수로 늘려 세지 않는다.

## 한 시행 기록 양식

아래 한 행은 한 실제 방문·음성 상황·지역 과업이다. 앱 사건이 없어도 현장 관찰자가 행을 만든다. 자동 활성 장소·실행 가능한 방문만 골라 분모를 줄이지 않는다. 도착/결제/표시는 관찰 시각이며 OS 사건/관측 시각과 수신 시각을 구분한다.

| 필드 | 기록 값 |
|---|---|
| 시행 ID / 시험 묶음 / 시나리오 ID | 미기입 |
| 날짜·기준 시간대 / 참가자·관찰자·기기·장소 ID | 미기입 |
| 빌드·release·정책 버전 / debug·release / debugger 연결 | 미기입 |
| 실제 과업 정답 | 매장 방문/음성 통과·대기/선택 지역 진입, 지원 생활권·자료 지원·자동 제외 여부 |
| 모드·OS/장소 flag·권한/정밀도·동의 | 미기입 |
| 전경/배경/잠금·절전/Doze·제조사 제한·네트워크 | 미기입 |
| 물리 도착 t_arrive / 결제 t_pay / 이탈 t_exit | 시각 또는 관찰 못함. 결제 없음과 시각 미확인 구별 |
| OS 사건 시각 t_event / 앱 수신 t_receive | ENTER/EXIT/기타, 미수신·API 미제공 시 미확인 |
| 실제 관측 목록 | 각 측정/수신 시각·age·수평 정확도·후보 거리·관측 간격. 원시 좌표는 기본 공유하지 않음 |
| 상태 전이와 사유 | OFF/ARMED/CANDIDATE/VERIFYING/READY/COOLDOWN/EXPIRED, 보류/억제 이유 |
| 생성 t_create / 표시 t_display | 미생성·생성 실패·미표시·확인 못함 구별. OS 수락을 표시로 세지 않음 |
| 표시에 걸린 시간 | 도착→표시 초, 수신→생성 초. 미수신은 0초로 대체하지 않음 |
| 결제 전 도달 | 유효 알림이며 표시 시각이 결제 시각보다 이르면 Y, 늦음 N, 결제 없으면 해당 없음, 시각 미확인 별도 |
| 적절성·발견 경로·피로 | 유용/무관/평가 없음, 자동/전경/수동/미발견, 끄기·장소 차단·무관 신고 |
| 안전·삭제/복구 관찰 / 증거 ID | 미기입 |
| 결과·불확실성·후속 조치 | 통과/실패/미수행/관찰 불충분, 다음 담당 |

원인 코드는 `DATA_UNSUPPORTED`, `DATA_EXPIRED`, `RIGHTS_UNCONFIRMED`, `PLACE_AUTO_OFF`, `OS_FLAG_OFF`, `PERMISSION_LIMITED`, `OS_EVENT_MISSING`, `OBSERVATION_INSUFFICIENT`, `LOCATION_STALE_OR_INACCURATE`, `QUIET_HOURS`, `COOLDOWN`, `DAILY_LIMIT`, `NOTICE_FAILED`, `POST_PAYMENT`, `UNKNOWN`을 기록용으로 사용할 수 있다. 실제 구현 오류 계약을 새로 정의하는 표가 아니며 확정된 이유 코드와 매핑한다. OS가 알려주지 않은 누락 원인을 추정 확정하지 않는다.

## 배터리 비교 양식

같은 실제 기기와 유사한 경로·시간·신호·화면 사용·배터리 건강에서 기능 OFF/ON 각 8시간을 최소 3쌍 계획한다. 페어 순서·날짜·시작 잔량을 기록하며 충전·OS 업데이트·큰 외부 작업이 있으면 비교 불가 사유를 남긴다. 시험 중 조용한 시간·한도·쿨다운을 우회하면 별도 실험으로 표시한다.

| pair ID | 기기·OS·배터리 건강 | OFF 날짜/8h 시작→종료 잔량 | ON 날짜/8h 시작→종료 잔량 | OFF 소모 %p | ON 소모 %p | 추가 소모 %p | 화면/통신·관측·발화·절전 조건·비교 한계 |
|---|---|---|---|---|---|---|---|
| B01 | 미기입 | 미수행 | 미수행 | 미측정 | 미측정 | 미측정 | 미기입 |
| B02 | 미기입 | 미수행 | 미수행 | 미측정 | 미측정 | 미측정 | 미기입 |
| B03 | 미기입 | 미수행 | 미수행 | 미측정 | 미측정 | 미측정 | 미기입 |

`소모 = 시작 잔량 − 종료 잔량`, `추가 소모 = ON 소모 − OFF 소모`이며 유효한 3쌍 이상의 중앙값을 보고한다. 3%p 이하 추가 소모는 탐색 수용 가설이다. OS 잔량 표시의 해상도·건강·외부 앱·환경 편향을 함께 보고하고 정확한 전력 측정이나 전체 단말의 보증으로 표현하지 않는다.

## 표본·분모·결과 집계

iPhone 탐색은 양성 20회·음성 40회부터, 공개 후보는 플랫폼별 새 경로·시각의 양성 60회·음성 100회 정도를 계획한다. 제안 표본이며 실제 모집·기기 다양성·관측 시간을 확정하지 않았다. 반복 경로는 상관된 시행일 수 있으므로 사람/기기/장소/날짜/화면 상태별 수를 함께 보고한다.

| 지표 | 분자 / 분모 | 결과 기록 |
|---|---|---|
| 음성 상황 오탐률 | 자동 발화한 음성 시행 / 방문하지 않은 음성 시행 전체 | n/N·%·신뢰구간·모드·제외/보류 포함. 시작 가설 ≤5% |
| 알림 적절성 | 유용한 안내 평가 / 생성된 알림 전체 | 미표시·평가 못함 별도 수를 남기고 제외로 점수 상승 금지. 시작 가설 ≥90% |
| 실제 방문 coverage | 유효 알림이 있는 실제 방문 / 지원 생활권 실제 방문 전체 | 자동 제외 장소·사건 누락·보류·권한/쿨다운/한도 억제 포함. 자료 미지원도 별도 수. 시작 가설 ≥70% |
| 결제 전 도달률 | 결제 전에 표시된 유효 알림 / 실제 결제 방문 전체 | 시각 미확인 수·결제 후 알림·미수신 포함. coverage와 따로 보고 |
| 전체 혜택 발견 | 자동/전경/수동 중 발견한 과업 / 실제 과업 전체 | 자료 미지원·입력 포기·조건 모름 별도. 자동 성능과 혼합하지 않음 |
| 지역 안내 coverage | 유효 지역 알림이 있는 과업 / 해당 모드 사용자의 선택 지역 실제 진입 과업 전체 | OS 미수신·보류·쿨다운·한도 포함. 수신 후보만 분모로 사용 금지 |
| 지역 안내 적절성 | 유용 지역 알림 평가 / 생성된 지역 알림 전체 | 무관한 통과·끄기·차단·결제 전 도달·미평가 수 별도. 매장 방문 성공으로 합산 금지 |
| 지연 | 실제 도착→표시 p50/p90, 앱 사건 수신→생성 별도 | 표시된 시행 수·전체 시행 수·미수신/관찰 불충분 수·통계 방법. 결제 후 도달 분리 |
| 배터리·피로 | 유효 페어 추가 소모 중앙값, 참가자당 발화·끄기·차단·무관 신고 | 기기별 수·8h 페어 조건·실험 기간·일 한도 작동 |

`유효 알림`은 자료·권리·기간·동의·관측·문구가 해당 모드 기준을 충족하고 실제 표시를 확인한 알림이다. 늦은 알림을 결제 전 성공으로 세지 않는다. 집계는 각 OS/모드별로 분리하고, 작은 표본의 점추정만으로 통과 선언하지 않는다. 비율은 n/N과 사용한 신뢰구간 방법·한계를 함께 보고한다. 미표시·미관찰·미평가를 삭제하지 않는다.

| 보고 ID·OS·모드·정책 버전 | 실제 기기/참가자/장소/날짜 수 | 양성/음성/지역 과업 전체 N | 유효/미수신/보류/자동제외/결제후/자료미지원 n | 오탐·적절성·coverage·결제 전 n/N·CI | 지연 p50/p90·관찰 불충분 | 배터리 유효 페어·중앙값 | 판단·범위·다음 조치 |
|---|---|---|---|---|---|---|---|
| 미정 | 미측정 | 미수행 | 미측정 | 미측정 | 미측정 | 미수행 | 공개 자동 기능 OFF |

기본/지역 모드의 관측·권리·동의·정책·현장 품질이 한 항목이라도 부족하면 해당 OS·장소의 자동 flag를 끈다. 모호한 장소는 카탈로그·수동/전경 목록에 유지하며 그곳의 실제 방문을 전체 누락 분모에서 빼지 않는다. 법률 또는 정책 반려 시 전경 목록·직접 선택 등 폴백으로 실제 사용가치를 다시 평가한다.

## 결과 인계

담당자는 위 원기록과 비개인 집계를 근거로 레저의 해당 요구 ID에 결과를 붙인다. 설치 성공, 네이티브 빌드 성공, release 실행, 실기기 위치 품질, 스토어 승인을 각각 적는다. Android 실제 기기가 없거나 iOS 서명/설치를 못 했다면 시도·실패 메시지·필요 입력을 남기고 관련 필수 검증을 미수행으로 유지한다.

현장 시험 요청 전 빌드·설치 절차·정확한 endpoint 설정·자료 상태·동의/보존·지원 담당을 준비한다. 사용자에게 필요한 입력은 기기 모델/OS와 시험 가능 시간, Android 확보 방식, 설치/서명 권한, 실제 검수자·시험 참여 준비로 묶는다. 이 문서 자체가 기기 설치·현장 시험 또는 공개 배포 승인을 의미하지 않는다.

2026-09-30 18:35 KST Android 에뮬레이터 실제 설치: `adb -s emulator-5554 install .local-tools/artifacts/hyetaekpass-validation.apk` → Success, `adb -s emulator-5554 shell am start -n com.hyetaekpass.app/.MainActivity` → 시작 성공, `adb shell pidof com.hyetaekpass.app` → 프로세스 유지. ReactNativeJS/AndroidRuntime logcat 오류 없음. headless 실행·설치 증거이며 UI·실기기 과업 통과가 아니다.
