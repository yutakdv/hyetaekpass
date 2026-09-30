import type {Rule,CalculationInput,CalculationResult,Catalog,Safety} from '../../../contracts/types.ts';
import {calculate,ruleAvailable,safetyValid} from '../../../packages/benefit-core/src/index.ts';
import type {BenefitEntry,ServiceOrigin} from './serviceTypes.ts';
import {reasonText} from './model.ts';
import type {LocalData,PersonalDraft} from './model.ts';
import {parseWon} from './model.ts';

export function parsePercent(value:string):number {
  const text=value.trim();if(!/^\d{1,3}(\.\d{1,2})?$/.test(text))throw Error('할인율은 0~100%, 소수 두 자리까지 입력해 주세요.');
  const [whole,fraction='']=text.split('.');const bp=Number(whole)*100+Number(fraction.padEnd(2,'0'));
  if(bp>10000)throw Error('할인율은 100% 이하여야 해요.');return bp;
}
function koreanDate(value:string):number {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))throw Error('날짜는 YYYY-MM-DD로 입력해 주세요.');
  const midnight=Date.parse(value+'T00:00:00+09:00');
  if(!Number.isFinite(midnight)||new Date(midnight+9*3600000).toISOString().slice(0,10)!==value)throw Error('실제 달력의 날짜를 입력해 주세요.');return midnight;
}
export function kstDatePeriod(start:string,end:string):{startsAt:string;endsAt:string}{
  const a=koreanDate(start),b=koreanDate(end);if(b<a)throw Error('종료일은 시작일 이후로 입력해 주세요.');
  return {startsAt:new Date(a).toISOString(),endsAt:new Date(b+86400000).toISOString()};
}
export function newPersonalDraft(id:string,productId:string):PersonalDraft {
  return {id,title:'',brandId:'',productId,channel:'OFFLINE',discountType:'NOTE',value:'',cap:'',minimum:'',startsOn:'',endsOn:'',settlement:'UNKNOWN',basis:'UNKNOWN',minimumBasis:'UNKNOWN',rounding:'UNKNOWN',requiredConditions:[],trackRemainingWon:false,trackRemainingUses:false,usage:'',exclusions:'',sourceUrl:'',updatedAt:new Date().toISOString()};
}
export function personalDraftToRule(draft:PersonalDraft,version:string):Rule {
  if(!draft.title.trim()||!draft.brandId.trim()||!draft.productId)throw Error('제목·브랜드·보유 수단을 확인해 주세요.');
  if(draft.discountType==='NOTE'||draft.settlement==='UNKNOWN'||draft.basis==='UNKNOWN'||draft.minimumBasis==='UNKNOWN'||draft.rounding==='UNKNOWN')throw Error('계산 의미가 미확인인 내용은 메모로 저장해 주세요.');
  const minimum=parseWon(draft.minimum),cap=parseWon(draft.cap),value=draft.discountType==='RATE'?parsePercent(draft.value):parseWon(draft.value);
  if(minimum===null||cap===null||value===null)throw Error('최소 금액·상한·할인 값을 확인하거나 메모로 저장해 주세요.');
  const period=draft.startsAt&&draft.endsAt?{startsAt:draft.startsAt,endsAt:draft.endsAt}:kstDatePeriod(draft.startsOn,draft.endsOn);
  if(!Number.isFinite(Date.parse(period.startsAt))||Date.parse(period.endsAt)<=Date.parse(period.startsAt))throw Error('적용 기간을 확인해 주세요.');
  return {id:draft.originalRuleId??draft.id,version,origin:'USER_INPUT',title:draft.title.trim(),productId:draft.productId,brandId:draft.brandId.trim(),sourceId:'personal',channels:[draft.channel],placeIds:[],...period,status:'DRAFT',requiredConditions:draft.requiredConditions,remainingWonRequired:draft.trackRemainingWon,remainingUsesRequired:draft.trackRemainingUses,calculation:{kind:draft.discountType==='RATE'?'PERCENT':'FIXED',value,basis:draft.basis,minimumWon:minimum,minimumBasis:draft.minimumBasis,capWon:cap,rounding:draft.rounding,settlement:draft.settlement},usageSteps:draft.usage.split('\n').map(s=>s.trim()).filter(Boolean),exclusions:draft.exclusions.split('\n').map(s=>s.trim()).filter(Boolean)};
}
export function saveReference(data:LocalData,origin:'PUBLIC'|'PERSONAL',id:string,recent:boolean,now=Date.now()):LocalData {
  if(recent)return {...data,recents:[{origin,id,viewedAt:new Date(now).toISOString()},...data.recents.filter(r=>r.origin!==origin||r.id!==id)].slice(0,10)};
  if(data.favorites.some(r=>r.origin===origin&&r.id===id))return {...data,favorites:data.favorites.filter(r=>r.origin!==origin||r.id!==id)};
  if(data.favorites.length>=40)throw Error('최대 40개까지 저장할 수 있어요. 사용하지 않는 저장 항목을 정리해 주세요.');
  return {...data,favorites:[{origin,id,savedAt:new Date(now).toISOString()},...data.favorites]};
}
export function createWriteQueue(){
  let queue=Promise.resolve(),generation=0;
  return {generation:()=>generation,invalidate:()=>++generation,run<T>(work:()=>Promise<T>,expected?:number):Promise<T>{
    const result=queue.then(()=>{if(expected!==undefined&&expected!==generation)throw Error('삭제 이전의 작업을 취소했어요.');return work();});
    queue=result.then(()=>undefined,()=>undefined);return result;
  }};
}
/** Enumerate owned pairs; every amount and allowed combination still comes from the single engine. */
export function compareWallet(input:CalculationInput):CalculationResult {
  const products=input.catalog.products.filter(p=>input.productIds.includes(p.id));
  if(products.length>30)throw Error('비교할 수단은 최대 30개예요.');
  const cards=[null,...products.filter(p=>p.kind==='CARD')],memberships=[null,...products.filter(p=>p.kind==='MEMBERSHIP')];
  const plans=new Map<string,CalculationResult['plans'][number]>(),results=new Map<string,CalculationResult['results'][number]>();
  for(const card of cards)for(const membership of memberships){
    const ids=[card?.id,membership?.id].filter((id):id is string=>!!id);if(!ids.length)continue;
    const result=calculate({...input,productIds:ids});
    for(const row of result.results)if(input.catalog.rules.some(r=>r.id===row.ruleId&&ids.includes(r.productId)))results.set(row.ruleId,row);
    for(const plan of result.plans)plans.set(plan.ruleIds.join(','),plan);
  }
  const sorted=[...plans.values()].sort((a,b)=>b.totalWon-a.totalWon||a.ruleIds.join(',').localeCompare(b.ruleIds.join(',')));
  return {results:[...results.values()],plans:sorted,best:sorted[0]??null,label:'CONDITION_BASED_ESTIMATE'};
}
export function benefitEntries(catalog:Catalog,origin:ServiceOrigin,data:LocalData,now:number,safety?:Safety,trusted=true):BenefitEntry[]{
  return catalog.rules.map(rule=>{
    const source=catalog.sources.find(s=>s.id===rule.sourceId);
    const unavailable=origin==='PUBLIC'&&(!source||!source.rights.display||!source.rights.offlineCache||now>=Date.parse(source.rightsUntil)||!!safety?.blockedSourceIds.includes(rule.sourceId));
    const problem=origin==='PUBLIC'?(!trusted?'SAFETY_EXPIRED_OR_OFF':ruleAvailable(rule,catalog,safety,now)):null;
    const expired=now>=Date.parse(rule.endsAt)||now<Date.parse(rule.startsAt);
    const status:BenefitEntry['status']=unavailable?'UNAVAILABLE':problem==='BLOCKED'?'BLOCKED':expired?'EXPIRED':!rule.calculation||rule.status==='GUIDE_ONLY'?'GUIDE_ONLY':problem?'UNKNOWN':'AVAILABLE';
    return {id:rule.id,origin,rule:unavailable?null:rule,brandName:unavailable?'':catalog.brands.find(b=>b.id===rule.brandId)?.name??rule.brandId,productName:unavailable?'':catalog.products.find(p=>p.id===rule.productId)?.name??'',productKind:unavailable?undefined:catalog.products.find(p=>p.id===rule.productId)?.kind,status,statusText:unavailable?'저장한 자료를 더 이상 제공하지 않아요':expired?'적용 기간을 확인해 주세요':problem?reasonText(problem):status==='GUIDE_ONLY'?'계산 없이 안내하는 조건이에요':'조건을 입력해 확인할 수 있어요',canCalculate:!unavailable&&!problem&&!expired&&!!rule.calculation&&rule.status!=='GUIDE_ONLY',sourceUrl:unavailable?null:origin==='PERSONAL'?data.ruleSourceUrl[rule.id]??null:source?.url??null,sourceLabel:origin==='PERSONAL'?'내가 기록한 조건 · 원문 미검수':origin==='DEMO'?'가상 예시 · 실제 혜택 아님':'자료 원문 검수',checkedAt:unavailable?null:origin==='PERSONAL'?data.ruleWrittenAt[rule.id]??null:source?.checkedAt??null,...(origin==='PUBLIC'&&!unavailable&&source?{freshUntil:source.freshUntil,rightsUntil:source.rightsUntil}:{})};
  });
}
export function visiblePlaces(catalog:Catalog|null,safety:Safety|null,now:number,trusted:boolean,foreground=false){
  if(!catalog||!trusted||!safetyValid(safety,now)||!safety?.flags.catalog||(foreground&&!safety.flags.foregroundLocation))return [];
  return catalog.places.filter(p=>{const source=catalog.sources.find(s=>s.id===p.sourceId);return !!source&&!safety.blockedSourceIds.includes(p.sourceId)&&source.rights.display&&source.rights.offlineCache&&source.rights.transform&&source.rights.iosDistribution&&source.rights.androidDistribution&&now>=Date.parse(source.checkedAt)&&now<Math.min(Date.parse(source.freshUntil),Date.parse(source.rightsUntil));});
}
