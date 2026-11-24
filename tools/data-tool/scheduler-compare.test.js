'use strict';
const assert=require('assert'),{run}=require('./scheduler-compare'),{build}=require('./dpf-demand-profile');
(async()=>{
 for(const id of ['0F1FE8','0F2678']){
  const p=build(id);let calls=0;
  const r=await run(async(ecu,did)=>{
   calls++;assert.strictEqual(ecu,0x12);
   if(did===0xF150)return {ok:true,uds:[0x62,0xF1,0x50,...id.match(/../g).map(x=>parseInt(x,16))]};
   const s=Object.values(p.definitions).find(x=>x.did===did);
   if(did===0x44BD)return {ok:false};
   return {ok:true,uds:[0x62,did>>8,did&255,...Array(s.length).fill(1)],at:new Date().toISOString()};
  });
  assert.strictEqual(r.ok,true);assert.strictEqual(r.engine,p.engine);
  assert.strictEqual(calls,p.fields.length+1);
  assert.strictEqual(Object.keys(r.fields).length,p.fields.length-1);
  assert.strictEqual(r.fields[0x44BD],undefined);
  assert.strictEqual(r.productionAccessEnabled,false);
 }
 console.log('Manual scheduler snapshot: B57/B47 fixed profile, partial failure and bounded acquisition PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});
