import type {WalletItem} from '../../../contracts/types.ts';
import type {MembershipCodeData} from './model.ts';
import {toSVG} from '@bwip-js/generic';

export function validateMembershipCode(kind:WalletItem['kind'],format:MembershipCodeData['format'],value:string):void {
  if(kind!=='MEMBERSHIP')throw Error('멤버십 수단에만 코드를 등록할 수 있어요.');
  if(!value.trim())throw Error('멤버십 코드를 입력해 주세요.');
  if(format==='QR'){
    if(new TextEncoder().encode(value).length>512)throw Error('QR 코드는 UTF-8 기준 512바이트까지 입력할 수 있어요.');
  }else if(format==='CODE128'){
    if(value.length>80||!/^[\x20-\x7e]+$/.test(value))throw Error('CODE128은 영문·숫자·기호로 최대 80자까지 입력해 주세요.');
  }else if(format==='EAN13'){
    if(!/^\d{13}$/.test(value))throw Error('EAN13은 체크 숫자를 포함한 13자리 숫자를 입력해 주세요.');
    const sum=[...value.slice(0,12)].reduce((total,digit,i)=>total+Number(digit)*(i%2===0?1:3),0);
    if((10-sum%10)%10!==Number(value[12]))throw Error('EAN13의 체크 숫자가 맞지 않아요. 원래 코드를 확인해 주세요.');
  }else throw Error('QR·CODE128·EAN13 중 코드 형식을 선택해 주세요.');
}

export function membershipCodeSvg(code:Pick<MembershipCodeData,'format'|'value'>):string {
  validateMembershipCode('MEMBERSHIP',code.format,code.value);
  try{
    return toSVG({bcid:{QR:'qrcode',CODE128:'code128',EAN13:'ean13'}[code.format],text:code.value,scale:3,
      paddingwidth:12,paddingheight:12,backgroundcolor:'FFFFFF',barcolor:'000000',includetext:false,
      parse:false,parsefnc:false,...(code.format==='QR'?{eclevel:'M'}:{height:28})});
  }catch{throw Error('코드를 표시하지 못했어요. 형식과 입력 내용을 다시 확인해 주세요.');}
}
