import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyLocal, normalizeLocal, updateWallet} from '../src/model.ts';
import {parsePercent, kstDatePeriod, createWriteQueue, saveReference, personalDraftToRule, newPersonalDraft,compareWallet,benefitEntries,visiblePlaces} from '../src/service.ts';
import {catalog,now,input} from '../../../packages/benefit-core/test/fixtures.ts';

test('legacy protected data migrates without losing wallet or receipt',()=>{
  const wallet={id:'w',name:'내 카드',kind:'CARD' as const,tier:'모름',productVersion:null};
  const data=normalizeLocal({wallet:[wallet],reports:[{id:'r',deleteToken:'secret'}]});
  assert.deepEqual(data.wallet,[wallet]);assert.equal(data.reports[0].deleteToken,'secret');
  assert.equal(data.experience.onboardingDone,true);assert.deepEqual(data.favorites,[]);
  assert.throws(()=>normalizeLocal({...data,favorites:Array(41).fill({origin:'PERSONAL',id:'r',savedAt:new Date().toISOString()})}));
});
test('percent input uses exact hundredths and rejects invalid ranges',()=>{
  assert.equal(parsePercent('10'),1000);assert.equal(parsePercent('0.29'),29);assert.equal(parsePercent('100.00'),10000);
  for(const value of ['1.001','-1','101','1e1','abc'])assert.throws(()=>parsePercent(value));
});
test('Korean date period includes the last day and rejects impossible dates',()=>{
  assert.deepEqual(kstDatePeriod('2026-09-30','2026-10-01'),{startsAt:'2026-09-29T15:00:00.000Z',endsAt:'2026-10-01T15:00:00.000Z'});
  assert.throws(()=>kstDatePeriod('2026-02-29','2026-03-01'));assert.throws(()=>kstDatePeriod('2026-10-02','2026-10-01'));
});
test('latest local mutations serialize; deletion prevents old refresh resurrection',async()=>{
  const queue=createWriteQueue();let data:string[]=[];
  await Promise.all([queue.run(async()=>{await Promise.resolve();data=[...data,'wallet'];}),queue.run(async()=>{data=[...data,'favorite'];})]);
  assert.deepEqual(data,['wallet','favorite']);const old=queue.generation();queue.invalidate();
  await queue.run(async()=>{data=[];});await assert.rejects(queue.run(async()=>{data=['old cache'];},old));assert.deepEqual(data,[]);
  await queue.run(async()=>{data=['new'];});assert.deepEqual(data,['new']);
});
test('saved references contain no amount or original text and wallet deletion cleans links',()=>{
  let data=emptyLocal();data.wallet=[{id:'w',name:'카드',kind:'CARD',tier:'',productVersion:null}];
  const draft=newPersonalDraft('d','w');Object.assign(draft,{title:'10%',brandId:'매장',discountType:'RATE',value:'10',cap:'1000',minimum:'0',startsOn:'2026-09-30',endsOn:'2026-10-31',basis:'ORIGINAL',minimumBasis:'ORIGINAL',rounding:'FLOOR',settlement:'INSTANT'});
  data.rules=[personalDraftToRule(draft,'version')];data.experience.defaultCard='w';data.drafts=[newPersonalDraft('unfinished','w')];
  data=saveReference(data,'PERSONAL','d',false);data=saveReference(data,'PERSONAL','d',true);assert.deepEqual(Object.keys(data.favorites[0]).sort(),['id','origin','savedAt']);
  const removed=updateWallet(data,null,'w',[]);assert.equal(removed.rules.length,0);assert.equal(removed.drafts.length,0);assert.equal(removed.favorites.length,0);assert.equal(removed.recents.length,0);assert.equal(removed.experience.defaultCard,null);
});
test('unconfirmed calculation meaning stays a draft, never a numeric Rule',()=>{
  const draft=newPersonalDraft('d','w');draft.title='메모';draft.brandId='매장';assert.throws(()=>personalDraftToRule(draft,'1'));
  Object.assign(draft,{discountType:'RATE',value:'10',minimum:'0',cap:'1000',startsOn:'2026-09-30',endsOn:'2026-10-31',basis:'ORIGINAL',minimumBasis:'ORIGINAL',rounding:'FLOOR',settlement:'INSTANT'});
  const rule=personalDraftToRule(draft,'1');assert.equal(rule.calculation?.value,1000);assert.equal(rule.origin,'USER_INPUT');assert.equal(rule.review,undefined);
});
test('all-wallet comparison enumerates one card and one membership using engine results only',()=>{
  const result=compareWallet(input());
  assert.equal(result.best?.instantWon,1000);assert.equal(result.best?.payableWon,11000);assert.equal(result.best?.billingWon,550);
  const unknown=compareWallet({amountWon:12000,brandId:catalog.rules[0].brandId,placeId:catalog.places[0].id,channel:'OFFLINE',productIds:catalog.products.map(p=>p.id),catalog,conditions:{},now,mode:'DEMO'});assert.equal(unknown.best,null);
});
test('rights withdrawal cannot expose saved original content; personal display stays separate',()=>{
  const source=structuredClone(catalog);source.rules=source.rules.map(r=>({...r,origin:'CATALOG'}));
  const entries=benefitEntries(source,'PUBLIC',emptyLocal(),now,input().safety,true);
  assert(entries.every(e=>e.rule===null&&e.sourceUrl===null&&e.brandName===''&&!e.canCalculate));
  const data=emptyLocal();data.wallet=[{id:'w',name:'멤버십',kind:'MEMBERSHIP',tier:'',productVersion:null}];
  assert.throws(()=>normalizeLocal({...data,codes:[{walletId:'w',format:'EAN13',value:'1234567890123',label:'',updatedAt:new Date().toISOString()}]}));
  assert.throws(()=>normalizeLocal({...data,experience:{...data.experience,defaultCard:'w'}}));
});
test('multiple cards are compared separately and an unreviewed pair is never added',()=>{
  const x=input();x.catalog.products.push({id:'other-card',name:'추가 가상 카드',kind:'CARD'});x.productIds.push('other-card');
  x.catalog.rules.push({...x.catalog.rules[1],id:'other-rule',productId:'other-card',calculation:{...x.catalog.rules[1].calculation!,kind:'FIXED',value:5000,basis:'ORIGINAL',capWon:5000,settlement:'INSTANT'}});
  x.conditions['other-rule']={...x.conditions.c,remainingWon:5000};const result=compareWallet(x);
  assert.deepEqual(result.best?.ruleIds,['other-rule']);assert.equal(result.best?.totalWon,5000);assert.equal(result.best?.payableWon,7000);
  assert(!result.plans.some(p=>p.ruleIds.includes('other-rule')&&p.ruleIds.length>1));
});
test('public place display hides blocked, expired, unlicensed and untrusted sources',()=>{
  const x=input(),s=x.catalog.sources[0];Object.assign(s.rights,{display:true,offlineCache:true,transform:true,iosDistribution:true,androidDistribution:true});
  assert.equal(visiblePlaces(x.catalog,x.safety!,now,true).length,1);
  assert.equal(visiblePlaces(x.catalog,{...x.safety!,blockedSourceIds:[s.id]},now,true).length,0);
  assert.equal(visiblePlaces(x.catalog,x.safety!,Date.parse(s.rightsUntil),true).length,0);
  assert.equal(visiblePlaces(x.catalog,x.safety!,now,false).length,0);s.rights.display=false;assert.equal(visiblePlaces(x.catalog,x.safety!,now,true).length,0);
});
