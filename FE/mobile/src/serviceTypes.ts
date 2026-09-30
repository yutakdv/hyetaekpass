import type {CacheState,CalculationResult,Rule,Truth,WalletItem} from '../../../contracts/types.ts';
import type {LocalData,PersonalDraft,ReportReceipt} from './model.ts';
import type {ReactNode} from 'react';

export type ServiceOrigin='PUBLIC'|'PERSONAL'|'DEMO';
export type ServiceTab='HOME'|'EXPLORE'|'WALLET'|'SAVED';
export interface BenefitEntry {
  id:string;
  origin:ServiceOrigin;
  /** A null rule must never recover revoked public content from a saved snapshot. */
  rule:Rule|null;
  brandName:string;
  productName:string;
  productKind?:WalletItem['kind'];
  status:'AVAILABLE'|'UNKNOWN'|'EXPIRED'|'BLOCKED'|'GUIDE_ONLY'|'UNAVAILABLE';
  statusText:string;
  canCalculate:boolean;
  sourceUrl:string|null;
  sourceLabel:string;
  checkedAt:string|null;
  freshUntil?:string;
  rightsUntil?:string;
  referencedAt?:string;
}
export interface CheckAnswer {
  values:Record<string,Truth>;
  remainingWon:string;
  remainingUses:string;
}
export interface CheckDraft {
  origin:ServiceOrigin;
  brandId:string;
  placeId:string;
  channel:string;
  productIds:string[];
  compareAll:boolean;
  amount:string;
  eligibleAmount:string;
  answers:Record<string,CheckAnswer>;
}
export interface CheckOutcome {
  result:CalculationResult|null;
  error:string;
  /** Controller re-evaluates this outcome when month, clock, source or safety changes. */
  fields?:Record<string,string>;
}
export interface PublicStatus {
  state:'LOADING'|'EMPTY'|'READY'|'OFFLINE'|'EXPIRED'|'UNKNOWN'|'OFF';
  message:string;
  lastConfirmedAt:number|null;
  expiresAt:number|null;
  canLocate:boolean;
}
export interface ReportInput {
  ruleId?:string;
  category:'CONDITION'|'EXPIRED'|'PLACE'|'OTHER';
  message:string;
}
export interface MembershipCodeValue {walletId:string;format:'QR'|'CODE128'|'EAN13';value:string;label:string;updatedAt:string}
export interface ServiceActions {
  finishOnboarding():Promise<void>;
  refresh():Promise<void>;
  retryStorage():Promise<void>;
  saveWallet(item:WalletItem):Promise<WalletItem>;
  deleteWallet(id:string):Promise<void>;
  setDefault(kind:WalletItem['kind'],id:string|null):Promise<void>;
  saveMembershipCode(code:MembershipCodeValue):Promise<void>;
  removeMembershipCode(walletId:string):Promise<void>;
  savePersonal(draft:PersonalDraft,asDraft:boolean):Promise<{kind:'RULE'|'DRAFT';id:string}>;
  deletePersonal(id:string):Promise<void>;
  deletePersonalDraft(id:string):Promise<void>;
  toggleFavorite(entry:BenefitEntry):Promise<void>;
  removeFavorite(origin:ServiceOrigin,id:string):Promise<void>;
  clearRecents():Promise<void>;
  viewBenefit(entry:BenefitEntry):Promise<void>;
  /** Synchronous memory updates only. No protected storage write on text changes. */
  updateCheck(draft:CheckDraft):void;
  startCheck(entry?:BenefitEntry):void;
  evaluateCheck():Promise<void>;
  finishCheck():Promise<void>;
  openSource(entry:BenefitEntry):Promise<void>;
  openProvider(id:string,purpose:'BENEFITS'|'CODE'):Promise<void>;
  locate():Promise<void>;
  setConsent(key:'location'|'advertising'|'background',value:boolean):Promise<void>;
  withdrawConsent():Promise<void>;
  openSystemSettings():Promise<void>;
  deleteDevice():Promise<void>;
  submitReport(input:ReportInput,replace?:ReportReceipt):Promise<void>;
  deleteReport(receipt:ReportReceipt):Promise<void>;
  savePendingReport():Promise<void>;
  enterDemo():Promise<void>;
  leaveDemo():void;
}
export interface ServiceUIProps {
  local:LocalData;
  cache:CacheState;
  benefits:BenefitEntry[];
  favorites:BenefitEntry[];
  recents:BenefitEntry[];
  loaded:boolean;
  refreshing:boolean;
  error:string;
  notice:string;
  now:number;
  /** Increment only after local deletion is complete; resets navigation and UI drafts. */
  resetKey:number;
  publicStatus:PublicStatus;
  check:CheckDraft;
  outcome:CheckOutcome;
  pendingReceipt:ReportReceipt|null;
  demo:boolean;
  /** Rendered only in About's explicitly expanded diagnostics. */
  diagnostics?:{apiUrl:string;build:string;details:string[]};
  nearby?:{id:string;name:string;distance:number}[];
  /** Root wires the dedicated offline code component and its protected-save actions. */
  renderMembershipCode:(walletId:string,onClose:()=>void)=>ReactNode;
  actions:ServiceActions;
}
