import type {WalletItem} from '../../../contracts/types.ts';

/** Official navigation references, not imported benefits or verified customer accounts. */
export interface Provider {id:string;label:string;kind:WalletItem['kind'];subtitle:string;benefitsUrl:string;codeUrl?:string;codeMode:'OFFICIAL'|'NONE'}
export const providers:Provider[]=[
  {id:'NAVER_PLUS',label:'네이버플러스 멤버십',kind:'MEMBERSHIP',subtitle:'네이버 앱에서 인증한 현재 멤버십패스를 제시해요.',benefitsUrl:'https://help.naver.com/service/23168/contents/24137?lang=ko&osType=COMMONOS',codeUrl:'https://help.naver.com/service/23168/contents/24138',codeMode:'OFFICIAL'},
  {id:'T_MEMBERSHIP',label:'T 멤버십',kind:'MEMBERSHIP',subtitle:'변경되는 바코드와 결제 기능은 공식 앱에서 확인해요.',benefitsUrl:'https://sktmembership.tworld.co.kr/mps/pc-bff/mypage/useinfo/useInfo.do',codeUrl:'https://sktmembership.tworld.co.kr/mps/pc-bff/mypage/useinfo/useInfo.do',codeMode:'OFFICIAL'},
  {id:'KT_MEMBERSHIP',label:'KT 멤버십',kind:'MEMBERSHIP',subtitle:'코드·쿠폰·예매를 KT 멤버십에서 확인해요.',benefitsUrl:'https://membership.kt.com/',codeUrl:'https://membership.kt.com/',codeMode:'OFFICIAL'},
  {id:'UPLUS_MEMBERSHIP',label:'U+ 멤버십',kind:'MEMBERSHIP',subtitle:'U+one에서 현재 바코드와 쿠폰을 확인해요.',benefitsUrl:'https://m.lguplus.com/membership/intro',codeUrl:'https://m.lguplus.com/s/cwZZZ',codeMode:'OFFICIAL'},
  {id:'BAEMIN_CLUB',label:'배민클럽',kind:'MEMBERSHIP',subtitle:'배민 주문서에서 내 구독과 적용되는 혜택을 확인해요.',benefitsUrl:'https://www.baemin.com/',codeMode:'NONE'},
  {id:'SHINHAN_CARD',label:'신한카드',kind:'CARD',subtitle:'내 카드의 상품명과 적용 조건을 확인해요.',benefitsUrl:'https://www.shinhancard.com/',codeMode:'NONE'},
  {id:'SAMSUNG_CARD',label:'삼성카드',kind:'CARD',subtitle:'상품·혜택 옵션과 개인 잔여 한도를 확인해요.',benefitsUrl:'https://www.samsungcard.com/',codeMode:'NONE'},
  {id:'HYUNDAI_CARD',label:'현대카드',kind:'CARD',subtitle:'내 카드의 Edition과 혜택 유형을 확인해요.',benefitsUrl:'https://www.hyundaicard.com/',codeMode:'NONE'},
  {id:'KB_CARD',label:'KB국민카드',kind:'CARD',subtitle:'내 카드의 실적과 월별 혜택을 확인해요.',benefitsUrl:'https://card.kbcard.com/',codeMode:'NONE'},
];
export const providerById=(id?:string):Provider|undefined=>providers.find(p=>p.id===id);
export function providerUrl(id:string,purpose:'BENEFITS'|'CODE'):string{
  const provider=providerById(id);if(!provider)throw Error('공식 서비스를 확인해 주세요.');
  const value=purpose==='CODE'?provider.codeUrl:provider.benefitsUrl;
  if(!value)throw Error('현재 이 서비스의 코드 안내를 제공하지 않아요. 공식 혜택을 확인해 주세요.');
  const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password)throw Error('공식 서비스 주소를 확인해 주세요.');return url.href;
}
