export function reportUpdateInput(category:string,status:string){
  category=category.trim();
  if(!category||category.length>80||!['OPEN','CLASSIFIED','CLOSED'].includes(status))throw Error('제보 분류와 현재 처리 상태를 확인해 주세요.');
  return {category,status};
}
export function ensureLocalRole(jwt:string,subject:string,required:string):void {
  if(!jwt.trim()&&subject!==required)throw Error(`이 작업은 ${({author:'작성자',reviewer:'검수자',publisher:'게시자'} as Record<string,string>)[required]??required} 권한이 필요해요. 연결 설정의 로컬 시험 역할을 확인해 주세요.`);
}
export function reviewInput(author:string,reviewer:string,evidenceRef:string,golden:string){
  reviewer=reviewer.trim();evidenceRef=evidenceRef.trim();const goldenTests=golden.split('\n').map(v=>v.trim()).filter(Boolean);
  if(!reviewer||reviewer===author)throw Error('작성자와 다른 실제 원문 검수자의 인증 subject가 필요해요.');
  if(!evidenceRef||!goldenTests.length)throw Error('비공개 원문 검수 증거와 실행한 골든 사례를 입력해 주세요.');
  return {reviewer,method:'HUMAN_ORIGINAL' as const,evidenceRef,goldenTests};
}
export function operationError(status:number,code:string):string {
  const message:Record<string,string>={RIGHTS_REQUIRED:'자료 이용권 7개 항목과 비공개 승인 증거를 확인해 주세요.',REVIEW_REQUIRED:'작성자와 다른 사람의 실제 원문 검수 기록이 필요해요.',JOURNAL_UNAVAILABLE:'독립 삭제·차단 기록을 확인할 수 없어요. 쓰기 작업을 멈추고 journal 복구 후 재시도해 주세요.',SAFETY_UNAVAILABLE:'복구 검증이 필요해요. 독립 journal 재적용과 검증을 확인해 주세요.',SCHEMA_INVALID:'자료 형식이나 참조가 맞지 않아요. 입력을 유지한 채 JSON 검사를 다시 실행해 주세요.',INPUT_INVALID:'필수 입력과 선택 대상을 확인해 주세요.',TOO_LARGE:'자료는 5 MiB 이하로 입력해 주세요.',RATE_LIMITED:'요청이 많아요. 잠시 후 다시 시도해 주세요.'};
  const fallback=status===401?'운영 인증을 다시 확인해 주세요.':status===403?'이 작업의 역할·MFA·서버 허용 목록을 확인해 주세요.':status===409?'다른 작업이 먼저 반영됐어요. 현재 자료를 새로고침하고 선택 대상을 다시 확인해 주세요.':status===503?'서버 안전 상태를 확인할 수 없어요. 복구 상태를 확인한 뒤 재시도해 주세요.':'요청을 완료하지 못했어요. 입력을 유지했으니 연결과 서버 상태를 확인해 주세요.';
  return `${message[code]??fallback} (${status} · ${code||'REQUEST_FAILED'})`;
}
