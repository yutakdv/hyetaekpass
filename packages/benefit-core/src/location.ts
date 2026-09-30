import type { NotificationInput } from '../../../contracts/types.ts';import {safetyValid} from './sync.ts';
export function kstDay(now:number):string{return new Date(now+9*3600000).toISOString().slice(0,10);}
export function kstMonth(now:number):string{return kstDay(now).slice(0,7);}
export function distanceMeters(a:{latitude:number;longitude:number},b:{latitude:number;longitude:number}):number{
  for(const p of [a,b])if(!Number.isFinite(p.latitude)||!Number.isFinite(p.longitude)||Math.abs(p.latitude)>90||Math.abs(p.longitude)>180)throw Error('COORDINATE_INVALID');
  const rad=(n:number)=>n*Math.PI/180;const dl=rad(b.latitude-a.latitude),dn=rad(b.longitude-a.longitude);
  const h=Math.sin(dl/2)**2+Math.cos(rad(a.latitude))*Math.cos(rad(b.latitude))*Math.sin(dn/2)**2;
  return 6371000*2*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));
}
export function evaluateNotification(x:NotificationInput):{state:'READY'|'OFF'|'EXPIRED'|'HOLD';reason:string}{
  const result=(state:'READY'|'OFF'|'EXPIRED'|'HOLD',reason:string)=>({state,reason});
  if(!x.consent||!x.advertisingConsent||!x.locationPermission||!x.notificationPermission||!x.hasValidBenefit||!safetyValid(x.safety,x.now)||!x.safety!.flags.catalog||!x.safety!.flags[x.platform==='ios'?'iosBackground':'androidBackground']||!x.place.autoModes[x.platform]||(x.mode==='AREA'&&(!x.safety!.flags.area||!x.place.autoModes.area)))return result('OFF','GATE_CLOSED');
  const age=x.now-x.candidateStartedAt;if(age<0||age>=300000)return result('EXPIRED','CANDIDATE_EXPIRED');
  const hour=new Date(x.now+9*3600000).getUTCHours();
  if(hour>=21||hour<8)return result('EXPIRED','QUIET_HOURS');
  if(x.day===kstDay(x.now)&&x.dayCount>=2)return result('HOLD','DAILY_LIMIT');
  for(const last of [x.lastBrandAt,x.lastPlaceAt])if(last!==null&&(x.now<last||x.now-last<86400000))return result('HOLD','COOLDOWN');
  const obs=x.observations;
  if(!obs.length)return result('HOLD','OBSERVATION_REQUIRED');
  for(let i=0;i<obs.length;i++){const o=obs[i];if(!Number.isFinite(o.timestamp)||o.timestamp>x.now||o.timestamp<x.candidateStartedAt||!Number.isFinite(o.accuracy)||o.accuracy<0||o.accuracy>50||(o.speed!==null&&(!Number.isFinite(o.speed)||o.speed<0)))return result('HOLD','OBSERVATION_INVALID');
    try{if(distanceMeters(o,x.place)+o.accuracy>150)return result('HOLD','OUTSIDE_CONSERVATIVE_RADIUS');}catch{return result('HOLD','OBSERVATION_INVALID');}
    if(i&&(o.timestamp<=obs[i-1].timestamp||o.timestamp-obs[i-1].timestamp>60000))return result('EXPIRED','OBSERVATION_GAP');
  }
  if(x.now-obs.at(-1)!.timestamp>30000)return result('HOLD','STALE_LOCATION');
  if(x.mode==='STRICT'&&(obs.length<3||obs.at(-1)!.timestamp-obs[0].timestamp<120000))return result('HOLD','ACTUAL_OBSERVATION_REQUIRED');
  return result('READY','NEARBY_CHECK_ONLY');
}
