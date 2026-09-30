import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {URL as NodeURL} from 'node:url';
import ts from 'typescript';
import * as core from '../../../packages/benefit-core/src/index.ts';
import * as model from '../src/model.ts';
import * as service from '../src/service.ts';
import {validateMembershipCode} from '../src/membership.ts';
import {clockAnchor} from '../src/runtime-safety.ts';
import {now,member} from '../../../packages/benefit-core/test/fixtures.ts';
import type {ServiceUIProps} from '../src/serviceTypes.ts';

// Execute the real controller with hooks and native boundaries replaced; no UI or network runs.
const source=fs.readFileSync(new NodeURL('../App.tsx',import.meta.url),'utf8');
const file=ts.createSourceFile('App.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const app=file.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='App')!;
const blank=file.statements.find(node=>ts.isVariableStatement(node)&&node.declarationList.declarations.some(d=>d.name.getText(file)==='blankCheck'))!;
const code=ts.transpileModule(blank.getText(file)+'\n'+app.getText(file).replace(/^export default /,'')+'\nglobalThis.controller=App;',
  {compilerOptions:{jsx:ts.JsxEmit.React,target:ts.ScriptTarget.ES2022}}).outputText;

function controller(initial:model.LocalData){
  let slots:unknown[]=[],at=0,props:ServiceUIProps,persisted=structuredClone(initial),failSave=false,failDelete=false;
  let replyPost:(receipt:model.ReportReceipt)=>void=()=>{throw Error('POST has not started');};
  const calls:{path:string;method:string}[]=[],UI=()=>{};
  const useState=(value:unknown)=>{const index=at++;if(!(index in slots))slots[index]=typeof value==='function'?value():value;
    return [slots[index],(next:unknown)=>{slots[index]=typeof next==='function'?next(slots[index]):next;}];};
  const useRef=(value:unknown)=>{const index=at++;return slots[index]??(slots[index]={current:value});};
  const request=async(path:string,options:RequestInit={})=>{calls.push({path,method:options.method??'GET'});
    if(path==='/v1/bootstrap')throw Error('synthetic offline');
    if(options.method==='POST')return new Promise(resolve=>{replyPost=receipt=>resolve({json:async()=>receipt});});
    if(options.method==='DELETE'){if(failDelete)throw Error('synthetic delete failure');return {status:204};}
    throw Error('unexpected request');};
  const context:Record<string,unknown>={...core,...model,...service,validateMembershipCode,clockAnchor,
    empty:{schemaVersion:1,semanticsVersion:1,releaseId:'empty',brands:[],products:[],sources:[],places:[],rules:[],combinations:[]},
    React:{createElement:(type:unknown,p:ServiceUIProps,...children:unknown[])=>{if(type===UI)props=p;return {type,props:p,children};}},
    useState,useRef,useMemo:(fn:()=>unknown)=>fn(),useEffect:()=>{},ServiceUI:UI,MembershipCode:()=>{},SafeAreaProvider:()=>{},Text:()=>{},
    AccessibilityInfo:{announceForAccessibility(){}},AppState:{},Linking:{},Platform:{OS:'web'},apiBase:()=>'',
    runtimeTime:()=>({now,trusted:true}),initializeStorage:async()=>{},loadLocal:async()=>structuredClone(persisted),
    loadCache:async()=>({catalog:null,safety:null}),saveLocal:async(next:model.LocalData)=>{if(failSave){failSave=false;throw Error('synthetic storage failure');}persisted=structuredClone(next);},
    saveSafety:async()=>{},saveCatalog:async()=>{},setNativeCatalog(){},pauseNative(){},stopNative:async()=>{},
    deleteDeviceData:async()=>{persisted=model.emptyLocal();},digest:async()=>'',id:()=>crypto.randomUUID(),confirmRuntimeClock:()=>true,
    request,performance,Date,URL,Error};
  vm.runInNewContext(code,context);
  const render=()=>{at=0;(context.controller as ()=>unknown)();return props;};
  const flush=async()=>{await new Promise<void>(resolve=>setImmediate(resolve));return render();};
  render();return {render,flush,calls,get p(){return props;},get persisted(){return persisted;},reply:(r:model.ReportReceipt)=>replyPost(r),
    failNextSave:()=>{failSave=true;},failRemoteDelete:()=>{failDelete=true;}};
}
function personalData(){
  const data=model.emptyLocal();data.wallet=[{id:'membership',name:'시험 멤버십',kind:'MEMBERSHIP',tier:'GOLD',productVersion:null}];
  data.rules=[{...structuredClone(member),origin:'USER_INPUT',sourceId:'personal',review:undefined,status:'DRAFT'}];
  data.conditions=model.unknownConditions(data.rules,now);data.conditions.m.values.tier.value='TRUE';
  data.conditions.m.remainingWon=1000;data.conditions.m.remainingUses=1;return data;
}
async function initialized(data=personalData()){const h=controller(data);await h.p.actions.retryStorage();await h.flush();return h;}

test('real controller restores personal truth, invalidates wallet changes and stamps explicit reconfirmation',async()=>{
  const h=await initialized();h.p.actions.startCheck(h.p.benefits[0]);h.render();assert.equal(h.p.check.answers.m.values.tier,'TRUE');
  h.p.actions.updateCheck({...h.p.check,amount:'12000'});h.render();await h.p.actions.evaluateCheck();h.render();
  assert.equal(h.p.outcome.result?.best?.instantWon,1000);
  await h.p.actions.saveWallet({...h.p.local.wallet[0],tier:'SILVER'});h.render();
  assert.equal(Object.keys(h.p.check.answers).length,0);assert.equal(h.p.outcome.result?.best,null);assert.equal(h.persisted.conditions.m,undefined);
  h.p.actions.updateCheck({...h.p.check,answers:{m:{values:{tier:'TRUE'},remainingWon:'1000',remainingUses:'1'}}});h.render();
  await h.p.actions.evaluateCheck();const reconfirmed=h.render(),stored=structuredClone(h.persisted);
  assert.equal(reconfirmed.outcome.result?.best?.instantWon,1000);
  assert.equal(stored.conditions.m.values.tier.ruleVersion,'1');assert.equal(stored.conditions.m.values.tier.month,core.kstMonth(now));
  h.p.actions.startCheck(h.p.benefits[0]);h.render();assert.equal(h.p.check.answers.m.values.tier,'TRUE');
});
for(const failed of [false,true])test(`real controller compensates a POST arriving after deletion; remote failure=${failed}`,async()=>{
  const h=await initialized(),sent=h.p.actions.submitReport({category:'OTHER',message:'synthetic report'});
  const rejected=assert.rejects(sent);await h.flush();await h.p.actions.deleteDevice();h.render();
  if(failed)h.failRemoteDelete();h.reply({id:'late',deleteToken:'synthetic-token'});await rejected;h.render();
  assert.equal(h.persisted.wallet.length,0);assert.equal(h.persisted.reports.length,0);assert.equal(h.p.cache.catalog,null);
  assert.ok(h.calls.some(c=>c.path==='/v1/reports/late'&&c.method==='DELETE'));
  assert.equal(h.p.pendingReceipt?.id??null,failed?'late':null);
});
test('real controller reports old server deletion when replacement receipt cleanup fails',async()=>{
  const data=personalData(),receipt={id:'original',deleteToken:'synthetic-token'};data.reports=[receipt];
  const h=await initialized(data);h.failNextSave();
  await assert.rejects(h.p.actions.submitReport({category:'OTHER',message:'synthetic edited report'},receipt),/기존 제보는 삭제/);
  assert.ok(h.calls.some(c=>c.path==='/v1/reports/original'&&c.method==='DELETE'));
  assert.equal(h.calls.filter(c=>c.method==='POST').length,0);assert.equal(h.persisted.reports.length,1);
});
