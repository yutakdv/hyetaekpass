import React,{useEffect,useMemo,useRef,useState} from 'react';
import {AccessibilityInfo,AppState,Linking,Platform,Text} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {calculate,distanceMeters,kstMonth,safetyValid,syncCatalog} from '../../packages/benefit-core/src/index.ts';
import type {CacheState,Catalog,RuleConditions} from '../../contracts/types.ts';
import empty from '../../contracts/empty-catalog.json';
import {emptyLocal,normalizeLocal,parseWon,personalCatalog,unknownConditions,updateWallet,submitReportSafely,type ReportReceipt,type LocalData} from './src/model.ts';
import {apiBase,deleteDeviceData,digest,foregroundPosition,id,initializeStorage,loadCache,loadLocal,request,saveCatalog,saveLocal,saveSafety,setNativeCatalog,stopNative,pauseNative,runtimeTime,confirmRuntimeClock} from './src/native.ts';
import {clockAnchor} from './src/runtime-safety.ts';
import {benefitEntries,compareWallet,createWriteQueue,personalDraftToRule,saveReference,visiblePlaces} from './src/service.ts';
import ServiceUI from './src/ServiceUI.tsx';
import MembershipCode from './src/MembershipCode.tsx';
import {validateMembershipCode} from './src/membership.ts';
import {providerById,providerUrl} from './src/providers.ts';
import type {BenefitEntry,CheckDraft,CheckOutcome,PublicStatus,ServiceActions} from './src/serviceTypes.ts';

const blankCheck=(origin:CheckDraft['origin']='PERSONAL'):CheckDraft=>({origin,brandId:'',placeId:'',channel:'OFFLINE',productIds:[],compareAll:true,amount:'',eligibleAmount:'',answers:{}});
export default function App(){
  const writes=useRef(createWriteQueue()).current,clearing=useRef(false),refreshFlight=useRef<Promise<void>|null>(null);
  const localRef=useRef(emptyLocal()),cacheRef=useRef<CacheState>({catalog:null,safety:null});
  const [data,setData]=useState(localRef.current),[cache,setCache]=useState(cacheRef.current),[loaded,setLoaded]=useState(false);
  const [refreshing,setRefreshing]=useState(false),[offline,setOffline]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const [wallNow,setWallNow]=useState(()=>runtimeTime().now),[resetKey,setResetKey]=useState(0),[pendingReceipt,setPendingReceipt]=useState<ReportReceipt|null>(null);
  const [demo,setDemo]=useState<Catalog|null>(null),[demoNow,setDemoNow]=useState(0),[check,setCheck]=useState<CheckDraft>(blankCheck),[evaluated,setEvaluated]=useState(false);
  const answerContext=useRef(''),[nearby,setNearby]=useState<{id:string;name:string;distance:number}[]>([]);
  const now=demo?demoNow:wallNow,clock=runtimeTime();
  const personal=useMemo(()=>personalCatalog(data,now),[data,now]);
  const catalog=check.origin==='DEMO'?(demo??empty as Catalog):check.origin==='PERSONAL'?personal:(cache.catalog??empty as Catalog);
  const context=kstMonth(now)+'|'+catalog.rules.map(r=>r.id+':'+r.version).join('|')+'|'+data.wallet.map(w=>w.id+':'+w.kind+':'+w.tier+':'+w.productVersion+':'+w.providerId).join('|');
  const effectiveCheck=answerContext.current===context?check:{...check,answers:{}};
  function setLocal(next:LocalData){localRef.current=next;setData(next);}
  function setCurrentCache(next:CacheState){cacheRef.current=next;setCache(next);}
  async function mutate(change:(current:LocalData)=>LocalData,expected=writes.generation()){
    if(clearing.current)throw Error('단말 자료를 삭제하고 있어요. 잠시 기다려 주세요.');
    return writes.run(async()=>{const next=normalizeLocal(change(localRef.current));await saveLocal(next);setLocal(next);},expected);
  }
  async function perform<T>(work:()=>Promise<T>):Promise<T>{
    setError('');try{return await work();}catch(e){const message=e instanceof Error?e.message:'다시 시도해 주세요.';setError(message);AccessibilityInfo.announceForAccessibility(message);throw e;}
  }
  async function refresh():Promise<void>{
    if(clearing.current)return;if(refreshFlight.current)return refreshFlight.current;
    const generation=writes.generation();setRefreshing(true);
    const task=(async()=>{
      try{
        const bootstrap=await (await request('/v1/bootstrap')).json();if(generation!==writes.generation())return;
        const attempt=clockAnchor(Date.now(),performance.now()),current=cacheRef.current;let safetyWrites=0;
        const next=await syncCatalog(current,bootstrap,async path=>(await request(path)).text(),digest,
          safety=>writes.run(async()=>{await saveSafety(safety);safetyWrites++;const interim={...cacheRef.current,safety};setCurrentCache(interim);setNativeCatalog(interim,localRef.current.wallet.filter(w=>w.productVersion!==null).map(w=>w.id));if(!safety.flags.catalog||!safety.flags[Platform.OS==='ios'?'iosBackground':'androidBackground'])await stopNative();},generation),
          nextCatalog=>writes.run(()=>saveCatalog(nextCatalog),generation),attempt.wall);
        await writes.run(async()=>{if(safetyWrites===2)confirmRuntimeClock(attempt,next.safety?.receivedAt??NaN);setCurrentCache(next);setOffline(false);setWallNow(runtimeTime().now);setNotice(safetyWrites===2?'최신 자료를 확인했어요.':'안전 상태를 적용했어요. 자료 갱신은 다시 시도해 주세요.');},generation);
      }catch(e){if(generation!==writes.generation())return;setOffline(true);setNotice('연결을 확인하지 못했어요. 내 지갑과 직접 기록한 조건은 계속 사용할 수 있어요.');throw e;}
      finally{setRefreshing(false);refreshFlight.current=null;}
    })();refreshFlight.current=task;return task;
  }
  async function initialize(){
    try{await writes.run(async()=>{await initializeStorage();const local=await loadLocal(),saved=await loadCache();setLocal(local);setCurrentCache(saved);setLoaded(true);});void refresh().catch(()=>{});}
    catch{setError('저장한 내용을 불러오지 못했어요. 다시 불러오기를 눌러 주세요.');}
  }
  useEffect(()=>{void initialize();},[]);
  useEffect(()=>{const timer=setInterval(()=>setWallNow(runtimeTime().now),1000);return()=>clearInterval(timer);},[]);
  useEffect(()=>{setNativeCatalog(cache,data.wallet.filter(w=>w.productVersion!==null).map(w=>w.id));},[cache,data.wallet]);
  const expired=useRef(true);
  useEffect(()=>{const valid=clock.trusted&&safetyValid(cache.safety,wallNow)&&!!cache.safety?.flags.catalog;if(!valid&&!expired.current){pauseNative();setNearby([]);void stopNative().catch(()=>setError('위치 작업 정리를 다시 시도해 주세요.'));}expired.current=!valid;},[wallNow,cache.safety,clock.trusted]);
  useEffect(()=>{const listener=AppState.addEventListener('change',state=>{if(state==='active'&&loaded&&!clearing.current)void refresh().catch(()=>{});});return()=>listener.remove();},[loaded]);
  const benefits=useMemo(()=>demo?benefitEntries(demo,'DEMO',data,demoNow):[...benefitEntries(personal,'PERSONAL',data,now),...benefitEntries(cache.catalog??empty as Catalog,'PUBLIC',data,now,cache.safety??undefined,clock.trusted)],[data,personal,cache,now,demo,demoNow,clock.trusted]);
  function resolveReference(ref:{origin:'PUBLIC'|'PERSONAL';id:string}):BenefitEntry{
    return benefits.find(e=>e.origin===ref.origin&&e.id===ref.id)??{id:ref.id,origin:ref.origin,rule:null,brandName:'',productName:'',status:'UNAVAILABLE',statusText:'저장한 자료를 더 이상 제공하지 않아요',canCalculate:false,sourceUrl:null,sourceLabel:'자료 확인 필요',checkedAt:null};
  }
  function conditionsFor(draft:CheckDraft):Record<string,RuleConditions>{
    const relevant=catalog.rules.filter(r=>r.brandId===draft.brandId&&r.channels.includes(draft.channel)&&(draft.compareAll||draft.productIds.includes(r.productId)));
    const conditions=unknownConditions(relevant,now);
    for(const rule of relevant){const answer=draft.answers[rule.id];if(!answer)continue;const c=conditions[rule.id];
      for(const key of rule.requiredConditions)c.values[key]={value:answer.values[key]??'UNKNOWN',checkedAt:new Date(now).toISOString(),month:kstMonth(now),ruleVersion:rule.version};
      c.remainingWon=parseWon(answer.remainingWon);c.remainingUses=parseWon(answer.remainingUses);
    }return conditions;
  }
  function outcomeFor(draft:CheckDraft):CheckOutcome{
    const fields:Record<string,string>={};
    try{
      let amount:number|null;try{amount=parseWon(draft.amount);}catch{amount=null;}if(amount===null||amount<=0)fields.amount='결제 금액을 원 단위로 입력해 주세요.';
      let eligible:number|null;try{eligible=parseWon(draft.eligibleAmount);}catch{eligible=null;fields.eligibleAmount='대상 품목 금액은 원 단위로 입력해 주세요.';}
      if(amount!==null&&eligible!==null&&eligible>amount)fields.eligibleAmount='대상 품목 금액은 결제 금액 이하여야 해요.';
      if(!draft.brandId)fields.brandId='현재 매장의 브랜드를 선택해 주세요.';
      if(Object.keys(fields).length)return {result:null,error:'입력한 항목을 확인해 주세요.',fields};
      if(draft.origin==='PUBLIC'&&!clock.trusted)return {result:null,error:'최신 자료와 단말 시각을 확인한 뒤 계산할 수 있어요.'};
      if(draft.origin==='PUBLIC'&&draft.placeId&&!visiblePlaces(cache.catalog,cache.safety,now,clock.trusted).some(p=>p.id===draft.placeId))return {result:null,error:'선택한 점포 자료를 더 이상 사용할 수 없어요. 점포를 다시 선택해 주세요.'};
      const ids=draft.origin==='DEMO'?catalog.products.map(p=>p.id):data.wallet.filter(w=>draft.origin!=='PUBLIC'||w.productVersion!==null).map(w=>w.id);
      const input={amountWon:amount!,...(eligible===null?{}:{eligibleAmountWon:eligible}),brandId:draft.brandId,placeId:draft.placeId,channel:draft.channel,productIds:draft.compareAll?ids:draft.productIds.filter(pid=>ids.includes(pid)),catalog,conditions:conditionsFor(draft),safety:draft.origin==='PUBLIC'?cache.safety??undefined:undefined,now,mode:draft.origin};
      return {result:draft.compareAll?compareWallet(input):calculate(input),error:''};
    }catch(e){return {result:null,error:e instanceof Error?e.message:'조건 입력을 확인해 주세요.'};}
  }
  const outcome=evaluated?outcomeFor(effectiveCheck):{result:null,error:''};
  const publicStatus:PublicStatus={state:refreshing?'LOADING':!clock.trusted?'UNKNOWN':!safetyValid(cache.safety,wallNow)?'EXPIRED':!cache.safety?.flags.catalog?'OFF':offline?'OFFLINE':cache.catalog?.rules.length?'READY':'EMPTY',message:refreshing?'최신 자료 확인 중':cache.catalog?.rules.length===0?'아직 제공할 혜택이 없어요. 알고 있는 조건을 직접 기록해 보세요.':!clock.trusted||!safetyValid(cache.safety,wallNow)?'최신 자료 확인이 필요해요':!cache.safety?.flags.catalog?'제공 자료 안내를 중지했어요':offline?'마지막으로 확인한 자료를 사용해요':'현재 자료로 조건을 확인할 수 있어요',lastConfirmedAt:Number.isFinite(cache.safety?.receivedAt)?cache.safety!.receivedAt:null,expiresAt:Number.isFinite(cache.safety?.receivedAt)?cache.safety!.receivedAt+86400000:null,canLocate:clock.trusted&&safetyValid(cache.safety,wallNow)&&!!cache.safety?.flags.foregroundLocation};
  async function removeReport(receipt:ReportReceipt){await request('/v1/reports/'+encodeURIComponent(receipt.id),{method:'DELETE',headers:{Authorization:'Bearer '+receipt.deleteToken}});}
  function updateCheck(next:CheckDraft){answerContext.current=context;setCheck(next);setEvaluated(false);}
  const actions:ServiceActions={
    finishOnboarding:()=>perform(()=>mutate(d=>({...d,experience:{...d.experience,onboardingDone:true}}))),
    refresh:()=>perform(refresh),retryStorage:initialize,
    saveWallet:item=>perform(async()=>{const saved={...item,id:item.id||id(),name:item.name.trim()};await mutate(d=>updateWallet(d,saved,saved.id,cacheRef.current.catalog?.rules??[]));setNotice('지갑에 저장했어요.');return saved;}),
    deleteWallet:walletId=>perform(()=>mutate(d=>updateWallet(d,null,walletId,cacheRef.current.catalog?.rules??[]))),
    setDefault:(kind,walletId)=>perform(()=>mutate(d=>{if(walletId&&!d.wallet.some(w=>w.id===walletId&&w.kind===kind))throw Error('등록한 보유 수단을 선택해 주세요.');return {...d,experience:{...d.experience,[kind==='CARD'?'defaultCard':'defaultMembership']:walletId}};})),
    saveMembershipCode:code=>perform(()=>mutate(d=>{const wallet=d.wallet.find(w=>w.id===code.walletId);validateMembershipCode(wallet?.kind??'CARD',code.format,code.value);return {...d,codes:[...d.codes.filter(c=>c.walletId!==code.walletId),{...code,updatedAt:new Date().toISOString()}]};})),
    removeMembershipCode:walletId=>perform(()=>mutate(d=>({...d,codes:d.codes.filter(c=>c.walletId!==walletId)}))),
    savePersonal:(draft,asDraft)=>perform(async()=>{const current={...draft,id:draft.id||id(),updatedAt:new Date().toISOString()};if(current.sourceUrl){const url=new URL(current.sourceUrl);if(url.protocol!=='https:'||url.username||url.password)throw Error('출처 링크는 HTTPS 웹 주소로 입력해 주세요.');}
      const rule=asDraft?null:personalDraftToRule(current,id());await mutate(d=>{if(!d.wallet.some(w=>w.id===current.productId))throw Error('연결할 보유 수단을 먼저 등록해 주세요.');const rid=current.originalRuleId??current.id;return {...d,rules:[...d.rules.filter(r=>r.id!==rid),...(rule?[rule]:[])],drafts:[...d.drafts.filter(r=>r.id!==current.id),...(asDraft?[current]:[])],conditions:Object.fromEntries(Object.entries(d.conditions).filter(([key])=>key!==rid)),ruleWrittenAt:{...Object.fromEntries(Object.entries(d.ruleWrittenAt).filter(([key])=>key!==rid)),...(rule?{[rid]:current.updatedAt}:{})},ruleSourceUrl:{...Object.fromEntries(Object.entries(d.ruleSourceUrl).filter(([key])=>key!==rid)),...(rule?{[rid]:current.sourceUrl}:{})},favorites:asDraft?d.favorites.filter(r=>r.origin!=='PERSONAL'||r.id!==rid):d.favorites,recents:asDraft?d.recents.filter(r=>r.origin!=='PERSONAL'||r.id!==rid):d.recents};});setNotice(asDraft?'작성 중인 내용을 메모로 저장했어요.':'내 조건을 저장했어요. 필요한 자격은 다시 확인해 주세요.');return {kind:asDraft?'DRAFT':'RULE',id:rule?.id??current.id};}),
    deletePersonal:rid=>perform(()=>mutate(d=>({...d,rules:d.rules.filter(r=>r.id!==rid),drafts:d.drafts.filter(r=>r.originalRuleId!==rid&&r.id!==rid),conditions:Object.fromEntries(Object.entries(d.conditions).filter(([key])=>key!==rid)),ruleWrittenAt:Object.fromEntries(Object.entries(d.ruleWrittenAt).filter(([key])=>key!==rid)),ruleSourceUrl:Object.fromEntries(Object.entries(d.ruleSourceUrl).filter(([key])=>key!==rid)),favorites:d.favorites.filter(r=>r.origin!=='PERSONAL'||r.id!==rid),recents:d.recents.filter(r=>r.origin!=='PERSONAL'||r.id!==rid)}))),
    deletePersonalDraft:rid=>perform(()=>mutate(d=>({...d,drafts:d.drafts.filter(r=>r.id!==rid)}))),
    toggleFavorite:entry=>perform(()=>{if(entry.origin==='DEMO')throw Error('가상 예시는 저장하지 않아요.');return mutate(d=>saveReference(d,entry.origin as 'PUBLIC'|'PERSONAL',entry.id,false));}),
    removeFavorite:(origin,rid)=>perform(()=>mutate(d=>({...d,favorites:d.favorites.filter(r=>r.origin!==origin||r.id!==rid)}))),
    clearRecents:()=>perform(()=>mutate(d=>({...d,recents:[]}))),
    viewBenefit:entry=>entry.origin==='DEMO'?Promise.resolve():perform(()=>mutate(d=>saveReference(d,entry.origin as 'PUBLIC'|'PERSONAL',entry.id,true))),
    updateCheck,startCheck:entry=>{const origin=entry?.origin??(demo?'DEMO':data.rules.length?'PERSONAL':'PUBLIC'),targetCatalog=origin==='PERSONAL'?personal:origin==='DEMO'?demo:cache.catalog;
      const next=blankCheck(origin);next.brandId=entry?.rule?.brandId??'';next.channel=entry?.rule?.channels[0]??'OFFLINE';next.productIds=[data.experience.defaultCard,data.experience.defaultMembership].filter((id):id is string=>!!id);
      for(const rule of targetCatalog?.rules??[]){const c=data.conditions[rule.id];if(c&&c.month===kstMonth(now)&&c.ruleVersion===rule.version)next.answers[rule.id]={values:Object.fromEntries(Object.entries(c.values).filter(([,v])=>v.month===c.month&&v.ruleVersion===rule.version&&Number.isFinite(Date.parse(v.checkedAt))&&Date.parse(v.checkedAt)<=now).map(([k,v])=>[k,v.value])),remainingWon:c.remainingWon===null?'':String(c.remainingWon),remainingUses:c.remainingUses===null?'':String(c.remainingUses)};}
      setCheck(next);answerContext.current=kstMonth(now)+'|'+(targetCatalog?.rules??[]).map(r=>r.id+':'+r.version).join('|')+'|'+data.wallet.map(w=>w.id+':'+w.kind+':'+w.tier+':'+w.productVersion+':'+w.providerId).join('|');setEvaluated(false);},
    evaluateCheck:()=>perform(async()=>{const next=outcomeFor(effectiveCheck);setEvaluated(true);if(next.error)throw Error(next.error);if(effectiveCheck.origin!=='DEMO')await mutate(d=>({...d,conditions:{...d.conditions,...conditionsFor(effectiveCheck)}}));}),
    finishCheck:()=>perform(async()=>{if(check.origin!=='DEMO')for(const rid of outcome.result?.best?.ruleIds??[])await mutate(d=>saveReference(d,check.origin as 'PUBLIC'|'PERSONAL',rid,true));updateCheck(blankCheck(demo?'DEMO':'PERSONAL'));}),
    openSource:entry=>perform(async()=>{if(!entry.sourceUrl)throw Error('확인 링크가 없어요.');const url=new URL(entry.sourceUrl);if(url.protocol!=='https:'||url.username||url.password)throw Error('안전한 공식 웹 링크를 확인해 주세요.');await Linking.openURL(url.href);}),
    openProvider:(id,purpose)=>perform(()=>Linking.openURL(providerUrl(id,purpose))),
    locate:()=>perform(async()=>{if(!publicStatus.canLocate)throw Error('현재 위치로 안내할 자료가 없어요. 매장과 브랜드를 직접 선택해 주세요.');if(!data.consent.location)throw Error('위치 사용 목적을 확인하고 선택 동의해 주세요.');const epoch=writes.generation();const position=await foregroundPosition();if(epoch!==writes.generation()||!localRef.current.consent.location)return;if(position.coords.accuracy===null||position.coords.accuracy>50||Date.now()-position.timestamp>60000)throw Error('위치가 불확실해요. 점포를 직접 선택해 주세요.');const time=runtimeTime();const places=visiblePlaces(cacheRef.current.catalog,cacheRef.current.safety,time.now,time.trusted,true);setNearby(places.map(p=>({id:p.id,name:p.name,distance:Math.round(distanceMeters(position.coords,p))})).sort((a,b)=>a.distance-b.distance).slice(0,10));}),
    setConsent:(key,value)=>perform(async()=>{if(!value){pauseNative();if(key==='location')setNearby([]);}await mutate(d=>({...d,consent:{...d.consent,[key]:value,updatedAt:new Date().toISOString()}}));if(!value)await stopNative();}),
    withdrawConsent:()=>perform(async()=>{pauseNative();await mutate(d=>({...d,consent:{...d.consent,location:false,advertising:false,background:false,updatedAt:new Date().toISOString()}}));await stopNative();setNearby([]);setNotice('선택 동의를 철회하고 작업과 알림을 정리했어요.');}),
    openSystemSettings:()=>perform(async()=>{if(Platform.OS==='web')throw Error('브라우저의 사이트 권한 설정에서 변경해 주세요.');await Linking.openSettings();}),
    deleteDevice:()=>perform(async()=>{clearing.current=true;writes.invalidate();pauseNative();try{await writes.run(async()=>{await deleteDeviceData();setLocal(emptyLocal());setCurrentCache({catalog:null,safety:null});setNearby([]);setDemo(null);setCheck(blankCheck());setEvaluated(false);setResetKey(n=>n+1);setNotice('단말 자료를 삭제했어요. 서버에 보낸 제보는 별도로 삭제해야 해요.');});if(pendingReceipt){try{await removeReport(pendingReceipt);setPendingReceipt(null);}catch{setNotice('단말 자료는 삭제했어요. 저장하지 못한 서버 제보의 삭제 토큰을 보관하고 다시 삭제해 주세요.');}}}finally{clearing.current=false;}}),
    submitReport:(input,replace)=>perform(async()=>{if(!input.message.trim()||input.message.length>2000)throw Error('제보 내용은 1~2,000자로 입력해 주세요.');const epoch=writes.generation();let replaced=false;
      try{if(replace){await removeReport(replace);replaced=true;await mutate(d=>({...d,reports:d.reports.filter(r=>r.id!==replace.id)}),epoch);}await submitReportSafely(localRef.current,async()=>({...await (await request('/v1/reports',{method:'POST',body:JSON.stringify(input)})).json(),createdAt:new Date().toISOString(),category:input.category}),incoming=>mutate(d=>({...d,reports:[...d.reports,...incoming.reports.slice(-1)]}),epoch),removeReport,setPendingReceipt);setNotice('제보를 보냈어요. 내 제보에서 삭제할 수 있어요.');}catch(e){if(replaced)throw Error('기존 제보는 삭제됐어요. 수정한 제보를 다시 보내 주세요. '+(e instanceof Error?e.message:''));throw e;}}),
    deleteReport:receipt=>perform(async()=>{await removeReport(receipt);if(pendingReceipt?.id===receipt.id)setPendingReceipt(null);try{await mutate(d=>({...d,reports:d.reports.filter(r=>r.id!==receipt.id)}));}catch{throw Error('서버 제보는 삭제됐어요. 단말의 접수 기록 정리를 다시 시도해 주세요.');}setNotice('서버 제보와 단말 접수 기록을 삭제했어요.');}),
    savePendingReport:()=>perform(async()=>{if(pendingReceipt){await mutate(d=>({...d,reports:d.reports.some(r=>r.id===pendingReceipt.id)?d.reports:[...d.reports,pendingReceipt]}));setPendingReceipt(null);}}),
    enterDemo:()=>perform(async()=>{const fixture=await import('../../packages/benefit-core/test/fixtures.ts');setDemo(fixture.catalog);setDemoNow(fixture.now);setCheck(blankCheck('DEMO'));setEvaluated(false);}),
    leaveDemo:()=>{setDemo(null);updateCheck(blankCheck());},
  };
  let endpoint='연결 설정 확인 필요';try{endpoint=apiBase();}catch{}
  const currentPlaces=data.consent.location?visiblePlaces(cache.catalog,cache.safety,wallNow,clock.trusted,true):[];
  const currentNearby=nearby.flatMap(item=>{const place=currentPlaces.find(p=>p.id===item.id);return place?[{...item,name:place.name}]:[];});
  return <SafeAreaProvider><ServiceUI local={data} cache={cache} benefits={benefits} favorites={data.favorites.map(r=>({...resolveReference(r),referencedAt:r.savedAt}))} recents={data.recents.map(r=>({...resolveReference(r),referencedAt:r.viewedAt}))} loaded={loaded} refreshing={refreshing} error={error} notice={notice} now={now} resetKey={resetKey} publicStatus={publicStatus} check={effectiveCheck} outcome={outcome} pendingReceipt={pendingReceipt} demo={!!demo} nearby={currentNearby} actions={actions} diagnostics={{apiUrl:endpoint,build:'0.3.0 쓸때 개발 빌드',details:['안전 revision: '+(cache.safety?.revision??'미확인'),'시각 근거: '+(clock.trusted?'확인':'확인 필요'),'웹 저장: 브라우저 저장소 / 네이티브: 기기 보호 저장','실물 기기·운영 배포·스토어·권리 검수는 별도 확인 필요']}} renderMembershipCode={(walletId,onClose)=>{const wallet=data.wallet.find(w=>w.id===walletId);return wallet?<MembershipCode wallet={wallet} code={data.codes.find(c=>c.walletId===walletId)??null} onSave={actions.saveMembershipCode} onRemove={()=>actions.removeMembershipCode(walletId)} onClose={onClose} onOpenOfficial={wallet.providerId?()=>actions.openProvider(wallet.providerId!,providerById(wallet.providerId)?.codeMode==='OFFICIAL'?'CODE':'BENEFITS'):undefined}/>:<Text>등록한 멤버십을 확인해 주세요.</Text>;}}/></SafeAreaProvider>;
}
