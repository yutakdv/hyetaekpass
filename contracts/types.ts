export type Truth = 'TRUE' | 'FALSE' | 'UNKNOWN';
export type Origin = 'CATALOG' | 'USER_INPUT' | 'FIXTURE';
export type Basis = 'ORIGINAL' | 'PAYABLE' | 'ELIGIBLE';
export interface Source {
  id: string; url: string; documentVersion: string; checkedAt: string; freshUntil: string; rightsUntil: string;
  rights: { display: boolean; transform: boolean; iosDistribution: boolean; androidDistribution: boolean; offlineCache: boolean; update: boolean; revoke: boolean; evidenceRef: string };
}
export interface Review {
  author: string; reviewer: string; method: 'HUMAN_ORIGINAL'; reviewedAt: string; evidenceRef: string; goldenTests: string[];
}
export interface Calculation {
  kind: 'PERCENT' | 'FIXED'; value: number; basis: Basis; minimumWon: number; minimumBasis: Basis;
  capWon: number; rounding: 'FLOOR' | 'HALF_UP' | 'CEIL'; settlement: 'INSTANT' | 'BILLING';
}
export interface Rule {
  id: string; version: string; origin: Origin; title: string; productId: string; brandId: string; sourceId: string;
  channels: string[]; placeIds: string[]; startsAt: string; endsAt: string;
  status: 'CATALOG_REVIEWED' | 'DRAFT' | 'GUIDE_ONLY' | 'CONFLICT';
  requiredConditions: string[]; remainingWonRequired: boolean; remainingUsesRequired: boolean;
  calculation?: Calculation; unsupportedReason?: string; usageSteps: string[]; exclusions: string[];
  review?: Review;
}
export interface Combination { id: string; ruleIds: [string, string]; allowed: Truth; review?: Review; evidenceRef: string }
export interface Place { id: string; name: string; brandId: string; sourceId: string; regionId: string; latitude: number; longitude: number; autoModes: { ios: boolean; android: boolean; area: boolean } }
export interface Catalog {
  schemaVersion: 1; semanticsVersion: 1; releaseId: string; createdAt: string;
  brands: {id: string; name: string}[]; products: {id: string; name: string; kind: 'CARD' | 'MEMBERSHIP'}[];
  sources: Source[]; places: Place[]; rules: Rule[]; combinations: Combination[];
}
export interface Safety {
  revision: number; serverTime: string; receivedAt: number;
  blockedRuleIds: string[]; blockedSourceIds: string[];
  flags: { catalog: boolean; foregroundLocation: boolean; iosBackground: boolean; androidBackground: boolean; area: boolean };
}
export interface Bootstrap {
  schemaVersion: 1; semanticsVersion: 1; releaseId: string; catalogPath: string; sha256: string; sizeBytes: number;
  safety: Omit<Safety, 'receivedAt'>;
}
export interface Observation { value: Truth; checkedAt: string; month: string; ruleVersion: string }
export interface RuleConditions { values: Record<string, Observation>; remainingWon: number | null; remainingUses: number | null; month: string; ruleVersion: string }
export interface CalculationInput {
  amountWon: number; eligibleAmountWon?: number; brandId: string; placeId: string; channel: string; productIds: string[];
  catalog: Catalog; conditions: Record<string, RuleConditions>; safety?: Safety; now: number; mode: 'PUBLIC' | 'PERSONAL' | 'DEMO';
}
export interface RuleResult { ruleId: string; eligibility: Truth; reasons: string[]; discountWon: number | null; settlement?: 'INSTANT' | 'BILLING' }
export interface Plan { ruleIds: string[]; instantWon: number; payableWon: number; billingWon: number; totalWon: number }
export interface CalculationResult { results: RuleResult[]; plans: Plan[]; best: Plan | null; label: 'CONDITION_BASED_ESTIMATE' }
export interface CacheState { catalog: Catalog | null; safety: Safety | null }
export interface WalletItem { id: string; name: string; kind: 'CARD' | 'MEMBERSHIP'; tier: string; productVersion: string | null }
export interface LocationObservation { latitude: number; longitude: number; accuracy: number; timestamp: number; speed: number | null }
export interface NotificationInput {
  now: number; platform: 'ios' | 'android'; mode: 'STRICT' | 'AREA'; place: Place; observations: LocationObservation[];
  candidateStartedAt: number; consent: boolean; advertisingConsent: boolean; locationPermission: boolean; notificationPermission: boolean;
  safety: Safety | null; hasValidBenefit: boolean; day: string; dayCount: number; lastBrandAt: number | null; lastPlaceAt: number | null;
}
