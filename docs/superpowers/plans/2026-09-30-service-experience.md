# 서비스 경험 구현 계획

> Goal: 실제 일상 사용을 위한 P0 화면과 세부 기능을 구현하고 검증한다. 사용자 위임에 따라 승인 대기 없이 실행한다.

1. root — 호환 로컬 모델 확장, 퍼센트/한국 날짜/개인 draft 변환, 참조 정리·정렬 보존, 최신 mutation 큐/삭제 세대. 기존 자료를 보존하고 의미 없는 숫자를 생성하지 않는 검사부터 실행한다.
2. frontend — UI props 계약을 먼저 공유하고 4탭/상세/지갑/친숙한 내 조건 작성/3단계 결제/저장/설정·도움말·제보·예시를 완성한다. 입력 변경마다 저장하지 않는다.
3. root — App controller를 연결한다. startup 로컬 로딩과 갱신을 분리하고 native 안전 동작·권한 철회·동기화 제한을 보존한다. 삭제 중 돌아오는 응답을 차단한다.
4. service_design — 기존 관리자 API로 업무 navigation, 상태 요약, 역할과 증거가 보이는 검수/발행/제보/안전/감사 UI를 구현한다.
5. root — typecheck·TS/Python/Java/HTTP 안전 회귀·관리자/web 빌드, 실제 브라우저 P0 과업/저장 재실행·오류/320px·확대 검사. 발견한 실패는 원인부터 수정한다.
6. root — 변경 소스의 iOS/Android 실제 네이티브 빌드·가능한 runtime 확인, 독립 코드/안전 검토, README/인수·검증 레저 갱신. diff 검사 후 해당 파일만 stage·commit·push, 기존 draft PR 설명을 최종 기능으로 갱신한다.

원격 저장소는 yutakdv/hyetaekpass이며 현재 codex/validation-build 브랜치와 PR #1을 이어 사용한다. 외부 출시 게이트와 현재 구현 결과를 구별한다.
