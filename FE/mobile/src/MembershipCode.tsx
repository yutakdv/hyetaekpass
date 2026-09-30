import React,{useEffect,useMemo,useRef,useState} from 'react';
import {AccessibilityInfo,BackHandler,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {SvgXml} from 'react-native-svg';
import Ionicons from '@expo/vector-icons/Ionicons';
import type {WalletItem} from '../../../contracts/types.ts';
import type {MembershipCodeData} from './model.ts';
import {membershipCodeSvg,validateMembershipCode} from './membership.ts';
import {colors as c} from './theme.ts';

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
  const [details,setDetails]=useState(false);
  const running=useRef(false);
  const scroll=useRef<ScrollView>(null);

  useEffect(()=>{scroll.current?.scrollTo({y:0,animated:false});},[editing]);

  useEffect(()=>{
    setSaved(code);setEditing(!code);setFormat(code?.format??'QR');setValue(code?.value??'');
    setLabel(code?.label??wallet.name);setConfirmed(false);setError('');setMessage('');
    setRemoveConfirm(false);setDiscardConfirm(false);setDetails(false);
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
    return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{disabled:busy}} disabled={busy} onPress={onPress} style={({pressed,focused}:{pressed:boolean;focused?:boolean})=>[s.action,secondary?s.secondary:danger?s.danger:s.primary,busy&&{opacity:.55},pressed&&{opacity:.75},focused&&s.focus]}>
      <Text style={[s.actionText,secondary&&{color:danger?c.error:c.primary}]}>{title}</Text>
    </Pressable>;
  }

  return <ScrollView ref={scroll} contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
    <View style={s.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="뒤로" accessibilityState={{disabled:busy}} disabled={busy} onPress={back} style={({focused}:{pressed:boolean;focused?:boolean})=>[s.back,focused&&s.focus]}><Ionicons name="chevron-back" size={22} color={c.ink}/></Pressable>
      <Text accessibilityRole="header" style={s.headerTitle}>{editing?'코드 등록':'멤버십 코드'}</Text>
      <View style={s.backSpace}/>
    </View>
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
        <View style={s.introIcon}><Ionicons name="scan-outline" size={28} color={c.primary}/></View>
        <Text accessibilityRole="header" style={s.title}>내 멤버십을{ '\n' }한 번에 꺼내세요</Text>
        <Text style={s.body}>{wallet.name}의 정적 적립·사용 코드를 직접 등록해요.</Text>
        <View style={s.notice}><Ionicons name="information-circle-outline" size={18} color={c.warning}/><Text style={[s.note,s.flex]}>카드번호·결제 QR은 등록하지 마세요. 실시간으로 바뀌는 코드는 공식 앱을 사용해 주세요.</Text></View>
        <Text style={s.label}>코드 이름</Text>
        <TextInput accessibilityLabel="멤버십 코드 이름" value={label} onChangeText={setLabel} editable={!busy} maxLength={60} style={s.input}/>
        <Text style={s.label}>원래 코드의 형식</Text>
        <View style={s.formats}>{(['QR','CODE128','EAN13'] as const).map(option=><Pressable key={option} accessibilityRole="radio" accessibilityLabel={option==='QR'?'QR 코드':option==='CODE128'?'CODE128 바코드':'EAN13 바코드'} aria-checked={format===option} accessibilityState={{disabled:busy}} disabled={busy} onPress={()=>{setFormat(option);setError('');}} style={({focused}:{pressed:boolean;focused?:boolean})=>[s.format,format===option&&s.selected,focused&&s.focus]}><Ionicons name={option==='QR'?'qr-code-outline':'barcode-outline'} size={20} color={format===option?c.primary:c.muted}/><Text style={[s.formatText,format===option&&{color:c.primary}]}>{option}</Text></Pressable>)}</View>
        <Text style={s.label}>멤버십 코드 값</Text>
        <TextInput accessibilityLabel="멤버십 코드 값" value={value} onChangeText={setValue} editable={!busy} autoCapitalize="none" autoCorrect={false} spellCheck={false} keyboardType={format==='EAN13'?'number-pad':'default'} multiline={format==='QR'} maxLength={1024} style={[s.input,format==='QR'&&{minHeight:100,textAlignVertical:'top'}]}/>
        <Text style={s.note}>{format==='QR'?'QR은 UTF-8 기준 최대 512바이트예요.':format==='CODE128'?'영문·숫자·기호 최대 80자예요.':'체크 숫자를 포함해 숫자 13자리를 입력해 주세요.'}</Text>
        <Pressable accessibilityRole="checkbox" aria-checked={confirmed} accessibilityState={{disabled:busy}} accessibilityLabel="카드번호나 결제 QR이 아닌 멤버십 전용 코드임을 확인" disabled={busy} onPress={()=>setConfirmed(previous=>!previous)} style={({focused}:{pressed:boolean;focused?:boolean})=>[s.confirm,focused&&s.focus]}>
          <Ionicons name={confirmed?'checkbox':'square-outline'} size={23} color={confirmed?c.primary:c.muted}/><Text style={[s.body,s.flex]}>카드번호나 결제 QR이 아닌 멤버십 전용 코드예요.</Text>
        </Pressable>
        {action(busy?'저장 중…':'이 기기에 코드 저장',()=>void save())}
        {saved&&action('수정 취소',back,false,true)}
      </>:<>
        <View style={s.pass}>
          <View style={s.passHeader}>
            <View style={s.memberIcon}><Ionicons name="ticket-outline" size={24} color={c.purple}/></View>
            <View style={s.flex}><Text style={s.eyebrow}>MY MEMBERSHIP</Text><Text accessibilityRole="header" style={s.subtitle}>{saved?.label||wallet.name}</Text>{saved?.label&&saved.label!==wallet.name&&<Text style={s.note}>{wallet.name}</Text>}</View>
            <View style={s.formatBadge}><Text style={s.badgeText}>{saved?.format}</Text></View>
          </View>
          <Text style={s.scanHint}>결제 전에 이 코드를 보여주세요</Text>
          {!!rendered.svg&&<View style={s.code} onLayout={event=>setDisplayWidth(Math.max(1,event.nativeEvent.layout.width-48))} accessible accessibilityRole="image" accessibilityLabel={`${wallet.name} 멤버십 ${saved?.format==='QR'?'QR 코드':'바코드'}`}>
            <SvgXml xml={rendered.svg} width={Math.min(420,displayWidth)} height={saved?.format==='QR'?Math.min(420,displayWidth):160} preserveAspectRatio="xMidYMid meet"/>
          </View>}
          <View style={s.passFooter}><Ionicons name="phone-portrait-outline" size={14} color={c.muted}/><Text style={s.note}>직접 등록한 정적 코드</Text></View>
        </View>
        {!!rendered.error&&<Text accessibilityLiveRegion="polite" style={s.error}>{rendered.error}</Text>}
        <Text style={s.note}>실제 매장 스캐너의 판독은 아직 확인하지 않았어요.</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="코드 정보와 사용 안내" aria-expanded={details} onPress={()=>setDetails(v=>!v)} style={({focused}:{pressed:boolean;focused?:boolean})=>[s.detailsRow,focused&&s.focus]}><Text style={s.label}>코드 정보와 사용 안내</Text><Ionicons name={details?'chevron-up':'chevron-down'} size={18} color={c.muted}/></Pressable>
        {details&&<View style={s.details}><Text style={s.label}>직접 입력한 코드 값</Text><Text selectable style={s.value}>{saved?.value}</Text><Text style={s.note}>이 앱은 코드의 만료기간을 정하거나 포인트를 자동 조회하지 않아요. 현재 코드와 포인트 상태는 공식 멤버십에서 확인해 주세요. 실시간으로 바뀌는 코드는 공식 앱을 사용해 주세요.</Text></View>}
        {removeConfirm?<View style={s.card}>
          <Text accessibilityRole="header" style={s.subtitle}>이 기기의 코드를 삭제할까요?</Text>
          <Text style={s.body}>멤버십 수단과 내 조건은 유지돼요. 코드만 이 기기에서 삭제해요.</Text>
          {action('삭제 취소',()=>setRemoveConfirm(false),false,true)}
          {action('코드 삭제',()=>void remove(),true)}
        </View>:<>
          {action('코드 수정',edit,false,true)}
          {action('코드 삭제',()=>setRemoveConfirm(true),true,true)}
        </>}
      </>}
      <View style={s.privacy}><Ionicons name="shield-checkmark-outline" size={15} color={c.muted}/><Text style={[s.note,s.flex]}>이 기기에만 보관해요. 서버·제보로 보내지 않아요.</Text></View>
    </>}
  </ScrollView>;
}

const s=StyleSheet.create({
  page:{padding:20,paddingBottom:32,gap:14,backgroundColor:c.background,flexGrow:1,width:'100%',maxWidth:520,alignSelf:'center'},
  header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginHorizontal:-8,marginBottom:10},
  back:{minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center',borderRadius:16},backSpace:{width:44},
  headerTitle:{fontSize:16,lineHeight:24,fontWeight:'600',color:c.ink},
  title:{fontSize:29,lineHeight:39,fontWeight:'700',letterSpacing:-1,color:c.ink},
  subtitle:{fontSize:21,lineHeight:29,fontWeight:'700',letterSpacing:-.6,color:c.ink},
  body:{fontSize:15,lineHeight:24,color:c.ink},note:{fontSize:13,lineHeight:21,color:c.muted},
  label:{fontSize:14,lineHeight:22,fontWeight:'600',color:c.ink},flex:{flex:1,minWidth:0},
  introIcon:{width:58,height:58,borderRadius:19,alignItems:'center',justifyContent:'center',backgroundColor:c.softBlue,marginBottom:4},
  notice:{flexDirection:'row',alignItems:'flex-start',gap:9,padding:14,borderRadius:16,backgroundColor:c.softWarning},
  input:{minHeight:52,borderWidth:1,borderColor:c.line,borderRadius:14,padding:14,fontSize:16,lineHeight:24,color:c.ink,backgroundColor:c.white},
  formats:{flexDirection:'row',flexWrap:'wrap',gap:8},
  format:{minHeight:64,minWidth:76,flexGrow:1,alignItems:'center',justifyContent:'center',gap:5,padding:10,borderWidth:1,borderColor:c.line,borderRadius:14,backgroundColor:c.white},
  formatText:{fontSize:12,lineHeight:18,fontWeight:'600',color:c.muted},selected:{backgroundColor:c.softBlue,borderColor:c.primary},
  confirm:{minHeight:48,paddingVertical:8,flexDirection:'row',alignItems:'flex-start',gap:10},
  action:{minHeight:48,padding:12,borderRadius:14,alignItems:'center',justifyContent:'center'},
  primary:{backgroundColor:c.primary},secondary:{backgroundColor:'transparent'},danger:{backgroundColor:c.error},
  actionText:{fontSize:15,lineHeight:24,fontWeight:'600',color:c.white,textAlign:'center'},
  card:{padding:20,gap:12,borderRadius:22,backgroundColor:c.white},
  pass:{backgroundColor:c.white,borderRadius:28,paddingTop:20,overflow:'hidden',boxShadow:'0px 8px 32px rgba(27,36,64,0.05)'},
  passHeader:{paddingHorizontal:20,flexDirection:'row',alignItems:'center',gap:12},
  memberIcon:{height:44,width:44,borderRadius:15,backgroundColor:'#F2EEFF',alignItems:'center',justifyContent:'center'},
  eyebrow:{fontSize:10,lineHeight:17,fontWeight:'700',letterSpacing:1.2,color:c.muted},
  formatBadge:{paddingHorizontal:8,paddingVertical:4,borderRadius:8,backgroundColor:c.softBlue},badgeText:{fontSize:10,lineHeight:16,fontWeight:'600',color:c.primary},
  scanHint:{fontSize:13,lineHeight:21,color:c.muted,textAlign:'center',marginTop:20},
  code:{alignSelf:'stretch',alignItems:'center',padding:24,backgroundColor:c.white},
  passFooter:{flexDirection:'row',justifyContent:'center',alignItems:'center',gap:6,paddingVertical:14,borderTopWidth:1,borderStyle:'dashed',borderColor:c.line},
  detailsRow:{minHeight:48,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},details:{gap:12,paddingBottom:8},
  value:{fontSize:14,lineHeight:23,color:c.ink,backgroundColor:c.white,padding:14,borderRadius:14,flexShrink:1},
  privacy:{flexDirection:'row',gap:8,paddingTop:8,alignItems:'flex-start'},error:{fontSize:14,lineHeight:23,color:c.error},
  focus:{outlineWidth:2,outlineStyle:'solid',outlineColor:c.primary},
});
