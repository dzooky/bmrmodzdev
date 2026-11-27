'use strict';
const assert=require('assert'),{compare,run}=require('./cc-belt-retest');
const shot=(at,left,right)=>({ok:true,sampledAt:at,fields:{
 frontLeft:{valid:true,value:left},frontRight:{valid:true,value:right}}});
const a=shot('2026-11-27T09:00:00.000Z','latched','unlatched');
const b=shot('2026-11-27T09:00:05.000Z','unlatched','latched');
const changed=compare(a,b);
assert.equal(changed.stage,'changed');assert.equal(changed.ok,true);
assert.deepStrictEqual(changed.changed,['frontLeft','frontRight']);
assert.equal(compare(a,a).stage,'same-sample');
assert.equal(compare(a,shot('2026-11-27T09:00:05.000Z','latched','unlatched')).stage,'unchanged');
assert.equal(compare(b,a).stage,'non-monotonic-sample');
assert.equal(compare(null,b).stage,'missing-sample');
const bad=shot('2026-11-27T09:00:05.000Z','latched','unlatched');
bad.fields.frontLeft.valid=false;
assert.equal(compare(a,bad).stage,'invalid-contact');
(async()=>{
 const calls=[];const good=await run(async (q,options)=>{calls.push({q,options});return b;},a);
 assert.deepStrictEqual(calls.map(x=>x.q),[{op:'ccNativeSnapshot'}]);
 assert.equal(good.stage,'changed');
 assert.equal((await run(async()=>({ok:false,stage:'PROVIDER_DISCONNECTED'}),a)).stage,'PROVIDER_DISCONNECTED');
 assert.equal((await run(async()=>{throw Error('offline');},a)).stage,'request-error');
 console.log('CC belt transition one-shot Tool snapshot and freshness PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});
