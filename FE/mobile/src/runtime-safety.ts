export interface ClockAnchor {wall:number;mono:number;lastWall:number;uncertain:boolean}
export function clockAnchor(wall:number,mono:number):ClockAnchor{return {wall,mono,lastWall:wall,uncertain:!Number.isFinite(wall)||!Number.isFinite(mono)};}
export function sampleClock(anchor:ClockAnchor|null,wall:number,mono:number):boolean{
  if(!anchor)return false;
  // ponytail: 1s tolerates clock/read precision; larger drift requires a fresh server confirmation.
  if(!Number.isFinite(wall)||!Number.isFinite(mono)||wall<anchor.lastWall||mono<anchor.mono||Math.abs((wall-anchor.wall)-(mono-anchor.mono))>1000)anchor.uncertain=true;
  anchor.lastWall=wall;return !anchor.uncertain;
}
export interface SerialState {generation:number;tail:Promise<void>}
export function runSerial(state:SerialState,action:(valid:()=>boolean)=>Promise<void>):Promise<void>{const generation=state.generation;const task=state.tail.then(async()=>{if(state.generation===generation)await action(()=>state.generation===generation);});state.tail=task.catch(()=>{});return task;}
export async function initializeInstallation(markerExists:boolean,stop:()=>Promise<void>,clear:()=>Promise<void>,mark:()=>void):Promise<void>{await stop();if(!markerExists){await clear();mark();}}
