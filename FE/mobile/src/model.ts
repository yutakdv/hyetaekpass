import {kstMonth, validateCatalog} from '../../../packages/benefit-core/src/index.ts';
import type {Catalog, Rule, RuleConditions, WalletItem} from '../../../contracts/types.ts';
import {validateMembershipCode} from './membership.ts';
import {providerById} from './providers.ts';
export interface PersonalDraft {
  id:string; title:string; brandId:string; productId:string; channel:string;
  discountType:'RATE'|'FIXED'|'NOTE'; value:string; cap:string; minimum:string;
  startsOn:string; endsOn:string; startsAt?:string; endsAt?:string;
  settlement:'INSTANT'|'BILLING'|'UNKNOWN'; basis:'ORIGINAL'|'PAYABLE'|'ELIGIBLE'|'UNKNOWN'; minimumBasis:'ORIGINAL'|'PAYABLE'|'ELIGIBLE'|'UNKNOWN'; rounding:'FLOOR'|'HALF_UP'|'CEIL'|'UNKNOWN';
  requiredConditions:string[]; trackRemainingWon:boolean; trackRemainingUses:boolean;
  usage:string; exclusions:string; sourceUrl:string; updatedAt:string; originalRuleId?:string;
}
export interface MembershipCodeData {walletId:string;format:'QR'|'CODE128'|'EAN13';value:string;label:string;updatedAt:string}
export interface SavedReference {origin:'PUBLIC'|'PERSONAL';id:string;savedAt:string}
export interface RecentReference {origin:'PUBLIC'|'PERSONAL';id:string;viewedAt:string}
export interface LocalData {
  wallet: WalletItem[]; rules: Rule[]; ruleWrittenAt:Record<string,string>; ruleSourceUrl:Record<string,string>; conditions: Record<string,RuleConditions>;
  consent: {location:boolean; advertising:boolean; background:boolean; version:string; updatedAt:string};
  reports: {id:string;deleteToken:string;createdAt?:string;category?:string}[];
  experience:{onboardingDone:boolean;defaultCard:string|null;defaultMembership:string|null};
  favorites:SavedReference[];recents:RecentReference[];drafts:PersonalDraft[];codes:MembershipCodeData[];
}
export const emptyLocal = ():LocalData=>({wallet:[],rules:[],ruleWrittenAt:{},ruleSourceUrl:{},conditions:{},consent:{location:false,advertising:false,background:false,version:'validation-1',updatedAt:new Date().toISOString()},reports:[],experience:{onboardingDone:false,defaultCard:null,defaultMembership:null},favorites:[],recents:[],drafts:[],codes:[]});
export function parseWon(value:string):number|null {
  const cleaned=value.replaceAll(',','').trim();if(!cleaned||cleaned==='모름')return null;
  if(!/^\d+$/.test(cleaned)||!Number.isSafeInteger(Number(cleaned))||Number(cleaned)>1_000_000_000)throw Error('원 단위의 0~1,000,000,000 정수를 입력해 주세요.');return Number(cleaned);
}
export function splitProtectedText(text:string):string[]{
  const chunks:string[]=[];let chunk='',bytes=0;
  for(const char of text){const size=new TextEncoder().encode(char).length;if(bytes+size>1600){chunks.push(chunk);chunk='';bytes=0;}chunk+=char;bytes+=size;}if(chunk)chunks.push(chunk);
  if(chunks.length>128)throw Error('단말 저장 한도를 초과했어요. 사용하지 않는 직접 작성 자료를 정리해 주세요.');return chunks;
}
export function normalizeLocal(value:unknown):LocalData {
  if(!value)return emptyLocal();if(typeof value!=='object'||Array.isArray(value))throw Error('단말 자료 형식을 확인할 수 없어요.');const data={...emptyLocal(),...value as Partial<LocalData>};
  if(!('experience' in value))data.experience.onboardingDone=data.wallet?.length>0||data.rules?.length>0;
  if(!Array.isArray(data.wallet)||data.wallet.length>30||data.wallet.some(w=>!w||typeof w.id!=='string'||!w.id||w.id.length>200||typeof w.name!=='string'||!w.name||w.name.length>100||!['CARD','MEMBERSHIP'].includes(w.kind)||typeof w.tier!=='string'||w.tier.length>100||(w.productVersion!==null&&(typeof w.productVersion!=='string'||w.productVersion.length>100))))throw Error('지갑 저장 형식을 확인할 수 없어요.');
  if(data.wallet.some(w=>w.providerId!==undefined&&(typeof w.providerId!=='string'||providerById(w.providerId)?.kind!==w.kind)))throw Error('보유 수단의 공식 서비스 연결을 확인해 주세요.');
  if(!Array.isArray(data.rules)||data.rules.length>40||data.rules.some(r=>r.origin!=='USER_INPUT')||!data.conditions||typeof data.conditions!=='object'||!Array.isArray(data.reports)||data.reports.length>50||data.reports.some(r=>typeof r.id!=='string'||typeof r.deleteToken!=='string'))throw Error('단말 자료 저장 형식을 확인할 수 없어요.');
  if(!data.consent||['location','advertising','background'].some(k=>typeof data.consent[k as 'location']!=='boolean'))throw Error('동의 저장 형식을 확인할 수 없어요.');
  if(!data.ruleWrittenAt||!data.ruleSourceUrl||Object.values(data.ruleWrittenAt).some(v=>typeof v!=='string'||!Number.isFinite(Date.parse(v)))||Object.values(data.ruleSourceUrl).some(v=>typeof v!=='string'||v.length>2000))throw Error('직접 작성 메타데이터를 확인할 수 없어요.');
  const short=(v:unknown,max=200):v is string=>typeof v==='string'&&v.length<=max;
  const time=(v:unknown)=>short(v)&&Number.isFinite(Date.parse(v));
  const refs=(values:unknown,max:number,key:'savedAt'|'viewedAt')=>Array.isArray(values)&&values.length<=max&&values.every(r=>r&&['PUBLIC','PERSONAL'].includes(r.origin)&&short(r.id)&&r.id.length>0&&time(r[key]))&&new Set(values.map(r=>r.origin+':'+r.id)).size===values.length;
  if(!data.experience||typeof data.experience.onboardingDone!=='boolean'||[data.experience.defaultCard,data.experience.defaultMembership].some(v=>v!==null&&!short(v))||!refs(data.favorites,40,'savedAt')||!refs(data.recents,10,'viewedAt'))throw Error('저장 목록 형식을 확인할 수 없어요.');
  if(!Array.isArray(data.drafts)||data.drafts.length>40||data.drafts.some(d=>!d||!short(d.id)||!d.id||!short(d.title,100)||!short(d.brandId)||!short(d.productId)||!short(d.channel,100)||!['RATE','FIXED','NOTE'].includes(d.discountType)||['value','cap','minimum','startsOn','endsOn'].some(k=>!short(d[k as 'value'],100))||!['INSTANT','BILLING','UNKNOWN'].includes(d.settlement)||!['ORIGINAL','PAYABLE','ELIGIBLE','UNKNOWN'].includes(d.basis)||!['ORIGINAL','PAYABLE','ELIGIBLE','UNKNOWN'].includes(d.minimumBasis)||!['FLOOR','HALF_UP','CEIL','UNKNOWN'].includes(d.rounding)||!Array.isArray(d.requiredConditions)||d.requiredConditions.length>20||d.requiredConditions.some(k=>!short(k,100))||typeof d.trackRemainingWon!=='boolean'||typeof d.trackRemainingUses!=='boolean'||!short(d.usage,2000)||!short(d.exclusions,2000)||!short(d.sourceUrl,2000)||!time(d.updatedAt)||(d.startsAt!==undefined&&!time(d.startsAt))||(d.endsAt!==undefined&&!time(d.endsAt))))throw Error('작성 중인 조건 형식을 확인할 수 없어요.');
  if(!Array.isArray(data.codes)||data.codes.length>30||new Set(data.codes.map(c=>c.walletId)).size!==data.codes.length||data.codes.some(c=>!c||!short(c.walletId)||!data.wallet.some(w=>w.id===c.walletId&&w.kind==='MEMBERSHIP')||!['QR','CODE128','EAN13'].includes(c.format)||!short(c.value,512)||!c.value||new TextEncoder().encode(c.value).length>512||!short(c.label,100)||!time(c.updatedAt)))throw Error('멤버십 코드 저장 형식을 확인할 수 없어요.');
  for(const code of data.codes){if(providerById(data.wallet.find(w=>w.id===code.walletId)?.providerId))throw Error('이 서비스의 코드는 공식 서비스에서 확인해 주세요.');validateMembershipCode('MEMBERSHIP',code.format,code.value);}
  if(data.experience.defaultCard!==null&&!data.wallet.some(w=>w.id===data.experience.defaultCard&&w.kind==='CARD')||data.experience.defaultMembership!==null&&!data.wallet.some(w=>w.id===data.experience.defaultMembership&&w.kind==='MEMBERSHIP'))throw Error('기본 보유 수단의 연결을 확인해 주세요.');
  if(new Set(data.drafts.map(d=>d.id)).size!==data.drafts.length||data.drafts.some(d=>(d.originalRuleId!==undefined&&!short(d.originalRuleId))||!data.wallet.some(w=>w.id===d.productId)))throw Error('작성 중인 조건의 연결을 확인해 주세요.');
  validateCatalog(personalCatalog(data,Date.now()));return data;
}
export function personalCatalog(data:LocalData,now:number):Catalog {
  return {schemaVersion:1,semanticsVersion:1,releaseId:'personal-local',createdAt:new Date(now).toISOString(),brands:[...new Set(data.rules.map(r=>r.brandId))].map(id=>({id,name:id})),products:data.wallet.map(w=>({id:w.id,name:w.name,kind:w.kind})),sources:[{id:'personal',url:'https://hyetaekpass.invalid/user-input',documentVersion:'사용자 직접 작성 · 미검수',checkedAt:new Date(now).toISOString(),freshUntil:'2099-01-01T00:00:00Z',rightsUntil:'2099-01-01T00:00:00Z',rights:{display:false,transform:false,iosDistribution:false,androidDistribution:false,offlineCache:false,update:false,revoke:false,evidenceRef:'local-user-input-only'}}],places:[],rules:data.rules,combinations:[]};
}
export function unknownConditions(rules:Rule[],now:number):Record<string,RuleConditions>{return Object.fromEntries(rules.map(r=>[r.id,{values:Object.fromEntries(r.requiredConditions.map(k=>[k,{value:'UNKNOWN',checkedAt:new Date(now).toISOString(),month:kstMonth(now),ruleVersion:r.version}])),remainingWon:null,remainingUses:null,month:kstMonth(now),ruleVersion:r.version}]));}
export function reasonText(reason:string):string {
  const known:Record<string,string>={PRODUCT_NOT_SELECTED:'해당 보유 상품을 선택하지 않았어요.',TARGET_NOT_SUPPORTED:'점포·브랜드·결제 채널이 지원 범위와 달라요.',OUTSIDE_PERIOD:'혜택 적용 기간이 아니에요.',SOURCE_CONFLICT:'자료 조건이 서로 충돌해요.',GUIDE_ONLY:'이 혜택은 안내만 제공해요.',SAFETY_EXPIRED_OR_OFF:'최신 안전 상태 확인이 필요하거나 안내가 중지됐어요.',BLOCKED:'이 혜택은 현재 안내를 중지했어요.',SOURCE_OR_RIGHTS_EXPIRED:'원문 또는 이용권 기한이 지났어요.',RIGHTS_OR_REVIEW_REQUIRED:'이용권·실제 원문 검수 확인이 필요해요.',EXHAUSTED_WON:'잔여 할인 한도가 소진됐어요.',EXHAUSTED_USES:'잔여 이용 횟수가 소진됐어요.',BELOW_MINIMUM:'최소 결제 금액 조건을 충족하지 않아요.',CONFIRM_ELIGIBLE_AMOUNT:'할인 대상 품목 금액을 확인해 주세요.',CONFIRM_REMAINING_WON:'잔여 할인 한도를 확인해 주세요.',CONFIRM_REMAINING_USES:'잔여 이용 횟수를 확인해 주세요.'};
  return known[reason]??(reason.startsWith('CONFIRM_')?`${conditionLabel(reason.slice(8))} 확인이 필요해요.`:reason.startsWith('NOT_MET_')?`${conditionLabel(reason.slice(8))} 조건을 충족하지 않아요.`:reason);
}
export function conditionLabel(key:string):string{return ({spend:'전월 실적',tier:'멤버십 등급·유형',productVersion:'상품 버전',eligibleItems:'대상 품목·점포 인정'} as Record<string,string>)[key]??key;}
export function updateWallet(data:LocalData,item:WalletItem|null,productId:string,publicRules:Rule[]):LocalData{
  const old=data.wallet.find(w=>w.id===productId);const providerChanged=old?.providerId!==item?.providerId;const changed=!item||!old||old.tier!==item.tier||old.productVersion!==item.productVersion||old.kind!==item.kind||providerChanged;
  const known=new Set([...data.rules,...publicRules].map(r=>r.id));
  const affected=new Set([...data.rules,...publicRules].filter(r=>r.productId===productId).map(r=>r.id));
  const removed=new Set(item?[]:data.rules.filter(r=>r.productId===productId).map(r=>r.id));
  const index=data.wallet.findIndex(w=>w.id===productId);const wallet=item?(index<0?[...data.wallet,item]:data.wallet.map(w=>w.id===productId?item:w)):data.wallet.filter(w=>w.id!==productId);
  return {...data,wallet,rules:data.rules.filter(r=>!removed.has(r.id)),drafts:data.drafts.filter(d=>item||d.productId!==productId),codes:data.codes.filter(c=>c.walletId!==productId||(item&&item.kind==='MEMBERSHIP'&&!providerChanged)),favorites:data.favorites.filter(r=>r.origin!=='PERSONAL'||!removed.has(r.id)),recents:data.recents.filter(r=>r.origin!=='PERSONAL'||!removed.has(r.id)),experience:{...data.experience,defaultCard:item?.kind==='CARD'||data.experience.defaultCard!==productId?data.experience.defaultCard:null,defaultMembership:item?.kind==='MEMBERSHIP'||data.experience.defaultMembership!==productId?data.experience.defaultMembership:null},ruleWrittenAt:Object.fromEntries(Object.entries(data.ruleWrittenAt).filter(([rid])=>!removed.has(rid))),ruleSourceUrl:Object.fromEntries(Object.entries(data.ruleSourceUrl).filter(([rid])=>!removed.has(rid))),conditions:changed?Object.fromEntries(Object.entries(data.conditions).filter(([rid])=>known.has(rid)&&!affected.has(rid))):data.conditions};
}
export type ReportReceipt = LocalData['reports'][number];
export async function clearDeviceBeforeRemoteReport(receipt:ReportReceipt|null,pause:()=>void,clear:()=>Promise<void>,remove:(receipt:ReportReceipt)=>Promise<void>,pending:(receipt:ReportReceipt|null)=>void):Promise<boolean>{
  pause();await clear();if(!receipt)return true;
  try{await remove(receipt);}catch{return false;}
  pending(null);return true;
}
export async function submitReportSafely(data:LocalData,post:()=>Promise<ReportReceipt>,persist:(data:LocalData)=>Promise<void>,remove:(receipt:ReportReceipt)=>Promise<void>,pending:(receipt:ReportReceipt|null)=>void):Promise<void>{
  // Reserve the maximum expected receipt before the request can create server data.
  if(data.reports.length>=50)throw Error('보관한 제보가 50개예요. 기존 서버 제보를 삭제한 뒤 다시 보내 주세요.');
  const reservation=normalizeLocal({...data,reports:[...data.reports,{id:'r'.repeat(200),deleteToken:'t'.repeat(512)}]});splitProtectedText(JSON.stringify(reservation));
  const receipt=await post();if(typeof receipt.id!=='string'||!receipt.id||typeof receipt.deleteToken!=='string'||!receipt.deleteToken)throw Error('제보 삭제 토큰을 확인하지 못했어요.');pending(receipt);
  try{await persist({...data,reports:[...data.reports,receipt]});pending(null);}catch{
    try{await remove(receipt);}catch{throw Error('삭제 토큰 저장과 서버 제보 취소를 완료하지 못했어요. 화면의 토큰을 보관하고 제보 삭제를 다시 시도해 주세요.');}
    pending(null);throw Error('단말에 삭제 토큰을 저장하지 못해 서버 제보를 취소했어요. 저장소를 확인한 뒤 다시 시도해 주세요.');
  }
}
