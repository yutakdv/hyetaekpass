import {Platform} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import * as Crypto from 'expo-crypto';
import {File,Paths} from 'expo-file-system';
import {validateCatalog, evaluateNotification, ruleAvailable, safetyValid, kstDay} from '../../../packages/benefit-core/src/index.ts';
import type {CacheState, Catalog, Safety, LocationObservation, Place} from '../../../contracts/types.ts';
import {emptyLocal, normalizeLocal, type LocalData} from './model.ts';
import {sampleClock,runSerial,initializeInstallation,type ClockAnchor,type SerialState} from './runtime-safety.ts';
import {readProtected,writeProtected,removeProtected,type KeyStore} from './protected.ts';
const prefix='hyetaekpass.';
const opts={keychainAccessible:SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY};
const store:KeyStore={get:async key=>Platform.OS==='web'?localStorage.getItem(prefix+key):SecureStore.getItemAsync(prefix+key,opts),set:async(key,value)=>{if(Platform.OS==='web')localStorage.setItem(prefix+key,value);else await SecureStore.setItemAsync(prefix+key,value,opts);},remove:async key=>{if(Platform.OS==='web')localStorage.removeItem(prefix+key);else await SecureStore.deleteItemAsync(prefix+key,opts);}};
let localQueue:Promise<void>=Promise.resolve();
export function saveLocal(data:LocalData):Promise<void>{const validated=normalizeLocal(data);const task=localQueue.then(()=>writeProtected(store,'local',validated));localQueue=task.catch(()=>{});return task;}
export async function loadLocal():Promise<LocalData>{return normalizeLocal(await readProtected(store,'local'));}
export async function initializeStorage():Promise<void>{
  if(Platform.OS==='web')return;
  // Caches are excluded from backup. Eviction deliberately clears protected state rather than restoring consent.
  const marker=new File(Paths.cache,'hyetaekpass-install-v2');
  await initializeInstallation(marker.exists,stopNative,async()=>{await removeProtected(store,'local');await removeProtected(store,'safety');await clearCatalog();await store.remove('notice');},()=>marker.write('installation-v2'));
}
export async function loadCache():Promise<CacheState>{
  const saved=await readProtected(store,'safety') as Safety|null;const safety=saved?{...saved,receivedAt:Number.NEGATIVE_INFINITY}:null;
  const bank=await store.get('catalog.active');let catalog:Catalog|null=null;
  if(bank==='a'||bank==='b'){try{const text=Platform.OS==='web'?await store.get('catalog.'+bank):await new File(Paths.cache,'hyetaekpass-catalog-'+bank+'.json').text();if(text)catalog=validateCatalog(JSON.parse(text));}catch{catalog=null;}}return {catalog,safety};
}
export const saveSafety=(s:Safety)=>writeProtected(store,'safety',s);
export async function saveCatalog(c:Catalog):Promise<void>{const bank=await store.get('catalog.active')==='a'?'b':'a';const text=JSON.stringify(c);if(Platform.OS==='web')await store.set('catalog.'+bank,text);else new File(Paths.cache,'hyetaekpass-catalog-'+bank+'.json').write(text);await store.set('catalog.active',bank);}
async function clearCatalog(){await store.remove('catalog.active');for(const bank of ['a','b']){if(Platform.OS==='web')await store.remove('catalog.'+bank);else{const f=new File(Paths.cache,'hyetaekpass-catalog-'+bank+'.json');if(f.exists)f.delete();}}}
export const digest=(text:string)=>Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256,text);
export const id=()=>Crypto.randomUUID();
export function apiBase():string {const value=process.env.EXPO_PUBLIC_API_URL??'http://127.0.0.1:8080';const url=new URL(value);const loopback=['127.0.0.1','localhost','[::1]'];const localWeb=Platform.OS==='web'&&typeof window!=='undefined'&&loopback.includes(window.location.hostname)&&loopback.includes(url.hostname);if(url.username||url.password||!['https:','http:'].includes(url.protocol)||(url.protocol!=='https:'&&(process.env.APP_ENV==='production'||(Platform.OS==='web'?!localWeb:!__DEV__&&process.env.EXPO_PUBLIC_VALIDATION_BUILD!=='true'))))throw Error('운영 연결은 HTTPS 주소가 필요해요.');return url.origin;}
export async function request(path:string,options:RequestInit={}):Promise<Response>{const response=await fetch(apiBase()+path,{...options,signal:AbortSignal.timeout(10000),headers:{'Content-Type':'application/json',...options.headers}});if(!response.ok){let message='연결 상태를 확인하고 다시 시도해 주세요.';try{const error=await response.json();if(typeof error.message==='string')message=error.message;}catch{}throw Error(message);}return response;}
const taskName='hyetaekpass-geofence';
let runtime:CacheState={catalog:null,safety:null};let walletIds:string[]=[];let watch:Location.LocationSubscription|null=null;
let clock:ClockAnchor|null=null,clockPaused=true;
const delivery:SerialState={generation:0,tail:Promise.resolve()};
const candidates=new Map<string,{startedAt:number;observations:LocationObservation[]}>();
export function pauseNative():void{delivery.generation++;candidates.clear();watch?.remove();watch=null;}
export function runtimeTime():{now:number;trusted:boolean}{const now=Date.now();const trusted=sampleClock(clock,now,performance.now());if(!trusted&&!clockPaused){clockPaused=true;pauseNative();void stopNative().catch(()=>{});}return {now,trusted};}
export function confirmRuntimeClock(attempt:ClockAnchor,confirmedAt:number):boolean{if(confirmedAt!==attempt.wall||!sampleClock(attempt,Date.now(),performance.now()))return false;clock=attempt;clockPaused=false;return true;}
export function setNativeCatalog(cache:CacheState,ids:string[]){runtime=cache;walletIds=ids;}
function observation(location:Location.LocationObject):LocationObservation{return {latitude:location.coords.latitude,longitude:location.coords.longitude,accuracy:location.coords.accuracy??Number.POSITIVE_INFINITY,speed:location.coords.speed,timestamp:location.timestamp};}
async function permissions(){const [foreground,background,notification]=await Promise.all([Location.getForegroundPermissionsAsync(),Location.getBackgroundPermissionsAsync(),Notifications.getPermissionsAsync()]);return {location:foreground.granted&&background.granted,notification:notification.granted};}
function verdict(place:Place,candidate:{startedAt:number;observations:LocationObservation[]},data:LocalData,permission:{location:boolean;notification:boolean},history:any){
  const time=runtimeTime();const now=time.now;const source=runtime.catalog?.sources.find(s=>s.id===place.sourceId);
  const hasValidBenefit=time.trusted&&!!source&&!runtime.safety?.blockedSourceIds.includes(place.sourceId)&&now<Math.min(Date.parse(source.freshUntil),Date.parse(source.rightsUntil))&&!!runtime.catalog?.rules.some(r=>r.brandId===place.brandId&&walletIds.includes(r.productId)&&!ruleAvailable(r,runtime.catalog!,runtime.safety??undefined,now));
  return evaluateNotification({now,platform:Platform.OS==='ios'?'ios':'android',mode:'STRICT',place,observations:candidate.observations,candidateStartedAt:candidate.startedAt,consent:data.consent.background&&data.consent.location,advertisingConsent:data.consent.advertising,locationPermission:permission.location,notificationPermission:permission.notification,safety:time.trusted?runtime.safety:null,hasValidBenefit,day:history.day??'',dayCount:history.count??0,lastBrandAt:history.brands?.[place.brandId]??null,lastPlaceAt:history.places?.[place.id]??null});
}
function examine(place:Place,location:Location.LocationObject):Promise<void>{
  const candidate=candidates.get(place.id);if(!candidate)return Promise.resolve();
  return runSerial(delivery,async valid=>{
    const current=()=>valid()&&candidates.get(place.id)===candidate&&runtimeTime().trusted;
    if(!current())return;candidate.observations.push(observation(location));candidate.observations=candidate.observations.slice(-6);
    const [data,permission]=await Promise.all([loadLocal(),permissions()]);if(!current())return;
    const history=JSON.parse(await store.get('notice')??'{}');if(!current())return;
    const latest=runtime.catalog?.places.find(p=>p.id===place.id);if(!latest)return;
    const result=verdict(latest,candidate,data,permission,history);
    if(result.state==='READY'){
      const now=runtimeTime().now;
      const nextHistory={day:kstDay(now),count:(history.day===kstDay(now)?history.count??0:0)+1,brands:{...Object.fromEntries(Object.entries(history.brands??{}).filter(([,at])=>typeof at==='number'&&now-at<86400000)),[place.brandId]:now},places:{...Object.fromEntries(Object.entries(history.places??{}).filter(([,at])=>typeof at==='number'&&now-at<86400000)),[place.id]:now}};
      // Persist suppression before display. The serial queue prevents competing daily count writes.
      await store.set('notice',JSON.stringify(nextHistory));if(!current())return;
      const [fresh,permissionNow]=await Promise.all([loadLocal(),permissions()]);if(!current())return;
      const finalPlace=runtime.catalog?.places.find(p=>p.id===place.id);if(!finalPlace||verdict(finalPlace,candidate,fresh,permissionNow,history).state!=='READY')return;
      if(!current())return;
      await Notifications.scheduleNotificationAsync({content:{title:'혜택패스',body:'근처에서 확인할 수 있는 혜택이 있어요',data:{placeId:place.id}},trigger:null});candidates.delete(place.id);
    }else if(result.state==='EXPIRED'||result.state==='OFF')candidates.delete(place.id);
  });
}
if(Platform.OS!=='web')TaskManager.defineTask(taskName,async({data,error})=>{
  const time=runtimeTime();if(error||!data||!runtime.catalog)return;if(!time.trusted||!safetyValid(runtime.safety,time.now)){await stopNative();return;}
  const event=data as {eventType:Location.GeofencingEventType;region:{identifier:string}};const place=runtime.catalog.places.find(p=>p.id===event.region.identifier);if(!place)return;
  if(event.eventType===Location.GeofencingEventType.Exit){candidates.delete(place.id);return;}
  // ENTER alone cannot pass the engine's three actual observations over 120 seconds.
  if(!candidates.has(place.id))candidates.set(place.id,{startedAt:time.now,observations:[]});
  const candidate=candidates.get(place.id),generation=delivery.generation;
  try{const position=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Balanced});if(generation===delivery.generation&&candidates.get(place.id)===candidate)await examine(place,position);}catch{candidates.delete(place.id);}
});
export async function startPilot():Promise<void>{
  if(Platform.OS==='web')throw Error('배경 파일럿은 네이티브 development build에서 시험해 주세요.');await stopNative();const generation=delivery.generation;
  const data=await loadLocal();const platform=Platform.OS==='ios'?'ios':'android';const flag=platform==='ios'?'iosBackground':'androidBackground';const time=runtimeTime();
  if(!data.consent.location||!data.consent.background||!data.consent.advertising||!time.trusted||!safetyValid(runtime.safety,time.now)||!runtime.safety!.flags[flag])throw Error('기기·자료·동의 조건을 확인하기 전 주변 자동 알림은 OFF예요.');
  const places=runtime.catalog?.places.filter(p=>p.autoModes[platform]&&runtime.catalog!.rules.some(r=>r.brandId===p.brandId&&walletIds.includes(r.productId)&&!ruleAvailable(r,runtime.catalog!,runtime.safety??undefined,time.now))).slice(0,10)??[];
  if(!places.length)throw Error('자동 안내를 허용한 장소·유효 혜택이 없어요.');const foreground=await Location.requestForegroundPermissionsAsync();if(!foreground.granted)throw Error('위치 없이 직접 선택할 수 있어요.');const background=await Location.requestBackgroundPermissionsAsync();if(!background.granted)throw Error('배경 위치를 허용하지 않아 자동 안내를 중지했어요.');const notifications=await Notifications.requestPermissionsAsync();if(!notifications.granted)throw Error('알림을 허용하지 않아 앱 안에서 확인해요.');
  const fresh=await loadLocal();const latest=runtimeTime();if(generation!==delivery.generation||!fresh.consent.background||!fresh.consent.location||!fresh.consent.advertising||!latest.trusted||!safetyValid(runtime.safety,latest.now)||!runtime.safety!.flags[flag])throw Error('최신 동의·자료 상태를 다시 확인해 주세요.');
  await Location.startGeofencingAsync(taskName,places.map(p=>({identifier:p.id,latitude:p.latitude,longitude:p.longitude,radius:150,notifyOnEnter:true,notifyOnExit:true})));
  if(generation!==delivery.generation||!runtimeTime().trusted){await stopNative();return;}
  const subscription=await Location.watchPositionAsync({accuracy:Location.Accuracy.Balanced,distanceInterval:10,timeInterval:60000},location=>{for(const place of places)void examine(place,location).catch(()=>{candidates.delete(place.id);});});
  if(generation!==delivery.generation){subscription.remove();await stopNative();return;}watch=subscription;
}
export async function stopNative():Promise<void>{
  pauseNative();await delivery.tail;if(Platform.OS==='web')return;
  const failures:string[]=[];for(const [name,action] of [['지역 등록 해제',async()=>{if(await Location.hasStartedGeofencingAsync(taskName))await Location.stopGeofencingAsync(taskName);}],['위치 작업 중지',async()=>{if(await Location.hasStartedLocationUpdatesAsync('hyetaekpass-location'))await Location.stopLocationUpdatesAsync('hyetaekpass-location');}],['예약 알림 취소',()=>Notifications.cancelAllScheduledNotificationsAsync()],['표시 알림 정리',()=>Notifications.dismissAllNotificationsAsync()]] as const){try{await action();}catch{failures.push(name);}}if(failures.length)throw Error(failures.join(' · ')+' 실패');
}
export async function deleteDeviceData():Promise<void>{pauseNative();await localQueue;const off=await loadLocal().catch(()=>emptyLocal());off.consent={...off.consent,location:false,advertising:false,background:false,updatedAt:new Date().toISOString()};await saveLocal(off);await stopNative();await removeProtected(store,'local');await removeProtected(store,'safety');await clearCatalog();await store.remove('notice');runtime={catalog:null,safety:null};walletIds=[];clock=null;clockPaused=true;}
export async function foregroundPosition():Promise<Location.LocationObject>{const time=runtimeTime();if(!time.trusted||!safetyValid(runtime.safety,time.now)||!runtime.safety?.flags.foregroundLocation)throw Error('최신 시간·자료 상태를 확인해 주세요.');const existing=await Location.getForegroundPermissionsAsync();if(existing.status==='denied')throw Error('위치 권한을 거절했어요. 지역과 점포를 직접 선택해 주세요.');const permission=existing.granted?existing:await Location.requestForegroundPermissionsAsync();if(!permission.granted)throw Error('위치 없이도 확인할 수 있어요. 지역과 점포를 직접 선택해 주세요.');const position=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Balanced});const latest=runtimeTime();if(!latest.trusted||!safetyValid(runtime.safety,latest.now)||!runtime.safety?.flags.foregroundLocation)throw Error('최신 시간·자료 상태를 확인해 주세요.');return position;}
