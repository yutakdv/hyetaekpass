import {calculate,validateCatalog} from '../../../packages/benefit-core/src/index.ts';
import type {CalculationInput} from '../../../contracts/types.ts';
export function previewDraft(input:CalculationInput){
  const catalog=validateCatalog(input.catalog);
  // Draft arithmetic is a personal, unreviewed scenario. It cannot grant review or publication.
  return calculate({...input,mode:'PERSONAL',safety:undefined,catalog:{...catalog,rules:catalog.rules.map(r=>({...r,origin:'USER_INPUT'})),combinations:[]}});
}
