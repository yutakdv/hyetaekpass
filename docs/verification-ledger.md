# 혜택패스 검증 레저

기준일: 2026-09-30 · 총괄의 실제 결과 인계 반영 · 최종 구현·검증 확인 · 확정 출시일 없음

**0.2.0 서비스 추가:** 현재 매장→보유 수단 비교→확인된 결과/순서→멤버십 코드 제시를 구현했다. 4탭·지갑·개인 조건·저장·도움말·새 제보/관리 화면의 실제 결과는 [SX-01~14](service-verification.md), 기획은 [서비스 경험](service-experience-spec.md)과 [화면 설계](service-ui-design.md)에 있다. 최종 Node 67/67·typecheck·admin/web export·최신 source 양 OS production Release 빌드 PASS. validation 설치/launch는 마지막 두 변경 직전 source이며 native 과업/실물 스캐너·큰 글씨·공개 출시와 구별한다. 아래 42개 검사는 초기 검증판 이력으로 보존한다.

이 문서는 [개발 Goal](../GOAL_PROMPT.md)의 요구·담당·의존조건·완료 증거를 추적한다. 전체 범위는 [통합 기획서](../혜택패스_통합_사업기획서_최종.md), 세부 조건은 [00](00_실현가능성과_착수기준.md)~[05](05_법률개인정보_및_출처.md)를 따른다. 제품 결과는 총괄·담당 에이전트가 실제 실행한 결과를 PM에 인계한 기록이다. PM은 문서 구조·파일·명령 정의와 일부 로그/이미지를 대조했으며 제품 검사를 직접 재실행하지 않았다. 최종 수정 뒤의 검사·release·통합·Git 결과는 총괄이 아래 최종 결과 추가란에 남긴다.

## 상태와 증거 규칙

| 상태 | 의미 |
|---|---|
| 계획 | 인수 기준과 담당만 정함 |
| 구현 중 | 변경이 진행 중이며 완료 증거 없음 |
| 구현됨 / 미검증 | 코드·설정 존재를 확인했지만 해당 검사를 실행하지 않음 |
| 검증 통과 | 해당 환경에서 실제 실행한 명령·결과·버전·증거가 있음 |
| 실패 | 실행했으며 기대 결과를 충족하지 못함. 재현·원인·다음 조치 기록 |
| 미수행 | 아직 실행하지 않음. 누락된 필수 검사는 완료로 바꾸지 않음 |
| 외부 대기 | 기기·사람·권리·계정·사업 주체·예산 등 외부 입력 필요 |
| 범위 제외 | 초기 범위에서 제외한 기능. 필수 검증 누락을 이 상태로 숨기지 않음 |

증거에는 실행 시각과 시간대, commit 또는 작업 트리 상태, 담당, 환경·도구 버전, 전체 명령 또는 기기 절차 ID, 종료 코드·사례 수·실패 수, 비개인 증거 경로를 남긴다. CI·로컬·시뮬레이터·실기기를 구별한다. 수정 후 영향받은 검사는 다시 실행한다. 이전 실행을 새 버전의 통과로 재사용하지 않는다.

AI 에이전트의 코드 리뷰와 자동 검사는 실제 사람의 원문 검수를 대신하지 않는다. 가상 자료로 통과한 계산 검사는 실제 소스의 이용권·원문 의미·POS 적용을 증명하지 않는다. 문서 준비, 빌드, 설치, 현장 품질, AWS 운영, 스토어 승인을 각각 기록한다.

## 역할과 공유 파일 소유

| 역할 | 산출물·책임 | 인계와 확인 |
|---|---|---|
| 총괄 root | `contracts/`, `packages/benefit-core/`, 루트 의존성·통합·Git | 계약 먼저 공유, 에이전트 산출물 재검증, 최종 완료 판정 |
| 서비스 기획자 | 지원 범위·과업·우선순위·상태 문구·기능 인수 기준 | 초기 제외와 데이터 0개 상태 포함 |
| 디자이너 | 이름·영문 표기·소개·SVG 로고·앱 아이콘·흐름·접근성 | 자산이 실제 화면·빌드에 적용됐는지 FE와 확인 |
| PM | 이 레저·README 최종 인계, [기기 시험](device-test.md) 양식·외부 준비·누락 추적 | 문서 작성으로 제품 검증을 통과 처리하지 않음 |
| 프론트엔드 FE | `FE/mobile/`, `FE/admin/`, 양 OS·권한·저장·알림·관리 화면 | 공유 계산 엔진 사용, 플랫폼별 빌드와 실제 기기 분리 |
| 백엔드 BE | `BE/`, `infra/local/`, `infra/aws/`, API·DB·게시·제보·복구 | 계산 중복 구현 금지, 관리 인증·MFA·journal 확인 |
| AI 개발자 | `AI/`, 허용 자료 후보·근거·변경 비교·수동 경로 | 게시 권한 없음, 정형 입력은 표준 파서 우선 |

총괄은 기획자·디자이너·PM·FE·BE·AI 여섯 역할을 실제 에이전트에 위임하고 역할별 산출물을 인계받았다고 보고했다. 기획 결과는 [제품 인수 기준](product-acceptance.md), 디자인은 [브랜드 설계](brand-design.md), AI는 [자료 도구 흐름](ai-data-workflow.md)으로 연결된다. PM 역할 산출물은 이 문서와 [기기 시험](device-test.md)이다. FE·BE 통합 인계와 주요 웹/API 확인은 완료 보고됐다. 총괄의 최종 재검사와 기능 브랜치 push·draft PR 연결을 확인했다.

계약·계산 엔진·의존성 파일의 변경은 총괄에 인계한다. 다른 담당의 변경을 덮어쓰지 않는다. 여섯 역할의 위임은 실제 개발자 여섯 명이나 원문 독립 검수자 확보를 뜻하지 않는다.

## 요구사항별 인수 기준

구현·확인된 검증·외부 조건을 각각 기록한다. 아래 검증 ID는 실행 기록에 대응하며 총괄의 인계 시점 증거에 한정한다. 미수행 필수 항목은 같은 요구의 단위 검사가 통과했어도 미완료다.

| ID | 요구·인수 기준 | 담당 / 구현 위치 | 구현 상태 | 확인된 검증·증거 | 외부·남은 검증 |
|---|---|---|---|---|---|
| R01 | 생활권 1곳·브랜드 2~3개·무료 검증판, 지원/초기 제외 명시 | 기획·총괄 / 제품 인수 기준·모바일 | 구현 인계: 운영 카탈로그 0개, 시험 자료 분리 | WEB-UI-01·BE-API-02 빈 기본 카탈로그 | 실제 생활권·자료 권리·10~15명 사용자 과업 외부 대기 |
| R02 | 이름·SVG 로고·아이콘·소개를 실제 화면과 앱에 적용 | 디자인·FE / 브랜드 자산·모바일 | 자산·화면 구현 인계 | WEB-UI-01 이름/로고 화면, IOS-DEBUG-01·ANDROID-DEBUG-01 빌드 | production 컴파일·simulator/emulator 실행 확인, 실물 아이콘·상표권 별도 |
| R03 | Schema·API·오류·상태·금액·KST 시간·버전 계약 | 총괄 / `contracts/types.ts`, `catalog.schema.json`, `api.md` | 구현·담당 공유 | CORE-02·TYPE-01·BE-API-02·AI-01 | 최종 42개 회귀·타입·양 OS 빌드 통과, 실제 자료 계약 외부 대기 |
| R04 | 단일 순수 TypeScript 엔진을 모바일·관리 미리보기에서 사용 | 총괄·FE / `packages/benefit-core/` | 공통 엔진 구현 인계, Java 중복 계산 없음 보고 | CORE-02·WEB-UI-01·ADMIN-BUILD-01 | ADMIN-UI-02의 빈 카탈로그 통합 확인. 실자료 원문·native UI 별도 |
| R05 | 한 카드+최대 한 멤버십, 정수 KRW·bp·정률/정액·명시된 순서/기준/상한/반올림 | 총괄 / 계산 엔진 | 구현 인계 | CORE-02 전체 42개 회귀 인계 | 실제 상품 원문 의미·독립 사람 검수 외부 대기 |
| R06 | TRUE/FALSE/UNKNOWN 분리, UNKNOWN 기본 합계/순위 제외, 중복 불명 합산 금지 | 총괄·FE / 계산·결과 | 구현 인계 | CORE-02·WEB-UI-01 UNKNOWN 숫자 없음 확인 | 실물 native 화면·실자료 자격 확인 미수행 |
| R07 | 즉시/현재 결제액/청구 분리, 천원당·포인트·복잡한 의미는 안내/미지원 | 총괄·FE / 계산·결과 | 구현 인계 | WEB-UI-01 가상 12,000원→즉시 1,000/결제 11,000/청구 550, CORE-02 | 실제 POS 적용·잠금화면/실물 기기 검사 미수행 |
| R08 | 로컬 지갑 등록/수정·상품 버전·등급/실적/잔여/모름·월/버전 재확인 | FE / 모바일 저장 | 구현 인계 | WEB-UI-02 등록·수정·웹 재실행 보존, WEB-DELETE-01 전체 삭제/재실행, CORE-02 | OS 보호 저장·재설치/신뢰 backup·실물 기기 외부 대기 |
| R09 | 수동 브랜드/점포/채널/금액, 출처/확인일/기간/절차·조건/미지원 이유 | FE / 모바일 | 구현 인계, 개인 USER_INPUT 브랜드/규칙 작성 | WEB-UI-01·03 공통 엔진 계산·미검수 label | REPORT-UI-01 웹/API 통합 확인. 실제 사용자 과업·양 OS native 링크 미수행 |
| R10 | 공개 규칙 0개·로딩/빈/오류/offline/만료/모름/권한 거절 상태 | FE / 모바일·관리 | 구현 인계 | BE-API-02 빈 기본 데이터, WEB-UI-01 UNKNOWN·WEB-UI-02 연결 오류 화면 | 전체 상태별 native/release 실행 미수행 |
| R11 | 표시/변환/양 OS JSON/offline/갱신/철회 권리와 실제 독립 원문 검수 | 사업·데이터 책임자·실제 검수자 | 개발 경계 구현, 공개 실자료 0개 유지 | AI-01 가상 권리 경계 검사. 실제 권리·사람 검수 증거 없음 | 외부 대기. AI/코드 검사를 독립 사람 검수로 표시하지 않음 |
| R12 | import·형식·원문 검수 기록·공통 미리보기·게시·차단·rollback | BE·FE / API·관리 | 구현 인계 | BE-API-02 실제 DB/API 9개, ADMIN-BUILD-01·ADMIN-UI-01~02 import/재검수/게시/차단/rollback | 주요 웹/API 흐름 통과. native UI 미확인·실제 사람 원문 검수 외부 대기 |
| R13 | 기존 인증·MFA·allowlist·권한 분리·공개 사용자 계정 없음 | BE / 관리 API | local loopback·운영 OIDC 경계 구현, opaque 삭제 Bearer 처리 수정 | BE-API-02 local 권한 경계, BE-JAVA-02 서명 JWT/MFA/allowlist·opaque 삭제·health gate, ADMIN-AUDIT-01 publisher inbox 403 | 실제 OIDC 제공자/MFA·대리 접근 외부 대기 |
| R14 | 검증 후 활성 포인터 변경, Schema/해시/참조/호환/기간 후 단말 원자 교체 | BE·총괄·FE / 게시·동기화 | 구현 인계 | CORE-02·BE-API-02 파일 해시/게시 경로, ADMIN-UI-02·REPORT-UI-01 실제 bootstrap/refresh | 웹/API 통합 확인. native 동기화 과업 미수행 |
| R15 | 새 차단/OFF를 파일 실패와 무관하게 우선 적용, rollback에도 유지 | BE·총괄·FE / 안전 상태 | 구현 인계 | CORE-02·BE-API-02·RESTORE-02 local overlay/replay, ADMIN-UI-02 rollback 뒤 최신 제약 유지 | S3-PROTOCOL-01 local SDK 경계 통과. 실제 AWS·native 과업 미수행 |
| R16 | 정상 확인+24h·원문 신선도·혜택/권리 종료 중 가장 이른 기한 | 총괄·FE / 계산·동기화 | 구현 인계 | CORE-02 안전·기간 검사 인계 | 실제 시계/재부팅·offline native 실행 미수행 |
| R17 | 제보·inbox 분류/종결/삭제·32byte 이상 토큰 hash·제한·최소 audit | BE·FE / API·관리·앱 | 구현 인계 | BE-API-02 토큰/inbox/삭제·RESTORE-02 hash, REPORT-UI-01 웹 제출/분류/종결/삭제·ADMIN-AUDIT-01 최소 audit | 웹/API 통합 통과. native UI·운영 보존 의무 확인 미수행 |
| R18 | 독립 journal 먼저 영속·DB 멱등·복구 replay 전 안전 응답 보류 | BE / 복구 | local journal·S3 경계 구현 및 내부 검사 인계 | RESTORE-02 실제 pg_dump/restore·journal write fault·DB trigger fault·replay, BE-JAVA-02 10개 | 실제 AWS S3/IAM/네트워크·PITR·동시 writer 운영 미수행 |
| R19 | 지갑/좌표/거리/알림 단말, 서버 지갑/이동 이력·외부 모델 전송 없음 | FE·BE·AI / 모든 경계 | 설계·구현 인계 | AI-01 민감 입력 거절·외부 모델 없음, PRODUCTION-CONFIG-01 native 권한/통신 구성·ADMIN-AUDIT-01 최소 로그 | SDK 명세·production compiled 구성 대조. 실제 기기 수집/통신 전체 점검 미수행 |
| R20 | 전체 삭제·철회 OFF→OS 해제→후보/알림/DB/키 정리 | FE / 설정·native | 삭제 경로 구현 인계 | CORE-02 회귀·WEB-DELETE-01 웹 전체 삭제/재실행 PASS. 실물 삭제 결과 없음 | 실제 기기·신뢰 OS backup/재설치/알림 정리 외부 대기 |
| R21 | 전경 주변·단말 거리, 거절/대략 위치의 수동 폴백·모호 점포 목록 유지 | FE / 위치·모바일 | 구현 인계, 공개 위치 OFF | 빌드 성공은 native 기능 연결 가능성만 확인 | 점포 권리·법률·실물 권한/거리 시험 외부 대기 |
| R22 | OS·장소별 선택형 flag, 충분한 실제 관측 없으면 보류/만료 | FE·기획 / 위치 정책 | 정책·native 경로 구현 인계, 공개 OFF | CORE-02 정책 검사·BE-API-02 기본 배경 flags OFF | 법률/권리/동의/정책/실물 현장 품질 외부 대기 |
| R23 | KST 21~08시·24h cooldown·하루 2건·최소 잠금화면 문구 | 총괄·FE / 정책·알림 | 구현 인계 | CORE-02 정책 회귀 인계 | 실물 재시작/조용한 시간/밀린 알림 없음 검증 미수행 |
| R24 | 실제 방문·자동 제외·미수신·결제후·피로 포함, 지역 별도 평가 | PM·FE·실제 테스터 | 현장·분모·8h 배터리 3쌍 양식 준비 | PM-DOC-01. 현장 수치 없음 | iPhone/Android·연구 동의·실제 참여자 외부 대기 |
| R25 | 표준 파서·수동 경로·후보/근거/변경 비교, AI 게시 불가 | AI·BE / 일회 CLI | Python 표준 라이브러리 구현, 외부 LLM 없음 | AI-01 18/18·가상 JSON/CSV CLI·개인정보/원문 지시/시간 기록 검사 | 실제 권리/사람 검수·수동 대비 전체 시간 절감 미측정 |
| R26 | Docker 빈 DB migration·API/DB·게시/차단/삭제/복구 재현 | BE·총괄 / `infra/local/compose.yml` | Compose·migration·host jar 없는 source image 빌드 통과 | DOCKER-02·BE-API-02·RESTORE-02 | 주요 웹/API 통합 확인. 별도 새 컴퓨터 재현 미수행 |
| R27 | 양 OS 실제 native 빌드·서명/설치·self-contained release 흐름 | FE·총괄 / Expo mobile | 양 OS Debug·validation Release·production 구성 컴파일 통과 | IOS-DEBUG-01·ANDROID-DEBUG-01, IOS/ANDROID-VALIDATION-01, IOS/ANDROID-PRODUCTION-01, ANDROID-EMULATOR-01 | simulator/emulator 설치/실행 확인. native UI 미확인·실물 설치/운영 서명 미수행 |
| R28 | 작은 화면·큰 글씨·스크린리더·대비·터치·실패 접근성 | 디자인·FE / 모바일·관리 | 디자인·UI 구현 인계 | WEB-UI-01~03 390px 화면·brand 캡처 | 큰 글씨·실물 VoiceOver/TalkBack·native 포커스 미수행 |
| R29 | AWS HTTPS·SG/DB·비밀/OIDC·digest·비용·복구·대리/사고 | BE·사업 책임자 / `infra/aws/stack.json` | 35 resources 정의 구현 | AWS-STATIC-01 cfn-lint 통과 인계 | AWS 미배포. 계정/예산/인증·S3/PITR·요금·운영 외부 대기 |
| R30 | 실제 주체의 위치/광고/개인정보/국외처리·기록/동의/신고 | 사업 책임자·외부 자문 | 흐름·외부 질문 준비 | 기획/정책 문서 준비만 확인 | 실제 사업·법률 적용·회신·신고·동의 외부 대기 |
| R31 | 양 스토어 준비·계정별 시험·바이너리/개인정보 일치·실제 승인 | 사업 책임자·FE·PM | 제출 준비 기준 문서 존재 | 제출/승인 증거 없음 | production 컴파일 확인. 계정·운영 서명·실물 시험·승인 외부 대기 |
| R32 | 검증된 실행/운영 안내·diff/비밀 점검·commit/push·연결 PR | 총괄·PM / README·Git | README를 실제 실행/환경/결과/외부 조건으로 갱신 | PM-DOC-03·FINAL-CHECK-01, 구현 105 files commit `00baab5` 인계 | README/레저 후속 commit `f20a62f`와 구현을 같은 기능 브랜치에 push, draft PR #1 현재 채팅 연결 확인 |

## 외부 준비 묶음

사용자만 제공할 수 있는 항목을 필요한 시점에 아래 양식으로 묶어 요청한다. 비밀번호·토큰·개인 기기 식별자·계약 원문은 저장소·채팅·로그에 넣지 않고 정한 비공개 전달 경로를 사용한다. 이 목록은 요청 준비이며 구매·연락·리소스 생성·제출 승인이 아니다.

| 묶음 | 필요한 입력·증거 | 담당 / 필요 시점 | 없을 때 진행 가능한 일 |
|---|---|---|---|
| 기기·인력 | Mac 모델·macOS·Xcode, iPhone 모델·OS·배터리 상태·시험 가능 시간, Android 실제 비루팅 기기 모델·OS·대여/구입 경로, 개발자별 주당 시간·경험 | 사용자·FE / 첫 작은 빌드·현장 시험 전 | 공통 코드·논리 검사·Android 에뮬레이터·문서. 실기기 품질은 미수행 |
| 실제 검수자·연구 참여 | 작성자 외 실제 원문 검수자·확인 가능한 역할, 10~15명 과업 모집, 연구 동의·보존/철회 방식·시험 담당 | 데이터 책임자·PM / 공개 계산·사람 시험 전 | 가상 fixture·수동 입력·허용 안내. AI 검사는 독립 검수로 표시하지 않음 |
| 자료·자산 권리 | 생활권·브랜드, 정확한 소스/버전/필드, 표시·산식 변환·iOS/Android JSON·offline cache·갱신·철회/backup 삭제·로고·외부 AI 권한, 승인자 권한·유효기간 | 사업·데이터 책임자 / 운영 반입 전 | 가상 개발 자료·빈 운영 카탈로그·사용자 직접 작성 |
| 사업·법률·운영 주체 | 계약/신고/스토어 명의, 지원·개인정보 연락처, 실제 흐름에 대한 위치/광고/국외처리/법정 기록 확인, 비상 담당·대리·부재 대응 | 사업 책임자 / 공용 위치·공개 운영 전 | 동의·철회 화면 초안·흐름 목록·외부 질문·위험 기능 OFF |
| 계정·서명·endpoint | Apple/Play 계정 유형·생성일·상태·역할, iOS signing team/profile, Android keystore 보관·복구 책임, 관리 인증/MFA 계정, AWS role/OIDC·도메인/DNS, 필요한 제공자 API 접근·quota | 각 계정 소유자·FE·BE / 설치·관리 인증·외부 배포 전 | 로컬 앱/서버·배포 정의·제출 자료. 키를 앱·저장소에 넣지 않음 |
| 비용·가용시간 | 승인된 월 한도·기간·별도 CI/스토어/기기/검수/법률/연구 비용, 경보 수신자, 실제 현금 견적과 팀 시간 | 실제 비용 책임자·PM / 유료 작업 전 | 로컬 작업·견적·자원 정리 계획. 월 120~200 USD 계획안을 결제 승인으로 사용하지 않음 |

외부 입력 기록: `요청 ID / 필요한 이유와 적용 기능 / 요청일 / 책임자 / 안전한 전달 경로 / 회신 상태 / 비개인 증거 ID / 독립 작업 / 다음 결정 시점`. 주당 가용시간 미정이므로 고정 출시일을 약속하지 않는다. 첫 2주 실제 작업과 운영시간을 측정한 뒤 공수를 다시 계산한다. 데이터·지원이 팀 가용시간의 20%를 2주 연속 넘으면 신규 소스를 동결한다.

## 검증 실행 기록

2026-09-30 총괄과 BE/FE/AI 담당의 실행 결과를 인계받았다. Node 26.0.0·npm 11.12.1·Expo 57.0.26·React Native 0.86.3·React 19.2.3, Python 3.14.5를 사용했다. BE는 Java 25·Spring Boot 4.1.1·PostgreSQL 17.11·Gradle 9.5.1, Docker Engine 29.5.3이다. Android native는 별도 JDK 21.0.11 Temurin·Gradle 9.3.1·SDK/Build Tools 37·NDK 27.1.12297006을 사용했다. BE의 Java 25와 Android의 JDK 21을 혼동하지 않는다.

아래 통과는 인계한 실행 버전에 대한 결과다. PM의 제품 재실행 결과가 아니다. PM은 package script 정의, BE 실행 문서와 복구 harness, npm ci/audit·iOS/Android Debug·validation/production Release 로그와 산출물 크기/해시, 화면 이미지를 읽어 대조했다. 초기 35개 TypeScript·HTTP 7개·Java 7개 결과를 역사 기록으로 유지하고, 추가 인계된 TypeScript 42개·HTTP 9개·Java 10개·복구 3개는 별도 최신 ID로 기록했다.

| 실행 ID | 요구 ID / 검사 | 명령·절차 | 환경·버전·시각 | 결과·사례/실패 수 | 증거·다음 조치 |
|---|---|---|---|---|---|
| PM-DOC-01 | PM 문서 준비 | 일회 `python3 -` 문서 점검: fence·표 열수·상대 링크 존재·R01~R32·필수 항목 | 2026-09-30 16:57 KST, 프로젝트 작업 트리 | 문서 구조 점검 통과: 요구 32개·상대 링크 13개·표 15개, 종료 0 | PM 도구 출력. 제품 검사·빌드·설치·현장 시험은 실행하지 않음 |
| PM-DOC-02 | 최신 증거·완료 층 구분 | 일회 `python3 -` 문서 점검: fence·표 열수·상대 링크·요구 ID·최종 결과 추가란·인계 수치 | 2026-09-30 PM 추가 인계, 작업 트리 | 요구 32개·상대 링크 30개·표 16개·문서 오류 0, 종료 0 | PM 문서 점검만 직접 수행. 제품 결과는 총괄/담당 인계 |
| PM-DOC-03 | README·레저 최종 문서 점검 | 일회 `python3 -`: fence·표 열수·상대 링크 존재·요구 ID·최종 인계 수치/외부 상태·언어 점검 | 2026-09-30 18:48 KST, PM 담당 문서 2개·작업 트리 | 요구 32개·상대 링크 43개·표 9개·오류 0, 종료 0 | PM은 문서 검사와 로그/이미지/산출물 metadata 대조만 직접 수행. 제품 명령은 총괄/담당 실행 인계. 최종 Git 결과는 총괄 추가 |
| CORE-01 | R03~08·R14~16·R22~23 | `npm test` | 위 Node/npm, 2026-09-30 총괄 인계 | 35/35 PASS: 코어 30 + FE 5, 실패 0 | 총괄 실제 출력 인계. 최종 변경 후 재실행은 아래 추가 |
| CORE-02 | R03~08·R14~16·R22~23·관리 회귀 | `npm test` | 위 Node/npm, 총괄 최신 인계 | 42/42 PASS, 실패 0 | 이전 35개 이후 추가 검사 포함. 이후 수정의 재검사는 총괄 추가 |
| TYPE-01 | 공유 TypeScript 정적 검사 | `npm run typecheck` | 위 Node/npm, 총괄 인계 | PASS | package script 대조. native/실물 검사와 구별 |
| ADMIN-BUILD-01 | R04·R12·R28 | `npm run build:admin` | Vite·위 Node/npm, 총괄 인계 | PASS | 관리 웹 산출물. 주요 화면↔API 결과는 ADMIN-UI-02·REPORT-UI-01 별도 기록 |
| WEB-BUILD-01 | R02·R08~10 | `npm run build:web` | Expo 57.0.26, 총괄 인계 | PASS | 웹 export는 native 빌드 증거가 아님 |
| AI-01 | R11·R19·R25 | `python3 -m unittest discover -s AI/tests` | Python 3.14.5, AI 담당·총괄 인계 | 18/18 PASS | [AI 실제 검증과 CLI](ai-data-workflow.md). 실제 권리/사람 검수 미확보 |
| DOCKER-01 | R26 빈 DB migration | 아래 BE 로컬 실행의 DB/API 시작 | Java 25·PostgreSQL 17.11·Docker 29.5.3, BE·총괄 인계 | 빈 public schema에 Flyway V1 적용 확인 | [BE 실행 증거](../BE/verification.md). 당시 migration 증거이며 source image 최종 통과는 DOCKER-02 |
| BE-API-01 | R12~18·R26 | `docker compose --env-file infra/local/.env -f infra/local/compose.yml run --rm test` | 실제 Spring·PostgreSQL, BE·총괄 인계 | 최초 7 HTTP tests PASS | [BE 검증](../BE/verification.md). 게시/rollback은 빈 카탈로그. 확장 최신 9개는 BE-API-02에서 통과 |
| BE-API-02 | R12~18·R26 최신 HTTP | 동일 Compose test 명령 | source-built 새 image·Spring/PostgreSQL, BE·총괄 최신 인계 | 확장 9/9 HTTP tests PASS | [BE 최종 증거](../BE/verification.md). 실제 자료 없는 빈 카탈로그만 게시 |
| BE-JAVA-01 | R13·R18·R19 | 아래 전체 Java `test bootJar` 명령 | Java 25·Gradle 9.5.1, BE·총괄 추가 인계 | 7 PASS: Journal 2 + OperatorAccess 2 + Evidence 1 + ProductionHttp 2 | production profile 실제 HTTP 삭제 401 RED→204 GREEN·동일 opaque 토큰 admin 401, health/복구 gate 분리. 실제 외부 IdP·AWS 아님 |
| BE-JAVA-02 | R13·R17~19 최신 Java | Java 25의 `BE/gradlew -p BE test`, JAR는 아래 `test bootJar` | 실제 Java 25 home·Gradle 9.5.1, BE·총괄 최신 인계 | 10 PASS: Journal 2 + OperatorAccess 2 + Evidence 1 + ProductionHttp 5 | signed JWT/MFA/allowlist/issuer/audience/만료·CORS·scheduled retention 추가. `/private/tmp/hyetaekpass-backend-final-tests.log` BUILD SUCCESSFUL 대조. 실제 외부 IdP·AWS 아님 |
| RESTORE-01 | R15·R17~18·R26 | `python3 BE/tests/recovery_harness.py` | 프로젝트 일회 local DB와 독립 local journal, BE·총괄 인계 | pg_dump/restore·journal write fault·DB BEFORE DELETE fault·replay PASS | [복구 절차](../BE/README.md). 복구 전 bootstrap/inbox 503, 재적용 뒤 삭제/차단·revision 유지. AWS PITR 아님 |
| RESTORE-02 | R15·R17~18·R26 최신 복구 | `python3 BE/tests/recovery_harness.py` | source-built API·local DB/journal, BE·총괄 최신 인계 | 복구 3개 경로 PASS | 실제 dump/restore·journal 기록 장애·DB 삭제 장애 뒤 replay. AWS 운영 복구와 구별 |
| DOCKER-02 | R26 source-only 재현 | 아래 Compose `up -d --build db api` | Java 25 source JDK·Gradle wrapper·25 JRE/CA image | source-only Docker build PASS | `BE/build` context 제외, host jar 없이 wrapper 다운로드→test/bootJar→runtime. 빈 DB migration·HTTP/복구 통과. 총괄 실제 image inspect ID `sha256:78466580659d104a5cb26a2dcdfe5898c9e9f874e4211a4f2f2a946ed44e98f8` 인계 |
| S3-PROTOCOL-01 | R18·R29 | BE-JAVA-02의 Journal/Evidence 검사 | 로컬 HttpServer에 실제 AWS SDK, BE 실행 문서 인계 | private/version/64KiB proof와 S3 실패 fallback 금지 검사 PASS | 실제 AWS bucket/IAM/네트워크·동시 writer 운영 미수행. 최종 local 프로토콜 경계 통과. 실제 AWS는 외부 대기 |
| IOS-DEBUG-01 | R27 native Debug 컴파일 | 아래 iOS Debug `xcodebuild` 실제 호출 | Xcode 27.0 build 27A266a, iPhone 17 Pro Simulator iOS 26.5 | `** BUILD SUCCEEDED **` | `/private/tmp/hyetaekpass-ios-debug.log` line 26404 PM 대조. CODE_SIGNING_ALLOWED=NO·simulator, 실제 iPhone 설치 아님 |
| ANDROID-JAVA25-01 | R27 실패 기록 | Java 25에서 이전 Android Debug build | Android native Gradle/Prefab | Java 25 Prefab 실패 인계 | 실패 로그 보존. JDK 21의 후속 성공으로 이전 실패를 삭제하지 않음 |
| ANDROID-DEBUG-01 | R27 native Debug 컴파일 | Android `:app:assembleDebug`, 실제 옵션 최종 추가란 | JDK 21.0.11·Gradle 9.3.1·SDK/Build Tools 37·NDK 27.1.12297006·arm64-v8a | `BUILD SUCCESSFUL in 56s` | `/private/tmp/hyetaekpass-android-debug-jdk21.log` line 554 PM 대조. 실제 Android 설치/실행 아님 |
| IOS-VALIDATION-01 | R27 내부 validation Release | Release `xcodebuild`·simulator install/launch `com.hyetaekpass.app` | APP_ENV=validation·EXPO_PUBLIC_VALIDATION_BUILD=true·NODE_ENV=production, API 127.0.0.1:8080·iOS26.5 simulator | Release compile exit 0, JS bundle 포함·install/launch exit 0 인계 | `/private/tmp/hyetaekpass-ios-validation-release.log` BUILD SUCCEEDED와 main.jsbundle PM 대조. UI 도구 Simulator 연결 불가로 native UI 미확인. 실물 서명/설치 아님 |
| ANDROID-VALIDATION-01 | R27 내부 validation Release | Android `:app:assembleRelease` arm64-v8a | JDK21·APP_ENV=validation·EXPO_PUBLIC_VALIDATION_BUILD=true·NODE_ENV=production, AVD API 10.0.2.2:8080 | Release compile exit 0, BUILD SUCCESSFUL in 5m 43s | `/private/tmp/hyetaekpass-android-validation-release.log` PM 대조. Android emulator 실행은 ANDROID-EMULATOR-01, production 구성은 ANDROID-PRODUCTION-01. 실물/UI 과업 미수행 |
| IOS-PRODUCTION-01 | R27 production device 구성 컴파일 | `xcodebuild -workspace FE/mobile/ios/app.xcworkspace -scheme app -configuration Release -sdk iphoneos -destination 'generic/platform=iOS' -derivedDataPath .local-tools/ios-production-derived CODE_SIGNING_ALLOWED=NO build` | APP_ENV=production·NODE_ENV=production, HTTPS `.invalid` placeholder, Xcode27·iphoneos27.0 SDK | `** BUILD SUCCEEDED **`, unsigned | `/private/tmp/hyetaekpass-ios-production-unsigned.log` 명령·성공 PM 대조. 실제 iPhone 설치/서명·운영 API 연결 없음 |
| ANDROID-PRODUCTION-01 | R27 production AAB 구성 컴파일 | JDK21 `:app:bundleRelease --no-daemon -PreactNativeArchitectures=arm64-v8a`, [전체 실제 명령](device-test.md) | APP_ENV=production·NODE_ENV=production, HTTPS `.invalid` placeholder·SDK37 | BUILD SUCCESSFUL in 46s, AAB 20,531,098 bytes | `/private/tmp/hyetaekpass-android-production-bundle.log` 성공 PM 대조. AAB SHA-256 `3bed68be3e60adc5b369b94a36bb726d204c5c263f57aa8edde668ef2e141a81`·크기 PM 대조. debug 키 내부 산출물, 스토어 키/제출 없음 |
| PRODUCTION-CONFIG-01 | R19·R27 SDK/통신/권한 구성 | production clean prebuild→iOS compiled Info.plist·Android release merged Manifest 대조 | 총괄·FE 실제 산출물 확인 인계 | iOS ATS arbitrary loads false·background fetch만; Android cleartext false·배경 위치/foreground service/외부 저장소/system alert 없음 | [SDK 결정과 잔여 권한](sdk-decisions.md). `.invalid` API는 구성 검사용이며 운영 배포 아님. 실제 수집/실물 기기 통신 미수행 |
| ANDROID-EMULATOR-01 | R27 validation APK 설치·실행 | API37 Google APIs arm64 Pixel9 headless emulator·`adb install`·`am start com.hyetaekpass.app/.MainActivity` | 총괄 실제 실행 인계, SDK37 AVD | boot 18.612s·install Success·PID4623 유지, ReactNativeJS/AndroidRuntime error 없음 인계 | `/private/tmp/hyetaekpass-android-emulator.log` boot 18612ms PM 대조. 설치/프로세스 결과는 총괄 관찰 인계. native GUI 과업·물리 시험 아님 |
| WEB-UI-01 | R02·R06~07·R28 | CUA 웹 390px, 가상 12,000원 입력→UNKNOWN→조건 확인 | 총괄 실제 UI 관찰 인계 | UNKNOWN 숫자 없음→즉시 1,000/결제 11,000/청구 550 | [화면 캡처](evidence/mobile-demo.png) PM 이미지 대조. 금액 관찰은 총괄 인계이며 실제 상품 아님 |
| WEB-UI-02 | R08·R10 | 웹 지갑 등록·수정·재실행 | 총괄 CUA 인계 | 로컬 지갑 보존 확인 | [지갑 캡처](evidence/mobile-wallet.png) PM 대조. 캡처의 Failed to fetch는 API 성공 증거가 아니며 native SecureStore 시험도 아님 |
| WEB-UI-03 | R04·R09 | 개인 USER_INPUT 브랜드/규칙 작성, 같은 엔진 계산 | 총괄 CUA 인계 | 즉시 1,000/결제 11,000·미검수 label 확인 | 실제 운영 카탈로그 자동 편입이나 원문 검수 완료가 아님 |
| ADMIN-UI-01 | R12 관리 브라우저/API | 연결→empty catalog import→미검수 publish→local reviewer 시험 검수→publisher 게시 | 실제 브라우저 localhost:5174·native local API, 총괄 인계 | import 성공·미검수 publish 403·TEST-empty-no-rules 검수 후 publish 성공 | 실제 공개 규칙 0개. local reviewer는 시험 identity이며 실제 사람 원문 검수 완료가 아님. 추가 흐름은 ADMIN-UI-02 |
| ADMIN-UI-02 | R12·R14~15 재검수/차단/rollback | 빈 v2 import→시험 검수→author 수정→DRAFT 게시 시도→재검수/게시→TEST rule/source 차단·모든 flags OFF→v1 rollback→bootstrap | 총괄 CUA 실제 화면/API 실행 인계 | 작성자 수정 후 publisher 403, 재검수 후 게시 성공, rollback v1에도 최신 차단/OFF revision1 유지 | [관리 rollback 화면](evidence/admin-rollback.png) PM 대조. 실제 자료·사람 원문 검수 없음, public0 유지 |
| REPORT-UI-01 | R09·R17 웹 제보/삭제 통합 | mobile API refresh→TEST-UI-REPORT 제출→reviewer inbox OTHER 분류/CLOSED→mobile opaque 토큰 DELETE→inbox 재조회 | 총괄 CUA 실제 화면/API, 비개인 합성 제보 | refresh public0·POST·분류/종결·DELETE 성공·inbox empty 확인 | [삭제 후 모바일 화면](evidence/mobile-report-deleted.png) PM 대조. 원본문/토큰/개인 자료를 캡처·Git에 저장하지 않음 |
| ADMIN-AUDIT-01 | R13·R17 최소 감사/권한 | CUA semantic button 감사 조회·reviewer inbox/publisher inbox 권한 확인 | 총괄 실제 CUA 실행 인계 | audit JSON 26 records, 본문/토큰/IP 없음; reviewer inbox 정상·publisher 403 | [최소 감사 화면](evidence/admin-audit.png) PM 대조. 실제 운영 OIDC 계정 시험 아님 |
| WEB-DELETE-01 | R08·R20 웹 단말 삭제 | 설정 전체 삭제→지갑 빈 상태→웹 reload→빈 상태 | 총괄 실제 CUA 인계 | 삭제·재실행 뒤 빈 지갑 PASS | [단말 삭제 화면](evidence/mobile-data-cleared.png) PM 대조. native SecureStore·OS backup/재설치·실물 알림 정리 시험 아님 |
| WEB-PUBLIC-01 | R01·R09~10 공개 빈 상태 | 실제 API refresh 뒤 390px 웹 모바일 표시 | 총괄 CUA 실제 API·화면 인계 | public0 빈 카탈로그 성공 | [실제 API의 공개 빈 상태](evidence/mobile-public-empty.png). 가상 계산 fixture와 구별 |
| WEB-RUN-01 | R09·R32 웹 실행 | 아래 validation export와 Python 정적 서버 | localhost:8081, 총괄 실제 명령 인계 | export/정적 서버·브라우저 확인 | Expo Start Web dev server 자체 성공은 미검증 |
| NPM-AUDIT-01 | 의존성 제한 | `npm ci`·`npm audit` | Node26·npm11.12.1, 총괄 인계·PM log/JSON 대조 | moderate 10, high/critical 0 | xcode/uuid build-tool 전이 문제 남음. 앱 UUID는 expo-crypto. 강제 fix의 Expo46 downgrade는 native 호환 문제로 미적용 |
| AWS-STATIC-01 | R29 인프라 정의 | `cfn-lint infra/aws/stack.json` | CloudFormation JSON 35 resources, 총괄 인계 | lint PASS | 정적 검사만 수행. AWS 미배포·요금 승인 없음 |
| IOS-DEVICE-01 | R20~24·R27~28 | [기기 설치와 시험](device-test.md) | `xcrun devicectl` 실제 연결 기기 0대라는 총괄 탐색 결과 | 미수행·외부 대기 | 실제 iPhone 모델/OS·연결/서명·시험 시간 필요 |
| ANDROID-DEVICE-01 | R20~24·R27~28 | [기기 설치와 시험](device-test.md) | Android 실제 기기 없음 | 미수행·외부 대기 | native 빌드 성공으로 실기기 품질 칸을 채우지 않음 |
| AWS-OPS-01 | R29 | 예산/계정 승인 뒤 실제 배포·복구 훈련 | 계정 미정 | 미수행·외부 대기 | S3/RDS/ECS·MFA·비용·운영 담당 실제 증거 필요 |
| DATA-01 | R11·R30 | 소스별 권리·원문·실제 검수·적용 의무 확인 | 주체/사람 미정 | 외부 대기 | 회신이나 검수자가 없으면 완료 처리 금지 |
| STORE-01 | R31 | 계정별 요구 재확인·제출·승인 | 계정 미정 | 미수행 | 각 플랫폼 승인 ID 기록 |
| FINAL-CHECK-01 | R03~32 코드/문서 최종 범위 재검토 | `npm test`·`npm run typecheck`·`npm run build:admin`·AI unittest·cfn-lint 재실행, 비밀 pattern·Markdown 링크/fence 점검 | 총괄 2026-09-30 약 18:39 KST, 구현 commit `00baab5` 인계 | npm 42/42 fail0·typecheck/admin exit0·AI18 exit0·cfn-lint exit0; 105 text files 비밀 pattern 0·Markdown20 links/fences 오류0 | 계산/통합 read-only 재검토 발견사항 닫힘 인계. 실제 기기·외부 승인 검사가 아님. README/레저의 후속 문서 점검은 PM-DOC-03 |

BE 명령은 [BE/README.md](../BE/README.md)와 [BE/verification.md](../BE/verification.md)에 인계되었다. 아래 명령은 비밀을 명령 인자에 넣지 않는다. 복구 harness는 이 프로젝트의 폐기 가능한 local DB만 대상으로 한다.

```sh
python3 infra/local/init-local.py
docker volume create hyetaekpass-safety-journal
docker compose --env-file infra/local/.env -f infra/local/compose.yml up -d --build db api
docker compose --env-file infra/local/.env -f infra/local/compose.yml run --rm test
python3 BE/tests/recovery_harness.py
```

전체 Java 검사는 local DB가 실행 중일 때 실제 production HTTP 시험까지 포함한다. Docker source build는 DB가 필요한 ProductionHttpTest를 제외하는 범위이므로 전체 Java 결과와 따로 기록한다.

```sh
export JAVA_HOME=$(/usr/libexec/java_home -v 25)
GRADLE_USER_HOME="$PWD/.local-tools/gradle" BE/gradlew -p BE test bootJar --no-daemon
```

웹 검증은 다음 실제 명령으로 실행했다. 관리 UI는 JAR 빌드 뒤 `python3 BE/run-local.py`와 별도 터미널의 `npm run admin`을 사용한다. 설정·개발 권한의 범위는 [README](../README.md)에 정리했다.

```sh
APP_ENV=validation EXPO_PUBLIC_VALIDATION_BUILD=true EXPO_PUBLIC_API_URL=http://127.0.0.1:8080 npm run web:export -w @hyetaekpass/mobile
python3 -m http.server 8081 --bind 127.0.0.1 --directory FE/mobile/dist
```

iOS Debug 로그에 기록된 실제 호출은 다음이다. 이 simulator UUID는 이번 로컬 환경의 대상이며 다른 Mac에서는 사용 가능한 simulator를 다시 선택한다.

```sh
xcodebuild -workspace FE/mobile/ios/app.xcworkspace -scheme app -configuration Debug -sdk iphonesimulator -destination 'platform=iOS Simulator,id=107746DE-D367-4EE2-A0E2-130CA27ADA13' -derivedDataPath .local-tools/ios-derived CODE_SIGNING_ALLOWED=NO build
```

## 총괄 최종 결과

최종 소스 `00baab5`는 아래 실제 검사와 동일하다. 이후 문서 변경은 같은 기능 브랜치에 기록한다. 외부 검증을 아래 통과 결과로 대신하지 않는다.

| ID | 남은 작업 | 현재 상태 | 총괄이 추가할 증거 |
|---|---|---|---|
| FINAL-TS | 최종 `npm test`·typecheck·web/admin build | FINAL-CHECK-01 18:39 KST 재실행 42/42·typecheck/admin PASS, validation web export PASS | 이후 코드 수정이 있으면 영향 검사. 최종 Git revision 아래 기록 |
| FINAL-BE | 확장 HTTP·Java·S3/prod 경계·source Docker·복구 | BE-API-02 9개·BE-JAVA-02 10개·RESTORE-02 3개·DOCKER-02 image ID 포함 PASS | 이후 수정이 있으면 영향 검사. 실제 AWS/OIDC는 외부 대기 |
| FINAL-RELEASE | iOS/Android self-contained Release·운영 HTTPS 구성·기본 flags | 양 OS validation/production 구성 빌드 PASS, simulator/emulator install/launch 확인. 운영 서명·native UI 미확인 | production 산출물 hash/권한은 아래 기록. native UI·실물·운영 키 별도, 내부 HTTP 예외와 구별 |
| FINAL-UI-API | 모바일/관리 화면↔API 실제 게시·제보·삭제 통합 | ADMIN-UI-01~02·REPORT-UI-01·ADMIN-AUDIT-01·WEB-DELETE-01 주요 웹/API 흐름 PASS. native UI 미확인 | 최종 변경 후 재검사가 생기면 추가. 실제 사람 원문 검수·native 화면 과업은 별도 |
| FINAL-REVIEW | 요구·계산·안전·SDK/통신·접근성·문서 최종 재검토 | FINAL-CHECK-01 scoped 계산/통합 재검토 발견사항 닫힘·실제 회귀42 PASS. native UI/실물 접근성 미수행 | 최종 문서 점검 PM-DOC-03, 외부 게이트 유지. 이후 수정이 있으면 추가 |
| FINAL-GIT | 명시 staging·diff/비밀 점검·commit·push·draft PR/현재 채팅 연결 | 구현 105 files commit `00baab53a966151fbbb5bac6139e885dc3886391` push, [draft PR #1](https://github.com/yutakdv/hyetaekpass/pull/1) 생성·현재 채팅 연결 확인 | source push exit 0. 비밀 패턴105개 파일0건·문서20개 링크/fence0오류·Windows wrapper CRLF를 허용한 staged diff check 통과. 후속 문서는 동일 브랜치 HEAD 참조 |

실패·막힘 기록에는 `대상 요구 / 기대·실제 / 재현과 시도 / 위험·영향 / 필요한 외부 입력 / 계속한 독립 작업 / 책임자`를 남긴다. 알려진 금액 오류가 있으면 해당 규칙을 차단하고 완료를 보류한다.

## 완료 판정

| 판정 층 | 완료에 필요한 실제 증거 | 최신 인계 상태 |
|---|---|---|
| 문서 준비 | 요구·소유·외부 입력·설치/시험·운영 양식이 검토됨 | PM-DOC-01/02/03 구조 점검 통과. 최종 제품 결과 갱신은 총괄 담당 |
| 로컬 검증판 | 실제 브랜드 자산·앱/관리/API/DB 통합, 필수 계산·안전·게시·삭제·복구 검사, 새 환경 Docker, 양 OS 필수 빌드, 실행 안내·commit/push | TS42/AI18/HTTP9/Java10/복구3/source Docker·양 OS validation/production 구성 빌드·simulator/emulator 실행·주요 웹/API 통과. 기본 완료 범위 충족: 구현 커밋 push와 draft PR 연결 확인. native UI·실물·공개 출시는 별도 미수행 |
| 실기기 검증 | 지원 iPhone·Android 설치, 권한/철회/삭제/backup/release 흐름, 실행 기회·지연·절전·종료·배터리의 원기록 | 미수행 |
| 자동 기능 활성 | 해당 OS·장소의 권리·법률·동의·정책·현장 품질 증거. 지역 안내는 별도 | 공개 OFF |
| AWS 운영 | 승인된 비용, HTTPS·인증/MFA·제한 DB·비밀·실제 복구·담당/대리 | 미수행 |
| 공개 출시 | 해당 사업 절차·자료 권리·실제 검수·양 스토어별 승인·지원 가능성 | 미수행 |

문서나 정의 파일을 만든 것은 설치·실측·신고·사용 허가·AWS 배포·스토어 승인 완료가 아니다. 필수 빌드/검사가 막히면 로컬 검증판을 완성으로 바꾸지 않는다. 공개 카탈로그를 확보하지 못하면 운영 규칙 0개 상태를 유지한다. 자동 위치 기능의 외부 게이트를 통과하지 못해도 수동 기능·안전 검사·설치 자료 준비는 계속한다.

총괄 최종 확인: 2026-09-30 18:39 KST Node 42/42·typecheck·관리 build, Python18/18·cfn-lint exit0; 18:28 validation web export exit0; 18:16 Java10/10 exit0. 각 로그는 `/private/tmp/hyetaekpass-final-*.log`, BE JUnit은 `BE/build/test-results/test/`에 남겼다. 산출물·환경·외부 조건은 [기기 기록](device-test.md), 실제 화면은 [증거 목록](evidence/README.md)에 있다.

독립 코드 리뷰의 필수 발견을 수정했다: 실패 후 신선도/NaN 시각/시계 이동/호환 실패 차단 보존, opaque 제보 토큰 JWT 오인, 철회 중 비동기 알림, 제보 영수증 저장 실패와 오프라인 전체삭제, backup marker, 지갑 변경 뒤 자격 재확인. 회귀 42개와 실제 HTTP/복구를 통과했다. 리뷰는 AI 코드 검토이며 실제 사람 원문 검수·운영 MFA·물리 기기 결과가 아니다.

코드 그래프를 최종 소스로 재색인했다(1275 nodes/2900 edges); 기존 잘못된 파일 매핑 이후 `syncCatalog`의 `packages/benefit-core/src/sync.ts` 경로를 MCP 검색에서 재확인했다.

## 2026-09-30 서비스 리디자인 추가 검증

사용자의 Pinterest 등 디자인 사이트 참고 요청에 따라 홈·탐색·지갑·결과·멤버십 코드·관리 화면을 리디자인했다. 모델·계산 엔진·계약·의존성은 유지하며 최신 설계/실제 캡처/범위는 [리디자인 검증](redesign-2026-09-30.md)을 기준으로 한다.

| 증거 | 실제 확인 |
|---|---|
| REDESIGN-CHECK | 최종 typecheck·67/67 Node 회귀·validation web export·관리 Vite build exit 0. 로그 `/private/tmp/hyetaekpass-redesign-{node,web,admin}.log` |
| REDESIGN-UI | 320×740 / 390×844 홈·지갑·결과·QR overflow 없음, 1024×900 앱 가운데 표시. 등록→직접 조건→UNKNOWN→확인된 1,000원 즉시/11,000원 결제/0원 청구→해당 QR, 수정 취소/삭제 확인 취소·재실행 보존 확인. 관리 390×844 / 1440×1000 실제 0개/OFF/refresh |
| REDESIGN-UX | 단계 간 잔류 스크롤·코드 저장 뒤 제목 잘림 수정, 실제 scrollTop 0/back top 20px. Tab 포커스·radio checked/tab selected/disclosure expanded를 브라우저 AX/DOM에서 확인. AI 독립 캡처/소스 검토 필수 발견 없음 |
| REDESIGN-NATIVE | 22:43 KST 최신 aria-* 수정까지 포함한 양 OS production compile exit 0. source 32개 SHA 전후 동일. [실제 source·bundle·권한·서명 증거](verification-evidence/redesign/native-build.json). iOS unsigned, Android debug 서명 내부 AAB, HTTPS placeholder. native GUI/실물/운영/스토어 미수행 |

공개 카탈로그 0개·위치 OFF와 외부 게이트는 유지한다. 이번 scope의 BE·AI·복구·AWS 소스 변경은 없으며 이전 검사 결과를 새 실행으로 표시하지 않는다.
