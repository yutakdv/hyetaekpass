import test from 'node:test';
import assert from 'node:assert/strict';
import {previewDraft} from '../src/preview.ts';
import {input} from '../../../packages/benefit-core/test/fixtures.ts';
test('draft arithmetic does not grant catalog review or combine unreviewed rules',()=>{const x=input();x.catalog.rules.forEach(r=>{r.origin='CATALOG';r.status='DRAFT';});const result=previewDraft(x);assert.equal(result.plans.some(p=>p.ruleIds.length>1),false);assert.equal(x.catalog.rules[0].origin,'CATALOG');assert.equal(x.catalog.rules[0].status,'DRAFT');assert.equal(result.best?.instantWon,1000);x.conditions.m.values.tier.value='UNKNOWN';assert.equal(previewDraft({...x,productIds:['membership']}).best,null);});
