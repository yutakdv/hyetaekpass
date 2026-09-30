import test from 'node:test';
import assert from 'node:assert/strict';
import {reportUpdateInput,ensureLocalRole,reviewInput,operationError} from '../src/operations.ts';

test('report updates preserve OPEN and CLOSED instead of silently classifying',()=>{
  assert.deepEqual(reportUpdateInput('  CONDITION  ','OPEN'),{category:'CONDITION',status:'OPEN'});
  assert.deepEqual(reportUpdateInput('EXPIRED','CLOSED'),{category:'EXPIRED',status:'CLOSED'});
  assert.throws(()=>reportUpdateInput('CONDITION',''));
  assert.throws(()=>reportUpdateInput('','CLASSIFIED'));
  assert.doesNotThrow(()=>reportUpdateInput('x'.repeat(80),'OPEN'));
  assert.throws(()=>reportUpdateInput('x'.repeat(81),'OPEN'));
});
test('local author cannot perform reviewer or publisher work, JWT permissions remain server decisions',()=>{
  assert.throws(()=>ensureLocalRole('','author','reviewer'));
  assert.throws(()=>ensureLocalRole('','author','publisher'));
  assert.doesNotThrow(()=>ensureLocalRole('','reviewer','reviewer'));
  assert.doesNotThrow(()=>ensureLocalRole('opaque-jwt','author','publisher'));
});
test('original review requires a distinct reviewer, evidence and executed golden cases',()=>{
  assert.throws(()=>reviewInput('author','author','proof','case-1'));
  assert.throws(()=>reviewInput('author','reviewer','','case-1'));
  assert.throws(()=>reviewInput('author','reviewer','proof',''));
  assert.deepEqual(reviewInput('author',' reviewer ',' proof ','case-1\n\ncase-2'),{reviewer:'reviewer',method:'HUMAN_ORIGINAL',evidenceRef:'proof',goldenTests:['case-1','case-2']});
});
test('HTTP conflicts and independent journal failure provide different recovery actions',()=>{
  assert.match(operationError(409,'CONFLICT'),/새로고침/);
  assert.match(operationError(503,'JOURNAL_UNAVAILABLE'),/재시도|복구/);
  assert.match(operationError(403,'RIGHTS_REQUIRED'),/이용권/);
});
