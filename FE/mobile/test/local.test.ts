import test from 'node:test';
import assert from 'node:assert/strict';
import {parseWon, splitProtectedText, normalizeLocal, personalCatalog, unknownConditions,emptyLocal,updateWallet} from '../src/model.ts';
import {providers,providerUrl} from '../src/providers.ts';
import {calculate} from '../../../packages/benefit-core/src/index.ts';
test('KRW input is integer and unknown remains null',()=>{assert.equal(parseWon(''),null);assert.equal(parseWon('모름'),null);assert.equal(parseWon('12,000'),12000);assert.throws(()=>parseWon('1.5'));assert.throws(()=>parseWon('-1'));assert.throws(()=>parseWon('1000000001'));});
test('Korean protected storage chunks preserve bytes and text',()=>{const text='지갑🔒'.repeat(1000);const chunks=splitProtectedText(text);assert.equal(chunks.join(''),text);assert(chunks.every(s=>new TextEncoder().encode(s).length<=1600));});
test('local unreviewed rule stays personal and unknown never becomes a sum',()=>{const now=Date.now();const data=normalizeLocal({wallet:[{id:'w',name:'내 카드',kind:'CARD',tier:'모름',productVersion:null}],rules:[{id:'p',version:'1',origin:'USER_INPUT',title:'내 조건',productId:'w',brandId:'내 매장',sourceId:'personal',channels:['OFFLINE'],placeIds:[],startsAt:new Date(now-1000).toISOString(),endsAt:new Date(now+86400000).toISOString(),status:'DRAFT',requiredConditions:['spend'],remainingWonRequired:true,remainingUsesRequired:true,calculation:{kind:'FIXED',value:1000,basis:'ORIGINAL',minimumWon:0,minimumBasis:'ORIGINAL',capWon:1000,rounding:'FLOOR',settlement:'INSTANT'},usageSteps:['결제 전 확인'],exclusions:[]}]});const catalog=personalCatalog(data,now);const result=calculate({amountWon:12000,brandId:'내 매장',placeId:'',channel:'OFFLINE',productIds:['w'],catalog,conditions:unknownConditions(catalog.rules,now),now,mode:'PERSONAL'});assert.equal(result.best,null);assert.equal(result.results[0].eligibility,'UNKNOWN');assert.equal(catalog.rules[0].origin,'USER_INPUT');});
import {writeProtected, readProtected, removeProtected} from '../src/protected.ts';
test('a failed protected save keeps the previous committed wallet',async()=>{const entries=new Map<string,string>();let fail=false;const store={get:async(k:string)=>entries.get(k)??null,set:async(k:string,v:string)=>{if(fail&&k.endsWith('.1'))throw Error('full');entries.set(k,v);},remove:async(k:string)=>{entries.delete(k);}};await writeProtected(store,'wallet',{name:'old'});fail=true;await assert.rejects(writeProtected(store,'wallet',{name:'지갑'.repeat(1000)}));assert.deepEqual(await readProtected(store,'wallet'),{name:'old'});await removeProtected(store,'wallet');assert.equal(entries.size,0);});
test('official provider metadata stays local and cannot become a stored payment or changing membership code',()=>{
  const wallet={id:'member',name:'내 멤버십',kind:'MEMBERSHIP' as const,tier:'모름',productVersion:null};
  const code={walletId:wallet.id,format:'QR' as const,value:'STATIC-DEMO',label:wallet.name,updatedAt:new Date().toISOString()};
  const old=normalizeLocal({...emptyLocal(),wallet:[wallet],codes:[code],conditions:{r:{values:{tier:{value:'TRUE',checkedAt:new Date().toISOString(),month:'2026-09',ruleVersion:'1'}},remainingWon:1000,remainingUses:1,month:'2026-09',ruleVersion:'1'}}});
  assert.equal(old.codes.length,1);
  assert.throws(()=>normalizeLocal({...old,wallet:[{...wallet,providerId:'NAVER_PLUS'}]}),/공식 서비스/);
  assert.throws(()=>normalizeLocal({...old,wallet:[{...wallet,providerId:'SHINHAN_CARD'}],codes:[]}),/공식 서비스/);
  assert.throws(()=>normalizeLocal({...old,wallet:[{...wallet,providerId:'arbitrary-url'}],codes:[]}),/공식 서비스/);
  const updated=updateWallet(old,{...wallet,providerId:'T_MEMBERSHIP'},wallet.id,[{id:'r',productId:wallet.id} as any]);
  assert.equal(normalizeLocal(updated).wallet[0].providerId,'T_MEMBERSHIP');assert.equal(updated.codes.length,0);assert.equal(updated.conditions.r,undefined);
  assert.equal(personalCatalog(updated,Date.now()).sources[0].rights.display,false);
  const absent=updateWallet(old,{...wallet,providerId:'NAVER_PLUS'},wallet.id,[]);
  assert.equal(normalizeLocal(absent).conditions.r,undefined,'catalog absence must not restore old provider truth later');
});
test('official handoff uses public HTTPS references without wallet values and rejects code issuance for cards',()=>{
  for(const p of providers){const url=new URL(providerUrl(p.id,'BENEFITS'));assert.equal(url.protocol,'https:');assert.equal(url.username+url.password,'');if(p.codeMode==='NONE')assert.throws(()=>providerUrl(p.id,'CODE'));else assert.equal(new URL(providerUrl(p.id,'CODE')).protocol,'https:');}
  assert.throws(()=>providerUrl('https://example.test/private-code','BENEFITS'));
});
