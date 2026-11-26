'use strict';
const assert=require('assert'),cc=require('./cc-test');
(async()=>{
 const calls=[];const res=await cc.run(async q=>{
 calls.push(q.op);
 if(q.op==='ccTasuGenerate')return {ok:true,stage:'generated'};
 if(q.op==='ccTasuProbe')return {ok:false,stage:'config-unauthorized'};
 if(q.op==='ccGearSourceAudit')return {ok:false,bundle:{status:'syntax-error',line:3130}};
 if(q.op==='ccGearGenerate')return {ok:true};
 if(q.op==='ccGearProbe')return {ok:true,selector:'P'};
 if(q.op==='ccFrontContact')return {ok:true,state:q.contact===1?'latched':'unlatched'};
 return {ok:true,uds:[98,64,83,0,0,135,0,35]};
 });
 assert.deepStrictEqual(res.belts,{frontLeft:'latched',frontRight:'unlatched',rearLeft:'latched',rearRight:'unlatched'});
 assert.strictEqual(res.gear.selector,'P');
 assert.strictEqual(res.toolNative.stage,'config-unauthorized');
 assert.deepStrictEqual(calls,['ccGearSourceAudit','ccTasuGenerate','ccTasuProbe','ccGearGenerate','ccGearProbe','ccFrontContact','ccFrontContact','read']);
 console.log('CC parked test PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});
