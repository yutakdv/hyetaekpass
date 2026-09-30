import type { CalculationInput, CalculationResult, Rule, Plan, RuleResult, Basis } from '../../../contracts/types.ts';
import { kstMonth } from './location.ts';
import { ruleAvailable } from './sync.ts';
const won=(n:number)=>Number.isSafeInteger(n)&&n>=0&&n<=1_000_000_000;
function basisValue(basis:Basis,x:CalculationInput,payable:number):number|null{return basis==='ORIGINAL'?x.amountWon:basis==='PAYABLE'?payable:x.eligibleAmountWon??null;}
function assess(rule:Rule,x:CalculationInput,payable:number):RuleResult{
  const reasons:string[]=[];let failed=false;
  const reject=(reason:string)=>{failed=true;reasons.push(reason);};
  if(!x.productIds.includes(rule.productId))reject('PRODUCT_NOT_SELECTED');
  if(rule.brandId!==x.brandId||!rule.channels.includes(x.channel)||(rule.placeIds.length&&!rule.placeIds.includes(x.placeId)))reject('TARGET_NOT_SUPPORTED');
  if(!Number.isFinite(Date.parse(rule.startsAt))||!Number.isFinite(Date.parse(rule.endsAt))||x.now<Date.parse(rule.startsAt)||x.now>=Date.parse(rule.endsAt))reject('OUTSIDE_PERIOD');
  if(rule.status==='CONFLICT')reject('SOURCE_CONFLICT');
  if(!rule.calculation||rule.status==='GUIDE_ONLY')reject(rule.unsupportedReason??'GUIDE_ONLY');
  if(rule.origin==='CATALOG') {const why=ruleAvailable(rule,x.catalog,x.safety,x.now);if(why)reject(why);}
  if(rule.origin==='FIXTURE'&&x.mode!=='DEMO')reject('FIXTURE_NOT_PUBLIC');
  if(rule.origin==='USER_INPUT'&&x.mode==='PUBLIC')reject('USER_INPUT_NOT_CATALOG');
  if(x.safety?.blockedRuleIds.includes(rule.id)||x.safety?.blockedSourceIds.includes(rule.sourceId))reject('BLOCKED');
  const c=x.conditions[rule.id];const month=kstMonth(x.now);
  const current=c&&c.month===month&&c.ruleVersion===rule.version;
  for(const key of rule.requiredConditions){const value=c?.values[key];if(!current||!value||value.ruleVersion!==rule.version||value.month!==month||!Number.isFinite(Date.parse(value.checkedAt))||Date.parse(value.checkedAt)>x.now||kstMonth(Date.parse(value.checkedAt))!==month||!['TRUE','FALSE'].includes(value.value))reasons.push('CONFIRM_'+key);else if(value.value==='FALSE')reject('NOT_MET_'+key);}
  if(rule.remainingWonRequired&&(!current||c.remainingWon===null))reasons.push('CONFIRM_REMAINING_WON');
  if(rule.remainingUsesRequired&&(!current||c.remainingUses===null))reasons.push('CONFIRM_REMAINING_USES');
  if(current){if(c.remainingWon!==null&&!won(c.remainingWon))throw Error('INPUT_INVALID');if(c.remainingUses!==null&&(!Number.isSafeInteger(c.remainingUses)||c.remainingUses<0))throw Error('INPUT_INVALID');if(rule.remainingWonRequired&&c.remainingWon===0)reject('EXHAUSTED_WON');if(rule.remainingUsesRequired&&c.remainingUses===0)reject('EXHAUSTED_USES');}
  const calc=rule.calculation;
  if(calc){
    if(!won(calc.value)||!won(calc.capWon)||!won(calc.minimumWon)||!['PERCENT','FIXED'].includes(calc.kind)||!['FLOOR','HALF_UP','CEIL'].includes(calc.rounding)||!['INSTANT','BILLING'].includes(calc.settlement)||!['ORIGINAL','PAYABLE','ELIGIBLE'].includes(calc.basis)||!['ORIGINAL','PAYABLE','ELIGIBLE'].includes(calc.minimumBasis)||(calc.kind==='PERCENT'&&calc.value>10000))reject('UNSUPPORTED_CALCULATION');
    const base=basisValue(calc.basis,x,payable),minimum=basisValue(calc.minimumBasis,x,payable);
    if(base===null||minimum===null)reasons.push('CONFIRM_ELIGIBLE_AMOUNT');
    else if(minimum<calc.minimumWon)reject('BELOW_MINIMUM');
    if(!failed&&!reasons.length&&base!==null){
      // integer KRW × integer basis points stays below Number.MAX_SAFE_INTEGER at the contract ceiling.
      const numerator=calc.kind==='PERCENT'?base*calc.value:calc.value*10000;
      const rounded=calc.rounding==='FLOOR'?Math.floor(numerator/10000):calc.rounding==='CEIL'?Math.ceil(numerator/10000):Math.floor((numerator+5000)/10000);
      const discountWon=Math.min(rounded,calc.capWon,base,payable,rule.remainingWonRequired?c!.remainingWon!:1_000_000_000);
      return {ruleId:rule.id,eligibility:'TRUE',reasons:[],discountWon,settlement:calc.settlement};
    }
  }
  return {ruleId:rule.id,eligibility:failed?'FALSE':'UNKNOWN',reasons,discountWon:null,settlement:calc?.settlement};
}
export function calculate(x:CalculationInput):CalculationResult{
  if(!won(x.amountWon)||(x.eligibleAmountWon!==undefined&&(!won(x.eligibleAmountWon)||x.eligibleAmountWon>x.amountWon))||!Number.isFinite(x.now))throw Error('INPUT_INVALID');
  const selected=x.catalog.products.filter(p=>x.productIds.includes(p.id));
  if(selected.filter(p=>p.kind==='CARD').length>1||selected.filter(p=>p.kind==='MEMBERSHIP').length>1)throw Error('ONE_CARD_ONE_MEMBERSHIP');
  const results=x.catalog.rules.map(rule=>assess(rule,x,x.amountWon));
  const plans:Plan[]=[];
  const plan=(rules:Rule[])=>{
    let payable=x.amountWon,instant=0,billing=0;
    for(const rule of rules){const r=assess(rule,x,payable);if(r.eligibility!=='TRUE'||r.discountWon===null)return;
      if(r.settlement==='INSTANT'){instant+=r.discountWon;payable-=r.discountWon;}else billing+=r.discountWon;
    }
    if(instant+billing>x.amountWon)return;
    plans.push({ruleIds:rules.map(r=>r.id),instantWon:instant,payableWon:payable,billingWon:billing,totalWon:instant+billing});
  };
  for(const rule of x.catalog.rules)plan([rule]);
  for(const pair of x.catalog.combinations){
    if(pair.allowed!=='TRUE'||!pair.evidenceRef||!pair.review||pair.review.author===pair.review.reviewer||pair.review.method!=='HUMAN_ORIGINAL'||!pair.review.goldenTests.length)continue;
    const rules=pair.ruleIds.map(id=>x.catalog.rules.find(r=>r.id===id));
    if(rules.some(r=>!r))continue;const found=rules as Rule[];
    const kinds=found.map(r=>x.catalog.products.find(p=>p.id===r.productId)?.kind);
    if(!kinds.includes('CARD')||!kinds.includes('MEMBERSHIP'))continue;
    if(x.mode==='PERSONAL'&&found.some(r=>r.origin==='USER_INPUT'))continue; // personal combinations need independent original review; current local editor only creates single rules.
    plan(found);
  }
  plans.sort((a,b)=>b.totalWon-a.totalWon||a.ruleIds.join(',').localeCompare(b.ruleIds.join(',')));
  return {results,plans,best:plans[0]??null,label:'CONDITION_BASED_ESTIMATE'};
}
