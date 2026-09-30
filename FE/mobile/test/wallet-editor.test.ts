import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {URL as NodeURL} from 'node:url';
import ts from 'typescript';
import type {WalletItem} from '../../../contracts/types.ts';
import {providerById} from '../src/providers.ts';

// Execute the real editor; replace only React/native rendering, with no UI or network.
const source=fs.readFileSync(new NodeURL('../src/ServiceUI.tsx',import.meta.url),'utf8');
const file=ts.createSourceFile('ServiceUI.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const editor=file.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='WalletEditor')!;
const code=ts.transpileModule(editor.getText(file)+'\nglobalThis.editor=WalletEditor;',
  {compilerOptions:{jsx:ts.JsxEmit.React,target:ts.ScriptTarget.ES2022}}).outputText;
interface Element {type:unknown;props:Record<string,unknown>;children:unknown[]}
function nodes(value:unknown):Element[]{
  if(Array.isArray(value))return value.flatMap(nodes);
  if(!value||typeof value!=='object')return [];
  const element=value as Element;return [element,...(element.children??[]).flatMap(nodes)];
}
function harness(wallet?:WalletItem){
  const slots:unknown[]=[];let at=0;const saved:WalletItem[]=[],errors:Record<string,string>[]=[];
  const context:Record<string,unknown>={providerById,JSON,
    React:{Fragment:'Fragment',createElement:(type:unknown,props:Element['props'],...children:unknown[])=>({type,props:props??{},children})},
    useState:(value:unknown)=>{const i=at++;if(!(i in slots))slots[i]=typeof value==='function'?value():value;
      return [slots[i],(next:unknown)=>{slots[i]=typeof next==='function'?next(slots[i]):next;}];},
    useRef:(value:unknown)=>{const i=at++;return slots[i]??(slots[i]={current:value});},useEffect:()=>{},
    Keyboard:{dismiss(){}},s:{},c:{green:'#000'},View:'View',Text:'Text',Body:'Body',Ionicons:'Icon',Choices:'Choices',Field:'Field',Button:'Button',Card:'Card',Heading:'Heading'};
  vm.runInNewContext(code,context);
  const props={p:{cache:{catalog:null},benefits:[]},wallet,providerId:'NAVER_PLUS',pending:false,dirty(){},
    validate:(value:Record<string,string>)=>errors.push(value),save:(item:WalletItem)=>saved.push(item)};
  const control=(type:string,label:string)=>{at=0;const tree=(context.editor as (props:unknown)=>unknown)(props);
    const element=nodes(tree).find(n=>n.type===type&&n.props.label===label);assert.ok(element,`${type}: ${label}`);return element.props;};
  return {saved,errors,
    changeKind:()=>(control('Choices','수단 종류').onChange as (value:string)=>void)('CARD'),
    name:(value:string)=>(control('Field','카드 상품 이름').onChange as (value:string)=>void)(value),
    save:()=>(control('Button','내 지갑에 저장').onPress as ()=>void)()};
}
test('membership provider label cannot satisfy a card product name after kind change',()=>{
  const h=harness();h.changeKind();h.save();
  assert.equal(h.saved.length,0);assert.match(h.errors[0]['wallet.name'],/실제 상품 이름/);
  h.name('내가 직접 입력한 카드 상품');h.save();
  assert.equal(h.saved.length,1);assert.equal(h.saved[0].kind,'CARD');
  assert.equal(h.saved[0].name,'내가 직접 입력한 카드 상품');assert.equal(h.saved[0].providerId,undefined);
});
test('kind change preserves an existing custom wallet name',()=>{
  const h=harness({id:'custom',name:'직접 입력한 보유 수단',kind:'MEMBERSHIP',tier:'모름',productVersion:null});
  h.changeKind();h.save();assert.equal(h.saved[0].name,'직접 입력한 보유 수단');assert.equal(h.saved[0].providerId,undefined);
});
