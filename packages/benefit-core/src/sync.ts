import type { Bootstrap, CacheState, Rule, Catalog, Safety } from '../../../contracts/types.ts';
import {validateCatalog,validatePublicCatalog} from './catalog.ts';
export function safetyValid(safety:Safety|null|undefined,now:number):boolean{return !!safety&&Number.isFinite(now)&&Number.isFinite(safety.receivedAt)&&now>=safety.receivedAt&&now<safety.receivedAt+86400000&&Math.abs(safety.receivedAt-Date.parse(safety.serverTime))<=300000;}
export function ruleAvailable(rule:Rule,catalog:Catalog,safety:Safety|undefined,now:number):string|null{
  if(!safetyValid(safety,now)||!safety!.flags.catalog)return 'SAFETY_EXPIRED_OR_OFF';
  if(safety!.blockedRuleIds.includes(rule.id)||safety!.blockedSourceIds.includes(rule.sourceId))return 'BLOCKED';
  const source=catalog.sources.find(s=>s.id===rule.sourceId);
  if(!source||now>=Math.min(Date.parse(source.freshUntil),Date.parse(source.rightsUntil),Date.parse(rule.endsAt))||now<Date.parse(source.checkedAt))return 'SOURCE_OR_RIGHTS_EXPIRED';
  try{validatePublicCatalog({...catalog,rules:[rule],combinations:[]},now);}catch{return 'RIGHTS_OR_REVIEW_REQUIRED';}
  return null;
}
export async function syncCatalog(state:CacheState,b:Bootstrap,download:(path:string)=>Promise<string>,hash:(data:string)=>Promise<string>,saveSafety:(s:Safety)=>Promise<void>,saveCatalog:(c:Catalog)=>Promise<void>,now:number):Promise<CacheState>{
  const incoming=b.safety;
  const ids=(value:unknown)=>Array.isArray(value)&&value.length<=10000&&value.every(v=>typeof v==='string'&&v.length>0&&v.length<=200);
  if(!incoming||!Number.isSafeInteger(incoming.revision)||incoming.revision<0||incoming.revision<(state.safety?.revision??0)||!ids(incoming.blockedRuleIds)||!ids(incoming.blockedSourceIds)||!incoming.flags||(['catalog','foregroundLocation','iosBackground','androidBackground','area'] as const).some(k=>typeof incoming.flags[k]!=='boolean')||!safetyValid({...incoming,receivedAt:now},now))throw Error('BOOTSTRAP_INVALID');
  const safety:Safety={...incoming,receivedAt:now,blockedRuleIds:[...new Set([...(state.safety?.blockedRuleIds??[]),...incoming.blockedRuleIds])],blockedSourceIds:[...new Set([...(state.safety?.blockedSourceIds??[]),...incoming.blockedSourceIds])]};
  // Restrictions persist first; only a fully verified catalog renews the last good confirmation.
  const restricted={...safety,receivedAt:state.safety?.receivedAt??0,serverTime:state.safety?.serverTime??incoming.serverTime,flags:Object.fromEntries(Object.entries(safety.flags).map(([key,value])=>[key,value&&!!state.safety?.flags[key as keyof Safety['flags']]])) as Safety['flags']};
  await saveSafety(restricted);const next:CacheState={...state,safety:restricted};
  try{
    if(b.schemaVersion!==1||b.semanticsVersion!==1)throw Error('CATALOG_INCOMPATIBLE');
    if(!/^\/v1\/catalog\/[A-Za-z0-9._-]+$/.test(b.catalogPath)||b.catalogPath!=='/v1/catalog/'+b.releaseId||!Number.isSafeInteger(b.sizeBytes)||b.sizeBytes<1||b.sizeBytes>5*1024*1024||! /^[a-f0-9]{64}$/.test(b.sha256))throw Error('DOWNLOAD_INVALID');
    const text=await download(b.catalogPath);
    if(new TextEncoder().encode(text).byteLength!==b.sizeBytes||await hash(text)!==b.sha256)throw Error('HASH_OR_SIZE_INVALID');
    const catalog=validateCatalog(JSON.parse(text));
    if(catalog.releaseId!==b.releaseId)throw Error('RELEASE_MISMATCH');
    validatePublicCatalog(catalog,now);
    await saveCatalog(catalog);await saveSafety(safety);return {catalog,safety};
  }catch{return next;}
}
