# 쓸때 브랜딩과 실제 서비스 연결

2026-09-30 사용자 요청은 이름·로고와 실제 네이버/통신사/배민/카드의 코드·혜택 확보 가능성까지 고려한 앱이다. 일반 디자인·구현은 사용자 위임으로 진행하며 검증된 단위를 기존 비공개 저장소에 저장한다.

브랜드는 **쓸때 / SSEULTTAE**, 문구는 “쓸 때, 내 혜택을 한눈에.”다. 기존 저장소·package/bundle ID와 단말 저장 키는 유지한다. 타사 로고·상품 조건을 임의 복제하지 않는다. 명칭 검색은 상표 확보가 아니다.

서비스 선택 → 보유 수단 로컬 등록 → 공식 혜택 확인 → 개인 조건 기록/비교 → 해당 코드 제시 흐름을 구현했다. 네이버·통신사 코드는 공식 서비스에서 제시한다. 배민클럽은 공식 주문서의 구독 혜택 확인으로 안내하며 외부 제시 코드 존재를 단정하지 않는다. 출처가 특정되지 않은 사용자의 정적 멤버십 코드 등록은 기존 확인·금융 코드 차단을 유지한다.

공식 개인 카드 조회 API는 존재하나 운영 이용 자격·계약·전송요구·보안·지원 항목을 갖추기 전 계정 연결 완료를 표시하지 않는다. 상품 조건의 공개 열람과 계산/배포 이용권·실제 사람 원문 검수는 구별한다. 조사 자료를 PUBLIC 계산 규칙으로 게시하지 않는다. 모든 UNKNOWN·권리·신선도·안전 OFF 조건을 유지한다.

root는 `providers.ts`, WalletItem의 로컬 providerId·모델 검증·등록 수단 변경 시 코드/자격 무효화, App handoff·MembershipCode 정책·theme/config·통합 문서를 소유한다. FE는 ServiceUI 선택/등록/지갑/결과/브랜드 적용, 디자이너는 새 brand 자산과 6개 SVG 검토판, 연구자는 공식 멤버십/카드 근거 문서를 소유한다. 계산 엔진과 의존성은 수정하지 않는다.

검증은 기존 회귀+provider 정책/로컬 저장 경계, 실제 서비스 선택/공식 경로/기존 일반 코드 보존/UNKNOWN 비교, 작은 화면·브랜드 시각 검토, 최종 소스 양 OS 빌드·표시 이름/아이콘 확인이다. 구현·자동 연결·native GUI·실물·운영 승인 결과를 각각 기록한다.

## 구현 결과

- 5개 멤버십(네이버플러스·T·KT·U+·배민클럽), 4개 카드사(신한·삼성·현대·KB) 공식 안내를 검색·구분해 로컬 지갑에 등록한다. 타사 마크나 상품 할인율을 복제하지 않았다.
- `WalletItem.providerId`는 선택한 공식 서비스 참조다. 실제 상품 계약·가입 자격·혜택 데이터의 인증된 식별자로 사용하지 않는다. 카드사 선택 뒤 실제 카드 상품명을 입력해야 한다. 자동 입력된 멤버십 이름은 CARD로 종류를 바꾸면 비운다.
- 공식 제공사에 연결한 멤버십에는 정적 코드 입력 대신 공식 안내를 표시한다. 저장·복원 경계에서도 공식 제공사 코드의 정적 보관을 차단한다. 일반 멤버십의 기존 QR/CODE128/EAN13과 금융 코드 차단·기기 보호 저장은 유지한다.
- 제공사·종류·등급·버전을 바꾸면 연결 조건과 소유 수단을 확인할 수 없는 누락 규칙의 과거 조건을 제거한다. 임시로 빠졌던 PUBLIC 규칙이 복귀해도 예전 TRUE를 자동 재사용하지 않는다. 제공사 변경 시 일반 정적 코드도 제거한다.
- 공식 HTTPS 안내 URL에 코드·지갑·금액·위치·자격을 첨부하지 않는다. 양 OS bundle/application ID와 저장 키는 유지하고 표시 이름·버전·앱/적응형/알림/favicon을 쓸때 0.3.0으로 바꿨다.

## 실제 확인한 결과

2026-09-30 23시대 KST, 총괄과 담당 AI 에이전트 실행. 웹에는 개인 금융자료가 없는 시험 이름·합성 코드·시험 매장 조건을 사용했다.

| 검사·과업 | 실제 결과·범위 |
|---|---|
| 자동 검사 | `npm run typecheck`, `npm test` **71/71**, `npm run build:admin`, `APP_ENV=validation EXPO_PUBLIC_VALIDATION_BUILD=true EXPO_PUBLIC_API_URL=http://127.0.0.1:8080 npm run build:web` exit 0. 로그 `/private/tmp/sseulttae-final-{typecheck,node,admin,web}.log` |
| 독립 코드 검토 | 제공사 변경 뒤 누락 규칙 조건 보존, 자동 멤버십 이름으로 카드 상품명 입력 우회 두 이슈를 실제 함수로 재현하고 RED → GREEN 검사 후 닫음. 실제 사람 원문 검수가 아님 |
| 등록·수정 | 네이버·T·배민 선택→기본 이름 저장, 신한 선택→빈 상품명 거절→시험 상품명 저장→수정 시 신한 참조 보존. 종류 전환 시 참조 해제·dirty 닫기 확인 취소/폐기 동작 확인 |
| 공식 안내 | 네이버 지갑 `공식 코드 안내` 클릭 후 실제 공식 ‘멤버십패스 이용 방법’ 도움말에 도착. 인증서·앱 경로 안내만 읽었으며 로그인·인증서 발급·약관 동의·개인 QR 조회는 하지 않음. 설치된 네이버 앱의 코드 화면 도착은 미검증 |
| 제공사 검색·작은 화면 | 320×740 홈·제공사 목록·카드 필수 입력, KT 검색→한 서비스만 표시→검색 지우기 확인. document width 320, 밖으로 나온 입력/동작 0. 390×844 주요 등록/상세/코드/결과, 1024×900 가운데 앱 폭 558(경계 포함)·문서 폭 1024 확인 |
| 코드·계산 | 기존 일반 시험 멤버십 QR 보존. 12,000원/시험 10% 조건의 UNKNOWN에서 금액·최대 할인 미표시. 등급 TRUE·잔여 1,000원/1회 직접 확인 후 즉시 1,000/결제 11,000/청구 0 → 정확한 시험 멤버십 QR. 실제 매장 할인·스캔 결과 아님 |
| 관리·안전 | 쓸때 워드마크·제목 반영, 320px 문서 폭 320. 실제 상태 새로고침→`ui-empty-20260930-v1`/안전 revision1/자료0/OFF 확인. 공개 위치·계산·양 OS 배경·지역 안내 OFF 유지 |
| 브랜드 자산 | 6종 SVG·선정 심벌·작은 크기 렌더 실제 확인. opaque 1024 앱 아이콘, 투명 adaptive/알림과 안전 원 검사. [자산 증거](../assets/brand/sseulttae/validation.json) |

[홈 390](verification-evidence/sseulttae-provider/home390.jpg) · [홈 320](verification-evidence/sseulttae-provider/home320.jpg) · [제공사 390](verification-evidence/sseulttae-provider/providers390.jpg) · [제공사 320](verification-evidence/sseulttae-provider/providers320.jpg) · [카드사](verification-evidence/sseulttae-provider/cards390.jpg) · [필수 상품명](verification-evidence/sseulttae-provider/card-name-required320.jpg) · [배민 상세](verification-evidence/sseulttae-provider/baemin-detail390.jpg) · [공식 네이버 도착](verification-evidence/sseulttae-provider/naver-official-guide.jpg) · [UNKNOWN](verification-evidence/sseulttae-provider/result-unknown390.jpg) · [결과](verification-evidence/sseulttae-provider/result390.jpg) · [정적 QR](verification-evidence/sseulttae-provider/custom-qr390.jpg) · [넓은 홈](verification-evidence/sseulttae-provider/home1024.jpg) · [관리 320](verification-evidence/sseulttae-provider/admin320.jpg)

23:47 KST 최신 production prebuild/pods와 양 OS Release exit0, source/config/deps 28개와 브랜드 12개의 SHA가 전후 동일하고 총괄이 현재 파일 및 실제 JS/AAB 해시를 재대조했다. iOS compiled 이름 쓸때/0.3.0·최소16.4·ATS false·opaque AppIcon, Android 실제 AAB 이름 쓸때/0.3.0·min24/target36·cleartext false·adaptive/알림 아이콘을 확인했다. iOS 출력에 남아 있던 이전 미참조 브랜드 파일은 현재 ignored app 출력만 비운 뒤 재빌드해 제거했다. 기존 검증 산출물은 보존했다.

[최종 native 증거](verification-evidence/sseulttae-provider/native-build.json)에는 실제 명령·로그·권한·입력/산출물 SHA와 확인 범위가 있다. 내부 산출물은 `.local-tools/artifacts/sseulttae-production-unsigned.app`와 `sseulttae-production-internal.aab`이며 iOS unsigned/Android debug 키 서명·HTTPS placeholder다. iOS JS SHA `8b5611eca7675f6074cd846d9dc19a415d1c0e7048b59708d2113c5fa00b23f8`, AAB SHA `8ff8aa2e41567cc863bd84bad584ac7467543558255a282c59153d7d4b07df79`. 실제 공개 카탈로그는 0개이고 위치는 OFF다. 원문 이용권·실제 사람 검수·로그인/제휴 API 통합·네이티브 화면 과업·실물·매장 POS·운영 서명·AWS·스토어 승인은 완료로 표시하지 않는다.
