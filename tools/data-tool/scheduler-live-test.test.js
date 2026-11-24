'use strict';
const assert=require('assert'),{run}=require('./scheduler-live-test');
(async()=>{
 let calls=0;
 const result=await run(async(ecu,did)=>{calls++;assert.strictEqual(ecu,0x12);assert.strictEqual(did,0x44BB);return {ok:true,uds:[0x62,0x44,0xBB,1],at:new Date().toISOString()};});
 assert.strictEqual(result.ok,true,JSON.stringify(result));
 assert.strictEqual(result.readCalls,1);assert.strictEqual(calls,1);
 assert.strictEqual(result.productionAccessEnabled,false);
 assert.strictEqual(JSON.stringify(result).includes('uds'),false);
 const failure=await run(async()=>({ok:false}));
 assert.strictEqual(failure.ok,false);assert.strictEqual(failure.valid,false);
 assert.strictEqual(failure.readCalls,1);
 console.log('Bounded internal scheduler: shared fixed read, passive snapshots, release and failed-read handling PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});
