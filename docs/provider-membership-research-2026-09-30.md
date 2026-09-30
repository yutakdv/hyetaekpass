# 네이버·통신사·배민 멤버십 연동 조사

확인일: **2026-09-30, Asia/Seoul**. 제공사 공식 웹·도움말·개발자 문서와 제공사가 게시한 앱스토어 설명을 조사했다. 개인 로그인, 코드 발급, 제휴 신청, 외부 연락, 실제 매장 스캔은 수행하지 않았다. 카드사 조사는 별도 문서에 기록한다.

## 제품 판단

공개 혜택 원문과 공식 서비스 진입 경로는 확보할 수 있다. 그러나 이번에 확인한 공개 공식 문서에서는 개인의 네이버·통신사·배민 멤버십 코드와 자격을 제3자 앱으로 가져오는 발급·조회 API 또는 파트너 SDK 규격을 발견하지 못했다. **API가 존재하지 않는다는 결론은 아니다.** 비공개 제휴 기능, 특정 계약 고객에게 제공되는 문서와 권한은 미확인이다.

따라서 지금 제공할 수 있는 연결은 **공식 혜택 안내 보기 → 해당 제공사 서비스에서 현재 코드·쿠폰·자격 확인**이다. `연결됨`, `자동 가져오기 완료`, `현재 사용할 수 있음`은 실제 인증·API 응답 없이 표시하지 않는다. 저장하는 것은 사용자가 선택한 제공사와 본인 입력 조건이며, 공식 연결용 버튼을 누른 것만으로 가입·등급·사용 잔여량을 확정하지 않는다.

## 가능·미확인·제품 행동

| 제공사 | 공개 원문 접근 / 현재 개인 코드 근거 | API·SDK 및 인증 확인 | 정적·동적·결제 구별 | 지금 가능한 제품 행동 |
| --- | --- | --- | --- | --- |
| 네이버플러스 | [혜택 소개](https://help.naver.com/service/23168/contents/11765?lang=ko), [멤버십패스 혜택](https://help.naver.com/service/23168/contents/24137?lang=ko&osType=COMMONOS), [QR 소개](https://help.naver.com/service/23168/contents/24085?osType=COMMONOS) 공개 열람 가능 | [네이버 로그인 문서](https://developers.naver.com/docs/login/devguide/devguide.md)는 OAuth·프로필용. 개인 멤버십 QR·자격·잔여 혜택 조회 규격은 조사 범위에서 미발견. [패스 이용](https://help.naver.com/service/23168/contents/24138)은 네이버 인증서와 제휴사별 최초 약관 동의 필요 | 패스는 오프라인 회원 확인 QR. 스캔 시 가입 상태 확인. QR 회전 주기·외부 재표시 허용은 미확인. Npay 결제 QR과 구분 | `네이버에서 멤버십패스 확인` 안내와 공식 앱 설치 경로 제공. 패스 QR 자동 생성·이미지 복제·로그인만으로 자격 확정 보류 |
| Npay / Npay 안의 멤버십 | [현장결제 안내](https://help.naver.com/service/5630/contents/23849?lang=ko&osType=COMMONOS)는 결제 메뉴에 멤버십 카드·쿠폰이 함께 있음을 설명 | [Npay 개발자 소개](https://developers.pay.naver.com/introduce/naverpay), [온라인 결제 문서](https://docs.pay.naver.com/docs/common/online-payment-overview/)는 가맹점 주문·결제 연동. 개인의 기존 멤버십 지갑을 조회하는 규격은 미발견. 결제 연동의 사업자 조건·키·심사는 별도 확인 대상 | 현장 QR은 결제 기능을 수행함. 멤버십 카드 메뉴와 결제 QR을 같은 저장 대상으로 취급하지 않음. QR 갱신 주기는 미확인 | `Npay에서 확인` 공식 연결 제공. 결제 QR 가져오기·결제 실행은 현재 범위 밖. Npay 가맹점 API 보유를 개인 멤버십 연동 권한으로 표시하지 않음 |
| SKT T 멤버십 | [혜택 원문 예시](https://m.tworld.co.kr/membership/benefit/brand-benefit?brandId=1094&memberType=DISCOUNT_MEMBER), [카드 이용 안내](https://sktmembership.tworld.co.kr/mps/pc-bff/mypage/useinfo/useInfo.do) 공개 열람 가능 | 모바일 카드 발급은 제공사 서비스에서 진행하며 본인 명의 등 조건 적용. T 멤버십 개인 코드 조회·발급 API/SDK 규격은 미발견. [SKTCH 공개 API 안내](https://sktch.sktelecom.com/ko/apiSharingSolution.do)는 개인 멤버십 코드 API의 근거가 되지 않음 | 공식 혜택 원문이 **일회용 바코드는 20분 단위 변경**이라고 명시. 기존 카드번호·플라스틱 카드와 구별. [결제 ON](https://sktmembership.tworld.co.kr/mps/pc-bff/program/alliance/pay-barcode-detail.do)은 11pay 연결·인증 후 혜택+결제 | `T 멤버십에서 현재 바코드 확인`을 기본으로 제공. 일회용 코드 정적 보관·재생성 보류. 고정 카드번호가 있어도 모든 점포·포인트 사용에 대체 가능하다고 표시하지 않음 |
| KT 멤버십 | [제휴 브랜드 원문 예시](https://membership.kt.com/discount/partner/C23/67/PartnerDetail.do), [가입 안내](https://ermsweb.kt.com/search/faq/faqAnswerM.do?kbId=KNOW0000287895&nodeId=NODE0000000186&parentNodeId=NODE0000000112), [모바일 카드 FAQ](https://ermsweb.kt.com/superstar/faq/faqList.do) 접근 가능 | KT 제공사 서비스의 가입·로그인 및 멤버십 자격 확인이 필요. 개인 카드/바코드 조회·발급 공개 API/SDK는 미발견. [통화매니저 API](https://dev.fone.kt.com/useInfo/serviceInfo.dev)는 통화 연동용으로 멤버십 API와 구별 | 바코드 회전 주기·정적 재사용·제3자 재표시 허용은 미확인. [영화 FAQ](https://showmovie.mobile.kt.com/Customer/FaqList.aspx?page=1&qIdx=12)는 내통장결제 등 금융 결제 기능도 구분함 | `KT 멤버십에서 확인` 및 공식 앱 설치 경로 제공. 회원 번호만으로 쿠폰·예매·결제 기능이 대체된다고 표시하지 않음 |
| LG U+ | [현재 멤버십 소개](https://m.lguplus.com/membership/intro), [개별 혜택 변경 공지](https://www.lguplus.com/support/service/notice/membership/2452) 공개 열람 가능 | [통합 공지](https://www.lguplus.com/support/service/notice/2000043255)는 제공사 앱에서 멤버십 바코드·쿠폰 이용과 약관 동의를 안내. 개인 바코드 조회·발급 API/SDK는 미발견. [네트워크 Open API](https://www.lguplus.com/about/ko/corporation/promotion/press-kit/detail?atclNo=2000001458&pageNo=1)는 단말·SIM·위치·품질 API로 별도 영역 | 현재 앱은 **U+one**. 정적/회전 코드·제3자 재표시 조건은 미확인. 통합 공지는 오프라인 휴대폰 결제의 PASS 이용을 별도로 안내 | `U+one에서 멤버십 확인` 제공. 종료된 독립 U+멤버십 앱을 기본 목적지로 사용하지 않음. PASS 결제 코드를 멤버십 코드로 가져오지 않음 |
| 배민 / 배민클럽 | [공식 서비스 소개](https://www.baemin.com/), [공식 앱 개발자 설명](https://play.google.com/store/apps/details?gl=kr&hl=ko&id=com.sampleapp), [가게 할인 운영 안내](https://ceo.baemin.com/guide/11531?share=UrlCopy) 접근 가능 | 외부 앱이 개인 배민클럽 가입 상태·쿠폰·제시 코드를 조회하는 공개 API/SDK는 미발견. [POS 제휴 연동](https://ceo.baemin.com/guide/13571?share=UrlCopy)은 가게 주문접수용이며 개인 소비자 멤버십 연동 근거가 아님 | 외부 매장에 제시하는 배민클럽 개인 멤버십 바코드/QR 자체를 공식 자료에서 확인하지 못함. 앱의 QR 스캔 주문·배민페이·상품권은 서로 다른 기능 | `배민에서 혜택 확인`을 제공. 가상의 배민클럽 바코드를 만들지 않음. 실제 가게·지역·주문 방식과 주문서에서 할인 확인 안내 |

위 표의 링크와 본문은 모두 2026-09-30에 확인했다. `미발견`은 공개 자료 조사 결과, `미확인`은 해당 자료로 조건을 확정할 수 없다는 뜻이다. 제휴 연동이 불가능하다는 뜻으로 사용하지 않는다.

## 제공사별 구현에 중요한 근거

### 네이버플러스와 Npay

[로그인 개발가이드](https://developers.naver.com/docs/login/devguide/devguide.md)의 공개 프로필 항목은 식별자·이름·별명·이미지·이메일·생일·연령·성별·출생연도·전화번호다. 앱 등록, Client ID/Secret, 사용자 동의와 토큰은 로그인 기능의 조건이다. 문서에 멤버십 패스 QR이나 가입 자격 필드가 없으므로 **네이버 로그인 구현만으로 멤버십 가져오기가 완성되지 않는다.**

[패스 소개](https://help.naver.com/service/23168/contents/24085?osType=COMMONOS)는 스캔 시점의 가입 상태를 확인한다고 설명한다. [이용 방법](https://help.naver.com/service/23168/contents/24138)은 네이버 앱 또는 네이버플러스 스토어 앱, 인증서 발급, 제휴사별 약관 동의를 요구한다. [출입증 소개](https://help.naver.com/service/22027/contents/24163?lang=ko&osType=COMMONOS)는 출입증 QR과 패스 기능의 연동도 안내한다. 인증용 QR을 임의의 고정 QR로 대체할 근거는 확보하지 않았다.

혜택 원문도 종류별로 적용 경로가 다르다. [패스 혜택 목록](https://help.naver.com/service/23168/contents/24137?lang=ko&osType=COMMONOS)은 일부 오프라인 혜택의 조건으로 Npay QR 현장결제를 명시한다. [온라인 추가 적립 대상](https://help.naver.com/service/23168/contents/11774?lang=ko&osType=COMMONOS)은 상품 표시·접속 경로·결제 방식·제외 상품을 구분한다. 하나의 네이버 멤버십 보유 여부로 모든 결제의 할인이나 적립을 확정하지 않는다.

[Npay API 인증 규격](https://docs.pay.naver.com/docs/common/authentication/)은 발급받은 Client ID·Chain ID·Client Secret을 요청 헤더에 넣는 결제 API 인증을 설명하며, Secret을 클라이언트 바이너리에 보관하지 않도록 명시한다. 이 사업자 API 인증과 네이버 사용자 OAuth는 서로 다르다. 어느 인증도 개인 멤버십 QR 조회 권한을 확인한 근거가 아니다.

### SKT

[롯데리아 공식 혜택 원문](https://m.tworld.co.kr/membership/benefit/brand-benefit?brandId=1094&memberType=DISCOUNT_MEMBER)은 일회용 바코드·플라스틱 카드 사용과 포인트 사용 시 일회용 코드 필요를 구분한다. 20분 변경은 이 공식 설명에 따른 확인 결과이며, 이를 다른 제공사의 만료 시간으로 일반화하지 않는다. 영구 카드번호와 갱신되는 코드의 차이를 UI에서 보존해야 한다.

[결제바코드 안내](https://sktmembership.tworld.co.kr/mps/pc-bff/program/alliance/pay-barcode-detail.do)는 11pay 연결, 제3자 제공 동의, 본인인증·결제 비밀번호 또는 생체인증, 결제 ON 상태를 설명한다. 스캔 가능한 모양만으로 비금융 멤버십 코드인지 판정할 수 없다. 제공사 화면의 일회용·결제 코드는 현재 코드 확인 링크로 처리한다.

### KT

[KT 제휴 브랜드 원문](https://membership.kt.com/discount/partner/C23/67/PartnerDetail.do)은 앱/웹 예매, 쿠폰 발급, 적용 장소·상품, 사용 기한과 중복 제한을 구분한다. 멤버십 카드 한 장의 바코드 표시만으로 모든 혜택을 이용할 수 있다고 설계하면 실제 이용 경로가 빠진다. [KT 공식 앱 설명](https://play.google.com/store/apps/details?hl=ko&id=com.olleh.android.oc2)은 KT 가입 고객 대상 앱임을 확인한다. 코드 회전·재표시·발급 API에 관한 상세 규격은 확보하지 못했다.

### LG U+

[2025-07-22 통합 공지](https://www.lguplus.com/support/service/notice/2000043255)는 멤버십 기능을 당시 `당신의 U+`로 옮기고 독립 멤버십 앱 종료를 안내한다. 현재 [LG Uplus의 앱 개발자 설명](https://play.google.com/store/apps/details?hl=ko&id=com.lguplus.mobile.cs)은 2025-10-27 앱 명칭을 **U+one**으로 변경하고 혜택 메뉴에 멤버십 기능을 통합했다고 설명한다. 역사적 공지 이름과 현재 제품 이름을 구별한다.

공식 공지에 연결된 [U+one 혜택 진입 링크](https://m.lguplus.com/s/cwZZZ)는 조사에서 [앱 이동 안내 페이지](https://m.lguplus.com/apcm/html-push?url=/membership/membership-list)로 이동했다. 실제 기기에 설치된 앱으로 이어지는지, 로그인 뒤 정확히 어느 화면이 열리는지는 시험하지 않았다.

### 배민

[WoowaBrothers가 게시한 앱 설명](https://play.google.com/store/apps/details?gl=kr&hl=ko&id=com.sampleapp)은 배민클럽의 적용 가게·주문 방식·서비스 지역·회원 전용 혜택을 구분하고 QR 주문 스캔과 배민페이 인증을 각각 설명한다. QR 기능이 있다는 문구는 소비자 멤버십 제시 QR이 있다는 증거가 아니다.

[주문접수PC Lite 가이드](https://ceo.baemin.com/guide/13571?share=UrlCopy)는 공식 POS 파트너와 가게 로그인으로 주문을 접수하는 연동이다. 이를 소비자 계정의 쿠폰·멤버십 자격 가져오기 API로 재해석하지 않는다. 현재 제품의 올바른 다음 행동은 배민에서 본인 주문서의 혜택을 확인하는 것이다.

## 확인한 공식 연결 URL

아래 HTTPS 링크의 공개 웹 또는 스토어 페이지를 확인했다. **사용자 기기의 앱 실행, 설치 여부 판별, 로그인 뒤 도착 화면, Universal Link/App Link 지원은 미검증**이다. 스토어 링크는 설치·앱 찾기용이며 특정 멤버십 코드 화면으로 곧바로 이동하는 링크라고 표시하지 않는다. 커스텀 URL scheme은 이번 조사에서 검증하지 않았으므로 만들거나 추정하지 않는다.

| 제공사 | 혜택/도움말 웹 연결 | Android 공식 앱 페이지 | iOS 공식 앱 페이지 | 추천 버튼·도착 안내 |
| --- | --- | --- | --- | --- |
| 네이버플러스 | [패스 이용 방법](https://help.naver.com/service/23168/contents/24138) | [네이버 / NAVER Corp.](https://play.google.com/store/apps/details?hl=ko&id=com.nhn.android.search) | [네이버 / NAVER Corp.](https://apps.apple.com/kr/app/%EB%84%A4%EC%9D%B4%EB%B2%84-naver/id393499958) | `네이버에서 확인` → 마이 → 네이버플러스 → 마이 멤버십 → 멤버십패스 |
| Npay | [현장결제 안내](https://help.naver.com/service/5630/contents/23849?lang=ko&osType=COMMONOS) | [네이버페이 / NAVER FINANCIAL](https://play.google.com/store/apps/details?hl=ko&id=com.naverfin.payapp) | [네이버페이 / Naver Financial Corporation](https://apps.apple.com/kr/app/%EB%84%A4%EC%9D%B4%EB%B2%84%ED%8E%98%EC%9D%B4/id1554807824?platform=ipad) | `Npay에서 확인` → 제공사에서 결제·멤버십 메뉴를 구별 |
| SKT | [T 멤버십 이용 안내](https://sktmembership.tworld.co.kr/mps/pc-bff/mypage/useinfo/useInfo.do) | [T 멤버십 / SKTelecom](https://play.google.com/store/apps/details?hl=ko&id=com.tms) | [T 멤버십 / SK Telecom](https://apps.apple.com/kr/app/t-%EB%A9%A4%EB%B2%84%EC%8B%AD/id464205249) | `T 멤버십에서 확인` → 제공사 앱의 현재 일회용 바코드 |
| KT | [KT 멤버십](https://membership.kt.com/) / [제휴 브랜드 원문 예시](https://membership.kt.com/discount/partner/C23/67/PartnerDetail.do) | [KT 멤버십 / KT Corporation](https://play.google.com/store/apps/details?hl=ko&id=com.olleh.android.oc2) | [KT 멤버십 / KT Corporation](https://apps.apple.com/kr/app/kt-%EB%A9%A4%EB%B2%84%EC%8B%AD/id451095024) | `KT 멤버십에서 확인` → 제공사 앱에서 코드·쿠폰·예매를 확인 |
| LG U+ | [공개 멤버십 소개](https://m.lguplus.com/membership/intro) / [U+one 진입 안내](https://m.lguplus.com/s/cwZZZ) | [U+one / LG Uplus](https://play.google.com/store/apps/details?hl=ko&id=com.lguplus.mobile.cs) | [U+one / LG Uplus](https://apps.apple.com/kr/app/u-one-%EC%9A%94%EA%B8%88-%EA%B0%80%EC%9E%85-%EB%A1%9C%EB%B0%8D-%EB%A9%A4%EB%B2%84%EC%8B%AD/id945578864) | `U+one에서 확인` → 혜택 메뉴의 멤버십 |
| 배민 | [배달의민족 공식 웹](https://www.baemin.com/) | [배달의민족 / WoowaBrothers](https://play.google.com/store/apps/details?gl=kr&hl=ko&id=com.sampleapp) | [배달의민족 / Woowa Brothers](https://apps.apple.com/kr/app/%EB%B0%B0%EB%8B%AC%EC%9D%98%EB%AF%BC%EC%A1%B1-%EB%B0%B0%EB%8B%AC%ED%8C%81-%EB%AC%B4%EB%A3%8C-%EB%B0%B0%EB%AF%BC%ED%81%B4%EB%9F%BD/id378084485?ppid=05e9d339-00d2-4698-af5a-9210a09cf606) | `배민에서 혜택 확인` → 배민클럽·쿠폰·실제 주문서 |

## 후속 연동 인수 조건

다음 항목은 제공사와 실제 연동을 구현할 때 필요한 확인 사항이며, 이 조사에서 획득했다는 뜻이 아니다.

1. 개인 코드/가입 자격/잔여 혜택 각각의 제공 범위, 승인·계약 대상, 샌드박스, 정식 API/SDK 규격과 인증 scope를 확보한다. 로그인·가맹점 결제·POS 주문 API와 혼동하지 않는다.
2. 코드의 실제 종류, 갱신/만료·일회성·취소·로그아웃·해지 처리, 재생성 및 제3자 화면 표시 허용, 가맹점 인식·본인 사용 조건을 확인한다. 금융 QR·결제 바코드·인증서 데이터를 일반 지갑 코드 입력으로 받지 않는다.
3. 공식 앱 연결은 양 OS에서 설치/미설치, 로그인/로그아웃, 앱 복귀와 실패 안내를 실기기로 검증한다. 웹 링크 또는 설치 페이지를 열었다는 사실과 앱 코드 화면에 도착했다는 사실을 구분한다.
4. 혜택 원문의 공개 열람은 서비스 표시·구조화·양 OS JSON 배포·오프라인 보존·갱신·철회 권리 확보와 별개다. 프로젝트의 권리 7개와 실제 사람의 원문 검수 gate가 충족되기 전 공개 계산 규칙으로 게시하지 않는다. 연구 링크는 조사 근거로 보관한다.
5. 사용자 조건·저장·공식 안내 연결은 공개 규칙 0개에서도 제공한다. 가입·등급·잔여량이 미확인인 혜택은 UNKNOWN으로 계산·합산·순위에서 제외한다. 제휴 준비 상태를 자동 연동 완료나 적용 보장으로 표현하지 않는다.

## 조사 한계와 완료 증거

- 공개 문서의 비인증 접근과 공식 앱 개발자 설명을 확인했다. API 키 발급, 로그인, 개인 코드 발급/가져오기, 네이티브 SDK 실행, 매장 수락·앱 deep link 시험은 수행하지 않았다.
- KT 멤버십 홈페이지와 일부 FAQ의 추출 결과는 JavaScript 화면 또는 제목에 그쳤다. 구체적인 공개 제휴 브랜드 원문과 스토어 설명으로 보완했으며, 읽을 수 없던 내용에서 코드 정책이나 API 부재를 추론하지 않았다.
- SKT 일회용 바코드 변경은 공식 혜택 원문으로 확인했다. 네이버·KT·LG U+ 코드의 회전·재표시 조건과 배민클럽 외부 제시 코드 존재는 미확인이다. 이용자 리뷰나 비공식 블로그를 이를 확정하는 근거로 사용하지 않았다.
- 출처 접근 조사 완료와 데이터 권리·제휴·독립 사람 검수·실기기 통합 완료는 서로 다른 결과다. 이 문서는 조사 산출물이며 공개 출시나 실제 제공사 연동의 완료 증거가 아니다.
