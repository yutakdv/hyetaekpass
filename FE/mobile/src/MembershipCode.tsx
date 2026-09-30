import React,{useEffect,useMemo,useRef,useState} from 'react';
import {AccessibilityInfo,BackHandler,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {SvgXml} from 'react-native-svg';
import type {WalletItem} from '../../../contracts/types.ts';
import type {MembershipCodeData} from './model.ts';
import {membershipCodeSvg,validateMembershipCode} from './membership.ts';

export interface MembershipCodeProps {
  wallet:WalletItem;
  code:MembershipCodeData|null;
  onSave:(code:MembershipCodeData)=>Promise<void>;
  onRemove:()=>Promise<void>;
  onClose:()=>void;
}

export default function MembershipCode({wallet,code,onSave,onRemove,onClose}:MembershipCodeProps){
  const [saved,setSaved]=useState(code);
  const [editing,setEditing]=useState(!code);
  const [format,setFormat]=useState<MembershipCodeData['format']>(code?.format??'QR');
  const [value,setValue]=useState(code?.value??'');
  const [label,setLabel]=useState(code?.label??wallet.name);
  const [confirmed,setConfirmed]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const [removeConfirm,setRemoveConfirm]=useState(false);
  const [discardConfirm,setDiscardConfirm]=useState(false);
  const [displayWidth,setDisplayWidth]=useState(260);
  const running=useRef(false);

  useEffect(()=>{
    setSaved(code);setEditing(!code);setFormat(code?.format??'QR');setValue(code?.value??'');
    setLabel(code?.label??wallet.name);setConfirmed(false);setError('');setMessage('');
    setRemoveConfirm(false);setDiscardConfirm(false);
  },[wallet.id,code?.format,code?.value,code?.label,code?.updatedAt]);

  const dirty=editing&&(value!==(saved?.value??'')||format!==(saved?.format??'QR')||label!==(saved?.label??wallet.name)||confirmed);
  function back(){
    if(running.current)return;
    if(removeConfirm){setRemoveConfirm(false);return;}
    if(dirty){setDiscardConfirm(true);return;}
    if(editing&&saved){setEditing(false);setError('');return;}
    onClose();
  }
  useEffect(()=>{
    const subscription=BackHandler.addEventListener('hardwareBackPress',()=>{back();return true;});
    return()=>subscription.remove();
  },[dirty,editing,saved,removeConfirm,onClose]);

  const rendered=useMemo(()=>{
    if(!saved||saved.walletId!==wallet.id||wallet.kind!=='MEMBERSHIP')return {svg:'',error:''};
    try{return {svg:membershipCodeSvg(saved),error:''};}
    catch{return {svg:'',error:'저장한 코드를 표시하지 못했어요. 원래 코드와 형식을 확인해 주세요.'};}
  },[saved,wallet.id,wallet.kind]);

  async function save(){
    if(running.current)return;
    try{validateMembershipCode(wallet.kind,format,value);}
    catch(e){const text=e instanceof Error?e.message:'코드 형식과 입력 내용을 확인해 주세요.';setError(text);AccessibilityInfo.announceForAccessibility(text);return;}
    if(!confirmed){setError('멤버십 전용 코드인지 확인해 주세요. 카드번호나 결제용 QR은 저장할 수 없어요.');return;}
    const next:MembershipCodeData={walletId:wallet.id,format,value,label:label.trim()||wallet.name,updatedAt:new Date().toISOString()};
    running.current=true;setBusy(true);setError('');setMessage('');
    try{
      await onSave(next);setSaved(next);setEditing(false);setConfirmed(false);setDiscardConfirm(false);
      setMessage('멤버십 코드를 이 기기에 저장했어요.');AccessibilityInfo.announceForAccessibility('멤버십 코드를 저장했어요.');
    }catch{
      setError('코드를 저장하지 못했어요. 입력을 유지했으니 다시 저장해 주세요.');
    }finally{running.current=false;setBusy(false);}
  }
  async function remove(){
    if(running.current)return;
    running.current=true;setBusy(true);setError('');
    try{
      await onRemove();setSaved(null);setValue('');setFormat('QR');setLabel(wallet.name);
      setConfirmed(false);setRemoveConfirm(false);setEditing(true);setMessage('이 기기의 멤버십 코드를 삭제했어요.');
      AccessibilityInfo.announceForAccessibility('멤버십 코드를 삭제했어요.');
    }catch{setError('코드를 삭제하지 못했어요. 저장된 코드를 유지했으니 다시 시도해 주세요.');}
    finally{running.current=false;setBusy(false);}
  }
  function edit(){setEditing(true);setFormat(saved?.format??'QR');setValue(saved?.value??'');setLabel(saved?.label??wallet.name);setConfirmed(false);setError('');setMessage('');}
  function action(title:string,onPress:()=>void,danger=false,secondary=false){
    return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{disabled:busy}} disabled={busy} onPress={onPress} style={[s.action,secondary?s.secondary:danger?s.danger:s.primary,busy&&{opacity:.55}]}>
      <Text style={[s.actionText,secondary&&{color:'#086653'}]}>{title}</Text>
    </Pressable>;
  }

  return <ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
    {action('뒤로',back,false,true)}
    <Text accessibilityRole="header" style={s.title}>멤버십 코드</Text>
    <Text style={s.body}>{wallet.name}</Text>
    {wallet.kind!=='MEMBERSHIP'?<>
      <Text style={s.body}>멤버십 수단에만 바코드·QR을 등록할 수 있어요. 카드번호나 결제용 코드는 등록하지 않아요.</Text>
    </>:<>
      {!!error&&<Text accessibilityLiveRegion="polite" style={s.error}>{error}</Text>}
      {!!message&&<Text accessibilityLiveRegion="polite" style={s.note}>{message}</Text>}
      {discardConfirm?<View style={s.card}>
        <Text accessibilityRole="header" style={s.subtitle}>작성한 내용을 취소할까요?</Text>
        <Text style={s.body}>아직 저장하지 않은 입력은 사라져요. 기존에 저장한 코드는 유지해요.</Text>
        {action('계속 작성',()=>setDiscardConfirm(false),false,true)}
        {action('작성 취소',()=>{setDiscardConfirm(false);if(saved){edit();setEditing(false);}else onClose();},true)}
      </View>:editing?<>
        <Text style={s.body}>공식 멤버십의 적립·사용 코드를 직접 등록해 매장에서 보여주세요.</Text>
        <Text style={s.note}>카드번호·결제 QR은 등록하지 마세요. 실시간으로 바뀌는 코드는 공식 앱을 사용해 주세요.</Text>
        <Text style={s.label}>코드 이름</Text>
        <TextInput accessibilityLabel="멤버십 코드 이름" value={label} onChangeText={setLabel} editable={!busy} maxLength={60} style={s.input}/>
        <Text style={s.label}>원래 코드의 형식</Text>
        <View style={s.formats}>{(['QR','CODE128','EAN13'] as const).map(option=><Pressable key={option} accessibilityRole="radio" accessibilityLabel={option==='QR'?'QR 코드':option==='CODE128'?'CODE128 바코드':'EAN13 바코드'} accessibilityState={{selected:format===option,disabled:busy}} disabled={busy} onPress={()=>{setFormat(option);setError('');}} style={[s.format,format===option&&s.selected]}><Text style={[s.body,format===option&&{color:'#fff'}]}>{option}</Text></Pressable>)}</View>
        <Text style={s.label}>멤버십 코드 값</Text>
        <TextInput accessibilityLabel="멤버십 코드 값" value={value} onChangeText={setValue} editable={!busy} autoCapitalize="none" autoCorrect={false} spellCheck={false} keyboardType={format==='EAN13'?'number-pad':'default'} multiline={format==='QR'} maxLength={1024} style={[s.input,format==='QR'&&{minHeight:100,textAlignVertical:'top'}]}/>
        <Text style={s.note}>{format==='QR'?'QR은 UTF-8 기준 최대 512바이트예요.':format==='CODE128'?'영문·숫자·기호 최대 80자예요.':'체크 숫자를 포함해 숫자 13자리를 입력해 주세요.'}</Text>
        <Pressable accessibilityRole="checkbox" accessibilityState={{checked:confirmed,disabled:busy}} accessibilityLabel="카드번호나 결제 QR이 아닌 멤버십 전용 코드임을 확인" disabled={busy} onPress={()=>setConfirmed(previous=>!previous)} style={s.confirm}>
          <Text style={s.body}>{confirmed?'☑':'☐'} 카드번호나 결제 QR이 아닌 멤버십 전용 코드예요.</Text>
        </Pressable>
        {action(busy?'저장 중…':'이 기기에 코드 저장',()=>void save())}
        {saved&&action('수정 취소',back,false,true)}
      </>:<>
        <Text accessibilityRole="header" style={s.subtitle}>{saved?.label||wallet.name}</Text>
        <Text style={s.body}>매장에 이 화면을 보여주세요.</Text>
        <Text style={s.note}>직접 등록한 멤버십 코드 · {saved?.format}</Text>
        {!!rendered.svg&&<View style={s.code} onLayout={event=>setDisplayWidth(Math.max(1,event.nativeEvent.layout.width-32))} accessible accessibilityRole="image" accessibilityLabel={`${wallet.name} 멤버십 ${saved?.format==='QR'?'QR 코드':'바코드'}`}>
          <SvgXml xml={rendered.svg} width={Math.min(420,displayWidth)} height={saved?.format==='QR'?Math.min(420,displayWidth):160} preserveAspectRatio="xMidYMid meet"/>
        </View>}
        {!!rendered.error&&<Text accessibilityLiveRegion="polite" style={s.error}>{rendered.error}</Text>}
        <Text style={s.label}>직접 입력한 코드 값</Text>
        <Text selectable style={s.value}>{saved?.value}</Text>
        <Text style={s.note}>이 앱은 코드의 만료기간을 정하거나 포인트를 자동 조회하지 않아요. 현재 코드와 포인트 상태는 공식 멤버십에서 확인해 주세요.</Text>
        <Text style={s.note}>실제 매장 스캐너로 읽히는지는 아직 확인하지 않았어요.</Text>
        {removeConfirm?<View style={s.card}>
          <Text accessibilityRole="header" style={s.subtitle}>이 기기의 코드를 삭제할까요?</Text>
          <Text style={s.body}>멤버십 수단과 내 조건은 유지돼요. 코드만 이 기기에서 삭제해요.</Text>
          {action('삭제 취소',()=>setRemoveConfirm(false),false,true)}
          {action('코드 삭제',()=>void remove(),true)}
        </View>:<>
          {action('코드 수정',edit,false,true)}
          {action('코드 삭제',()=>setRemoveConfirm(true),true)}
        </>}
      </>}
      <Text style={s.note}>코드는 이 기기에만 보관하고 서버·제보로 보내지 않아요.</Text>
    </>}
  </ScrollView>;
}

const s=StyleSheet.create({
  page:{padding:20,gap:12,backgroundColor:'#F6F8F3',flexGrow:1},
  title:{fontSize:28,lineHeight:36,fontWeight:'700',color:'#192D26'},
  subtitle:{fontSize:21,lineHeight:29,fontWeight:'700',color:'#192D26'},
  body:{fontSize:17,lineHeight:26,color:'#192D26'},
  note:{fontSize:14,lineHeight:22,color:'#52635A'},
  label:{fontSize:16,lineHeight:24,fontWeight:'600',color:'#192D26'},
  input:{minHeight:48,borderWidth:1,borderColor:'#718077',borderRadius:12,padding:12,fontSize:17,lineHeight:25,color:'#192D26',backgroundColor:'#fff'},
  formats:{flexDirection:'row',flexWrap:'wrap',gap:8},
  format:{minHeight:48,minWidth:78,flexGrow:1,alignItems:'center',justifyContent:'center',padding:10,borderWidth:1,borderColor:'#718077',borderRadius:12},
  selected:{backgroundColor:'#086653',borderColor:'#086653'},
  confirm:{minHeight:48,paddingVertical:8},
  action:{minHeight:48,padding:12,borderRadius:12,alignItems:'center',justifyContent:'center'},
  primary:{backgroundColor:'#086653'},secondary:{backgroundColor:'#fff',borderWidth:1,borderColor:'#718077'},danger:{backgroundColor:'#B3261E'},
  actionText:{fontSize:17,lineHeight:25,fontWeight:'600',color:'#fff',textAlign:'center'},
  card:{padding:16,gap:12,borderRadius:16,backgroundColor:'#fff',borderWidth:1,borderColor:'#718077'},
  code:{alignSelf:'stretch',alignItems:'center',padding:16,backgroundColor:'#fff',borderWidth:1,borderColor:'#718077',borderRadius:12},
  value:{fontSize:17,lineHeight:26,color:'#000',backgroundColor:'#fff',padding:12,borderRadius:8,flexShrink:1},
  error:{fontSize:16,lineHeight:24,color:'#B3261E'},
});
