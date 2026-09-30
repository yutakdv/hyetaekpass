# 혜택패스 검증판 Implementation Plan

> **For agentic workers:** 실행은 전문 역할 에이전트와 총괄의 독립 파일 소유 분담으로 진행한다. 사용자의 GOAL 위임에 따라 승인 대기를 생략하고 자체 검토 후 구현한다.

**Goal:** 핵심 사용자·관리·서버 흐름과 양 OS 앱을 실제 실행 가능한 검증판으로 완성한다.
**Architecture:** 단말 지갑/계산/위치, 단일 Spring/PostgreSQL 운영 서버, 정형자료 Python CLI. 공유 계산은 한 TypeScript 엔진이다.
**Tech Stack:** Expo React Native, TypeScript, Spring Boot, Java 25 LTS, PostgreSQL, Docker, Python stdlib.
**Spec:** docs/superpowers/specs/2026-09-30-validation-design.md, GOAL_PROMPT.md, docs/00~05.

## Global Constraints
- 공개 카탈로그는 실제 이용권·독립 사람 원문 검수 전 0개; 가상 fixture를 공개하지 않는다.
- UNKNOWN 기본 합계·조합 순위 제외. 한 카드와 최대 한 멤버십; 즉시/지금결제/청구 구분.
- 지갑·개인 조건·좌표는 단말. 서버 로그·journal에 본문·좌표·삭제 토큰 금지.
- 안전 확인 최대24시간, 원문·혜택·권리 중 최단 기한. 새 차단/OFF 우선, 실패로 정상 확인 연장 금지.
- 양 OS 배경 flag 기본 OFF; 실제 기기·법률·권리·심사 증거를 AI/시뮬레이터로 대체하지 않는다.
- codex/ 브랜치, 명시적 staging, 검증 단위 commit/push/draft PR; main 병합·강제 push 금지.

## Review Focus
- 미확인 중복·잔여 소진·월 전환에서 부풀린 합계가 생기지 않는가.
- 새 차단 후 파일 실패/롤백과 시계 회귀에서 규칙이 되살아나지 않는가.
- 원문/권리/검수 변경 후 기존 승인이 재사용되지 않는가.
- 제보 삭제/차단이 DB 복구 후 되살아나지 않는가.
- 권한 거절·오프라인·전체 삭제 후 핵심 수동 기능과 재실행 상태가 안전한가.

### Task 1: 계약·계산·안전 (총괄)
**Files:** contracts/{catalog.schema.json,types.ts,api.md}, packages/benefit-core/{src,test}, package.json/lock.
**Interfaces:** calculate(CalculationInput):CalculationResult, validateCatalog(unknown):Catalog, syncCatalog(...)와 evaluateNotification(...)를 FE가 사용.
- [x] 필수 경계·UNKNOWN·조합·월전환·KST·정산·만료·차단·갱신실패·관측 테스트를 먼저 작성·실패 확인한다.
- [x] 최소 순수 함수와 Schema를 구현한다.
- [x] `npm test`와 `npm run typecheck`로 실제 결과 확인한다.

### Task 2: API·DB·journal·Docker (백엔드 전문 에이전트)
**Files:** BE/, infra/local/; 공유 계약은 읽기 전용.
**Interfaces:** GET /v1/bootstrap, /v1/catalog/{releaseId}, POST/DELETE /v1/reports, /v1/admin/*.
- [x] 승인·입력·게시·차단·토큰 삭제·journal 복구 통합 테스트를 먼저 작성한다.
- [x] Spring 단일 앱·migration·운영 OIDC/MFA와 loopback 개발 접근을 구현한다.
- [x] 새 DB Compose·DB 저장·재시작·복구 검사를 실행한다.

### Task 3: 앱·관리 화면 (프론트엔드 전문 에이전트)
**Files:** FE/mobile/, FE/admin/; 소스 소유 FE, 의존성 소유 총괄.
**Interfaces:** Task1 엔진/계약과 Task2 HTTP. 지갑은 보호 저장, 서버 업로드 없음.
- [x] 입력·수동 탐색·조건·출처·권한거절·삭제·제보 UX와 관리 모든 핵심 흐름을 구현한다.
- [x] 브랜드 실제 자산을 화면/앱 설정에 적용하고 작은화면·큰글씨·실패 상태를 확인한다.
- [x] web export/admin build와 실제 iOS·Android 필수 네이티브 빌드를 실행한다.

### Task 4: 자료 보조 (AI 전문 에이전트)
**Files:** AI/; contracts는 읽기 전용.
- [x] 허가 대장·비개인 CSV 후보·변경 diff·해시/근거 테스트 작성 후 stdlib CLI 구현한다.
- [x] `python3 -m unittest discover -s AI/tests`를 실행한다. 외부 모델·게시 도구 없음.

### Task 5: 통합·운영·Git (총괄/PM)
**Files:** README.md, docs/verification-ledger.md, docs/device-test.md, infra/aws/, scripts/.
- [x] 계약·소스·검수·카탈로그·앱과 실제 API/DB 흐름·안전/복구를 통합 확인한다.
- [x] 독립 코드 리뷰를 받아 중요한 오류를 수정·검증한다.
- [x] 실제 실행 명령·환경·미해결 외부 게이트와 AWS/스토어 준비 자료를 완성한다.
- [ ] diff/비밀 확인 후 해당 파일만 commit/push하고 draft PR을 현재 채팅에 연결한다.

자체 검토: 원문·권리·검수 미확인 상태는 공개0개로 수렴, 필수 테스트는 각 책임자에게 배치, 공유 인터페이스 소유는 총괄 하나다. 기기/계정 제약은 실제 환경 검사 후 필요한 입력만 묶어 요청한다.

실제 최종 결과는 docs/verification-ledger.md에 기록한다. 네이티브 GUI·실기기·실제 자료/법률·AWS 배포·스토어 승인은 외부 조건이며 위 구현/빌드 체크와 구분한다.
