import Ajv from 'ajv';import addFormats from 'ajv-formats';
import schema from '../../../contracts/catalog.schema.json' with {type:'json'};
import type { Catalog, Review } from '../../../contracts/types.ts';
const ajv=new Ajv({allErrors:false,strict:true});addFormats(ajv);
const validate=ajv.compile<Catalog>(schema);
const reviewed=(r:Review|undefined)=>!!r&&r.method==='HUMAN_ORIGINAL'&&r.author!==r.reviewer&&!!r.evidenceRef&&r.goldenTests.length>0;
export function validateCatalog(value:unknown):Catalog{
  if(!validate(value))throw Error('SCHEMA_INVALID');const c=value as Catalog;
  const times=[c.createdAt,...c.sources.flatMap(s=>[s.checkedAt,s.freshUntil,s.rightsUntil]),...c.rules.flatMap(r=>[r.startsAt,r.endsAt,...(r.review?[r.review.reviewedAt]:[])]),...c.combinations.flatMap(p=>p.review?[p.review.reviewedAt]:[])];
  if(times.some(t=>!Number.isFinite(Date.parse(t))))throw Error('TIME_INVALID');
  for(const list of [c.brands,c.products,c.sources,c.places,c.rules,c.combinations])if(new Set(list.map(i=>i.id)).size!==list.length)throw Error('DUPLICATE_ID');
  const has=(list:{id:string}[],id:string)=>list.some(i=>i.id===id);
  for(const source of c.sources)if(!source.url.startsWith('https://')||Date.parse(source.checkedAt)>=Date.parse(source.freshUntil)||Date.parse(source.checkedAt)>=Date.parse(source.rightsUntil))throw Error('SOURCE_INVALID');
  for(const place of c.places)if(!has(c.brands,place.brandId)||!has(c.sources,place.sourceId))throw Error('REFERENCE_INVALID');
  for(const rule of c.rules){
    if(!has(c.products,rule.productId)||!has(c.brands,rule.brandId)||!has(c.sources,rule.sourceId)||rule.placeIds.some(id=>!has(c.places,id)))throw Error('REFERENCE_INVALID');
    if(Date.parse(rule.startsAt)>=Date.parse(rule.endsAt))throw Error('PERIOD_INVALID');
    if(rule.calculation?.kind==='PERCENT'&&rule.calculation.value>10000)throw Error('RATE_INVALID');
    if((rule.status==='GUIDE_ONLY'||rule.status==='CONFLICT')&&rule.calculation)throw Error('GUIDE_CALCULATION_FORBIDDEN');
  }
  for(const pair of c.combinations)if(pair.ruleIds.some(id=>!has(c.rules,id)))throw Error('REFERENCE_INVALID');
  return c;
}
export function validatePublicCatalog(value:unknown,now:number):Catalog{
  const c=validateCatalog(value);
  if(!Number.isFinite(now)||Date.parse(c.createdAt)>now||[...c.rules,...c.combinations].some(r=>r.review&&Date.parse(r.review.reviewedAt)>now))throw Error('TIME_INVALID');
  for(const source of c.sources){const rights=source.rights;
    if(!rights.display||!rights.transform||!rights.iosDistribution||!rights.androidDistribution||!rights.offlineCache||!rights.update||!rights.revoke||!rights.evidenceRef||now>=Math.min(Date.parse(source.freshUntil),Date.parse(source.rightsUntil))||now<Date.parse(source.checkedAt))throw Error('RIGHTS_REQUIRED');
  }
  for(const rule of c.rules)if(rule.origin!=='CATALOG'||!['CATALOG_REVIEWED','GUIDE_ONLY'].includes(rule.status)||!reviewed(rule.review)||now>=Date.parse(rule.endsAt))throw Error('REVIEW_REQUIRED');
  for(const pair of c.combinations)if(pair.allowed==='TRUE'&&!reviewed(pair.review))throw Error('COMBINATION_REVIEW_REQUIRED');
  return c;
}
