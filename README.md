# 혜택패스 Hyetaekpass

결제 전에 카드·멤버십 조건을 확인하는 iOS·Android 검증판입니다. 로컬 지갑, 수동 혜택 확인, 하나의 TypeScript 예상 계산 엔진, 관리 화면·API·PostgreSQL, 자료 후보 CLI를 구현했습니다. UNKNOWN은 기본 합계에서 제외하며 즉시 할인·지금 결제액·청구 할인을 구분합니다. 사용자 작성 규칙은 미검수 자료로 표시합니다.

2026-09-30 기준 **실제 공개 혜택 데이터는 0개이고 공개 위치 기능은 OFF**입니다. 가상 자료와 사용자 입력으로 내부 검증을 진행합니다. 양 OS Debug·내부 validation Release·production 구성 빌드, simulator/emulator 설치·실행, 주요 웹/API 흐름을 확인했습니다. native 화면 과업·실물 기기·운영 서명·자료 권리·실제 사람 원문 검수·법률·AWS·스토어 승인은 미완료입니다. 구현은 `codex/validation-build`에 커밋·푸시했고 [draft PR #1](https://github.com/yutakdv/hyetaekpass/pull/1)에 연결했습니다.

## 구조와 확인한 환경

| 경로 | 역할·환경 |
|---|---|
| `FE/mobile`, `FE/admin` | Expo 57.0.26·React Native 0.86.3·React 19.2.3, 관리 Vite. Node 26.0.0·npm 11.12.1 |
| `packages/benefit-core`, `contracts` | 단일 순수 TypeScript 계산·안전 정책, JSON Schema·API·상태·오류 계약 |
| `BE`, `infra/local` | Spring Boot 4.1.1·Java 25·Gradle 9.5.1·PostgreSQL 17.11·Docker 29.5.3 |
| `AI` | Python 3.14.5 표준 라이브러리, 후보 구조화·근거·변경 비교·수동 경로. 외부 LLM·게시 권한 없음 |
| `infra/aws` | CloudFormation 정의. 정적 검사 완료, AWS 미배포 |
| 모바일 native 도구 | Xcode 27.0·CocoaPods 1.17. Android는 Temurin JDK 21.0.11·Gradle 9.3.1·SDK/Build Tools 37·NDK 27.1.12297006 |

Android는 Java 25 Prefab 실패 뒤 JDK 21로 빌드했습니다. BE의 Java 25와 구별합니다. 지갑·개인 조건·현재 위치·거리·알림 판단은 단말에서 처리하며 카드번호·CVC·금융 로그인·서버 지갑/이동 이력·push token을 사용하지 않습니다. 실제 제보·IP·관리 인증·SDK 처리는 별도 확인 대상입니다.

## 로컬 실행

아래는 저장소 루트에서 실제 실행한 명령입니다. 비밀·개인 자료·생성 산출물은 저장소에 넣지 않습니다.

```sh
npm ci
python3 infra/local/init-local.py
docker volume create hyetaekpass-safety-journal
docker compose --env-file infra/local/.env -f infra/local/compose.yml up -d --build db api
curl -fsS http://127.0.0.1:8080/healthz
curl -fsS http://127.0.0.1:8080/v1/bootstrap
```

`init-local.py`는 기존 비밀을 덮어쓰지 않고 `infra/local/.env`를 생성합니다. API는 기본 `127.0.0.1:8080`, DB는 `127.0.0.1:54329`입니다. 이미지가 host JAR 없이 소스부터 빌드되고 빈 DB에 migration이 적용된 것을 확인했습니다. `/healthz` 성공과 복구 준비 완료는 다를 수 있으므로 `/v1/bootstrap`도 확인합니다.

웹 검증 화면은 validation export 후 정적 서버로 확인했습니다. 두 번째 명령은 실행한 채 유지합니다. 웹 preview에는 실제 지갑 대신 시험 입력만 사용합니다.

```sh
APP_ENV=validation EXPO_PUBLIC_VALIDATION_BUILD=true EXPO_PUBLIC_API_URL=http://127.0.0.1:8080 npm run web:export -w @hyetaekpass/mobile
python3 -m http.server 8081 --bind 127.0.0.1 --directory FE/mobile/dist
```

[모바일 웹 검증 화면](http://127.0.0.1:8081)에서 가상 계산과 지갑·개인 규칙을 확인할 수 있습니다. Expo web dev server는 이번 실행 증거에 포함하지 않습니다.

관리 화면은 Docker host 경유 관리 요청이 loopback이 아니어서 403이므로 native local API를 사용합니다. Docker DB가 실행 중인 상태에서 실제 Java 25 home으로 JAR를 빌드합니다. 다음 서버 명령은 Compose API를 정지하고 별도 `hyetaekpass_native` DB/journal을 사용합니다.

```sh
export JAVA_HOME=$(/usr/libexec/java_home -v 25)
GRADLE_USER_HOME="$PWD/.local-tools/gradle" BE/gradlew -p BE test bootJar --no-daemon
python3 BE/run-local.py
```

다른 터미널에서 `npm run admin`을 실행하고 [관리 화면](http://127.0.0.1:5174)을 엽니다. local `author/reviewer/publisher`는 개발 권한 시험 identity이며 실제 사람 원문 검수·운영 인증을 대신하지 않습니다. 빈 카탈로그 import·미검수 게시 403·시험 검수/게시·작성자 수정 후 재검수·차단/OFF 유지 rollback, 모바일 제보 제출·inbox 분류/종결·토큰 삭제·최소 감사 기록을 브라우저/API로 확인했습니다. 실제 공개 규칙은 계속 0개입니다.

휴대폰의 `localhost`는 휴대폰 자신입니다. 기기 연결은 `EXPO_PUBLIC_API_URL`에 Mac LAN 주소를 사용하고 Android Emulator는 `10.0.2.2:8080`을 사용합니다. 실제 휴대폰 설치·LAN 연결은 미수행입니다. debug/내부 validation의 HTTP 예외와 운영 HTTPS를 구별하며, `APP_ENV=production`에서 validation 예외를 켜지 않습니다. [기기 설치·endpoint·현장 시험 절차](docs/device-test.md)에 준비 항목과 미수행 시험이 있습니다.

## 실행한 검사와 결과

```sh
npm test
npm run typecheck
npm run build:admin
python3 -m unittest discover -s AI/tests
docker compose --env-file infra/local/.env -f infra/local/compose.yml run --rm test
python3 BE/tests/recovery_harness.py
cfn-lint infra/aws/stack.json
```

복구 harness는 이 프로젝트의 폐기 가능한 local DB에 실제 `pg_dump/pg_restore --clean`과 장애를 주입합니다. 개인 자료나 다른 DB에 실행하지 않습니다. DB와 독립된 journal volume을 함께 과거로 복원하거나 삭제하지 않습니다.

| 검증 | 확인한 결과·범위 |
|---|---|
| TypeScript·관리 빌드 | npm 42/42 검사, typecheck·Vite 관리 빌드 PASS |
| AI 후보 CLI | Python 18/18 PASS. 권리/개인정보 경계·가상 자료 격리·근거·수동 경로 검사 |
| BE | Java 25 10개 검사·실제 Spring/PostgreSQL HTTP 9개 PASS. source Docker·빈 DB migration PASS |
| 복구 | 실제 dump/restore, journal 쓰기 실패, DB 삭제 trigger 실패의 3개 경로 PASS. replay 전 503·재적용 뒤 삭제/차단 유지 |
| iOS | Debug·내부 validation Release Simulator 빌드, 설치/launch exit 0. production `iphoneos` unsigned Release 컴파일 PASS. native UI·실물 서명/설치 미확인 |
| Android | Debug·arm64 내부 validation Release APK 및 production AAB 빌드 PASS. API 37 Google APIs arm64 emulator 설치/실행·프로세스 유지 확인. native UI·실물 설치 미확인 |
| 웹 UI·관리 API | 390px 가상 계산·지갑 보존/전체 삭제 후 재실행·USER_INPUT 미검수 표시, 빈 카탈로그 권한/재검수/게시·차단/OFF 유지 rollback·제보 분류/종결/토큰 삭제·최소 audit 26건 확인 |
| AWS 정의 | CloudFormation 35 resources cfn-lint PASS. 실제 AWS 배포·복구·요금은 미수행 |

이는 총괄·담당 에이전트의 실제 실행 인계 결과입니다. production 구성은 `https://api.hyetaekpass.invalid` placeholder로 컴파일한 것으로 실제 운영 API 연결·배포 결과가 아닙니다. iOS는 unsigned, Android AAB는 debug 키 서명의 내부 산출물이며 스토어 키·승인은 없습니다. compiled iOS ATS arbitrary loads OFF·BackgroundModes fetch만, Android merged cleartext OFF·배경 위치/foreground service/외부 저장소/system alert 권한 제외를 확인했습니다. native 화면 과업과 실물 시험은 설치/launch 결과와 별도입니다. 최종 변경 뒤 검사와 Git 결과는 [검증 레저](docs/verification-ledger.md)에 추가합니다. [BE 실행·운영](BE/README.md), [BE 상세 증거](BE/verification.md), [AI 실행 안내](docs/ai-data-workflow.md), [SDK 결정](docs/sdk-decisions.md)을 참고합니다.

`npm audit`는 moderate 10개, high/critical 0개를 보고했습니다. xcode/uuid 빌드 도구의 전이 의존 문제는 남아 있고 앱 ID 생성은 expo-crypto를 사용합니다. 강제 fix는 Expo 46 다운그레이드를 제안해 현재 native 호환성을 깨므로 적용하지 않았습니다.

## 외부 완료 조건

실제 iPhone·Android의 권한/철회·삭제·재설치·신뢰 OS backup·VoiceOver/TalkBack·지연·절전·강제 종료·배터리 시험은 미수행입니다. 공개 계산에는 소스별 표시·변환·양 OS JSON·오프라인 보존·갱신·철회 권리와 작성자 외 실제 사람 원문 검수가 필요합니다. AI/코드 검사는 그 증거가 아닙니다.

사업·법률·상표·위치/광고 동의·국외 처리·실제 OIDC/MFA·AWS 계정/예산/복구·스토어 계정/서명/승인은 외부 대기입니다. 위치는 방문이나 할인 적용을 확정하지 않으며 공개 자동 기능은 증거가 있는 OS·장소만 활성화합니다. 공개 출시일과 실제 절감액을 약속하지 않습니다.

## 문서와 저장소

[통합 기획서](혜택패스_통합_사업기획서_최종.md), [실현 가능성](docs/00_실현가능성과_착수기준.md), [위치 정책](docs/01_위치알림_정책과_검증.md), [데이터 운영](docs/02_할인데이터_확보와_운영.md), [아키텍처](docs/03_아키텍처_Docker_AWS.md), [개발·비용·출시](docs/04_개발계획_비용_출시운영.md), [법률·개인정보](docs/05_법률개인정보_및_출처.md)가 기준입니다. [개발 Goal](GOAL_PROMPT.md)과 [작업 지침](AGENTS.md)는 위임·안전·완료 조건을 정합니다.

비공개 저장소는 [yutakdv/hyetaekpass](https://github.com/yutakdv/hyetaekpass), 기본 브랜치는 `main`입니다. 기능 작업은 `codex/` 브랜치에서 이 프로젝트 파일만 명시적으로 관리합니다. 검증한 구현 커밋은 `00baab5`이며 [draft PR #1](https://github.com/yutakdv/hyetaekpass/pull/1)에서 변경과 실행 증거를 검토할 수 있습니다. 실행 문서 보완은 같은 기능 브랜치에 기록합니다.
