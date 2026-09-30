import test from 'node:test';
import assert from 'node:assert/strict';
import {validateMembershipCode,membershipCodeSvg} from '../src/membership.ts';

test('membership codes cannot be registered for a payment card',()=>{
  assert.throws(()=>validateMembershipCode('CARD','QR','MEMBER-LOCAL'),/멤버십/);
  assert.throws(()=>validateMembershipCode('MEMBERSHIP','QR',''),/입력/);
});
test('QR enforces UTF-8 byte boundaries rather than character count',()=>{
  assert.doesNotThrow(()=>validateMembershipCode('MEMBERSHIP','QR','가'.repeat(170)+'AB'));
  assert.throws(()=>validateMembershipCode('MEMBERSHIP','QR','가'.repeat(171)),/512/);
  assert.throws(()=>validateMembershipCode('MEMBERSHIP','QR','A'.repeat(513)),/512/);
});
test('CODE128 accepts printable ASCII only and caps the scan payload at 80',()=>{
  assert.doesNotThrow(()=>validateMembershipCode('MEMBERSHIP','CODE128','A'.repeat(80)));
  for(const value of ['A'.repeat(81),'AB\nCD','AB\x7fCD','멤버십']){
    assert.throws(()=>validateMembershipCode('MEMBERSHIP','CODE128',value));
  }
});
test('EAN13 requires the supplied thirteen digits to have a valid checksum',()=>{
  assert.doesNotThrow(()=>validateMembershipCode('MEMBERSHIP','EAN13','4006381333931'));
  for(const value of ['4006381333932','400638133393','40063813339311','400638133393A']){
    assert.throws(()=>validateMembershipCode('MEMBERSHIP','EAN13',value));
  }
});
test('local SVG rendering maps each declared format and retains white quiet zones',()=>{
  for(const code of [{format:'QR',value:'MEMBER-LOCAL'},{format:'CODE128',value:'MEMBER-LOCAL'},{format:'EAN13',value:'4006381333931'}] as const){
    const svg=membershipCodeSvg(code);
    assert.match(svg,/<svg\b/);
    assert.match(svg,/viewBox="0 0 \d+ \d+"/);
    assert.match(svg,/#(?:ffffff|FFFFFF)/);
    assert.match(svg,/#(?:000000)/);
    assert.doesNotMatch(svg,/<(?:text|image|script)\b|href=/);
    const dimensions=svg.match(/viewBox="0 0 (\d+) (\d+)"/)!.slice(1).map(Number);
    if(code.format==='QR')assert.equal(dimensions[0],dimensions[1]);
    else assert(dimensions[0]>dimensions[1]);
  }
});
test('UTF-8 membership QR payloads accepted at the byte limit can be rendered locally',()=>{
  assert.match(membershipCodeSvg({format:'QR',value:'가'.repeat(170)+'AB'}),/<svg\b/);
});
test('invalid render payloads fail without including the private value',()=>{
  const value='private-code\nvalue';
  assert.throws(()=>membershipCodeSvg({format:'CODE128',value}),error=>error instanceof Error&&!error.message.includes(value));
});
