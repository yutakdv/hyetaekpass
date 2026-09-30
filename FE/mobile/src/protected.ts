import {splitProtectedText} from './model.ts';
export interface KeyStore {get(key:string):Promise<string|null>;set(key:string,value:string):Promise<void>;remove(key:string):Promise<void>}
export async function readProtected(store:KeyStore,name:string):Promise<unknown>{
  const bank=await store.get(name+'.active');if(bank===null)return null;if(bank!=='a'&&bank!=='b')throw Error('저장 포인터가 손상됐어요.');
  const count=Number(await store.get(name+'.'+bank+'.count'));if(!Number.isSafeInteger(count)||count<1||count>128)throw Error('저장 조각 수가 손상됐어요.');
  let text='';for(let i=0;i<count;i++){const chunk=await store.get(name+'.'+bank+'.'+i);if(chunk===null)throw Error('저장 일부를 읽지 못했어요.');text+=chunk;}return JSON.parse(text);
}
export async function writeProtected(store:KeyStore,name:string,value:unknown):Promise<void>{
  const chunks=splitProtectedText(JSON.stringify(value));const bank=await store.get(name+'.active')==='a'?'b':'a';
  for(let i=0;i<chunks.length;i++)await store.set(name+'.'+bank+'.'+i,chunks[i]);await store.set(name+'.'+bank+'.count',String(chunks.length));await store.set(name+'.active',bank);
}
export async function removeProtected(store:KeyStore,name:string):Promise<void>{
  await store.remove(name+'.active');for(const bank of ['a','b']){await store.remove(name+'.'+bank+'.count');for(let i=0;i<128;i++)await store.remove(name+'.'+bank+'.'+i);}
}
