'use strict';
const assert=require('assert');
const {createScheduler}=require('./uds-demand-scheduler');
const {build}=require('./dpf-demand-profile');
(async()=>{
 const b57=build('0F1FE8'),b47=build('0F2678');
 assert.strictEqual(b57.fields.length,12);
 assert.strictEqual(b47.fields.length,4);
 assert.strictEqual(build('BAD'),null);
 assert.strictEqual(b57.freshnessMs['dpf.b57.request'],5000);
 assert.strictEqual(b57.freshnessMs['dpf.b57.soot'],60000);
 const tokenA=Symbol('DPF DEV authenticated placeholder'),tokenB=Symbol('other approved consumer');
 const overlap='dpf.b57.soot';
 const grant=new Map([[tokenA,new Set(b57.fields)],[tokenB,new Set([overlap])]]);
 let t=Date.now(),requests=[];
 const scheduler=createScheduler({now:()=>t,definitions:b57.definitions,grants:grant,
  read:async(ecu,did)=>{
   requests.push({ecu,did,t});
   const spec=Object.values(b57.definitions).find(x=>x.did===did);
   return {ok:true,uds:[0x62,did>>8,did&255,...Array(spec.length).fill(1)],at:new Date(t).toISOString()};
  }});
 try{
  assert.strictEqual(requests.length,0,'no acquisition at creation');
  assert.strictEqual(scheduler.status().activeConsumers,0);
  assert.strictEqual(await scheduler.tick(),false,'no demand, no reads');
  assert.strictEqual(scheduler.demand('dpf-dev',[overlap],1000,5000).ok,false,
   'JSON client string must never be a grant');
  assert.strictEqual(scheduler.demand(Symbol('forged'),[overlap],1000,5000).ok,false);
  assert.strictEqual(scheduler.demand(tokenB,['dpf.b57.ash'],1000,5000).ok,false);
  assert.strictEqual(scheduler.demand(tokenA,b57.fields,b57.freshnessMs,15000).ok,true);
  assert.strictEqual(scheduler.demand(tokenB,[overlap],60000,15000).ok,true);
  for(let i=0;i<b57.fields.length;i++)assert.strictEqual(await scheduler.tick(),true);
  assert.strictEqual(requests.length,12,'one physical read per shared DID');
  assert.strictEqual(await scheduler.tick(),false,'UI snapshots cannot drive ECU');
  assert.strictEqual(scheduler.snapshot(tokenA).fields[overlap].valid,true);
  assert.strictEqual(scheduler.snapshot(tokenB).fields[overlap].valid,true);
  assert.strictEqual(requests.length,12,'two consumer cache snapshots passive');
  assert.strictEqual(scheduler.snapshot('dpf-dev').ok,false);
  t+=5100;
  assert.strictEqual(await scheduler.tick(),true,'regen state expires faster than gauges');
  assert.strictEqual(requests.length,13);
  assert.strictEqual(requests[12].did,0x44BB);
  assert.strictEqual(await scheduler.tick(),true,'regen mode shares fast freshness');
  assert.strictEqual(requests[13].did,0x467E);
  assert.strictEqual(await scheduler.tick(),false,'no extra reads until due');
  assert.strictEqual(scheduler.snapshot(tokenA).fields[overlap].valid,true);
  assert.strictEqual(scheduler.release(tokenB).ok,true);
  t+=15100;
  assert.strictEqual(await scheduler.tick(),false,'lease expires and cancels acquisition');
  assert.strictEqual(scheduler.snapshot(tokenA).active,false);
  assert.strictEqual(scheduler.status().activeConsumers,0);
  assert.strictEqual(requests.length,14);
 }finally{scheduler.close();}
 const token=Symbol('approved'),rows=new Set([overlap]);
 let now=100000,shouldFail=false,attempts=0;
 const retry=createScheduler({now:()=>now,grants:new Map([[token,rows]]),
  definitions:{[overlap]:b57.definitions[overlap]},read:async()=>{
   attempts++;
   return shouldFail?{ok:false,error:'ECU timeout'}:
    {ok:true,uds:[0x62,0x44,0xBE,0,1],at:new Date(now).toISOString()};
  }});
 try{
  assert.strictEqual(retry.demand(token,[overlap],1000,60000).ok,true);
  assert.strictEqual(await retry.tick(),true);
  assert.strictEqual(retry.snapshot(token).fields[overlap].valid,true);
  shouldFail=true;now+=1100;
  assert.strictEqual(await retry.tick(),false);
  const bad=retry.snapshot(token).fields[overlap];
  assert.strictEqual(bad.valid,false,'stale data must not be reported fresh');
  assert.ok(bad.ageMs>=1000);
  assert.strictEqual(bad.uds,null,'stale data not served as valid');
  assert.strictEqual(attempts,2);
  assert.strictEqual(await retry.tick(),false,'failed reads back off');
  assert.strictEqual(attempts,2);
 }finally{retry.close();}
 assert.throws(()=>createScheduler({read:async()=>{},now:Date.now,
  grants:new Map([[Symbol('x'),new Set(['unlisted'])]]),
  definitions:{unlisted:{ecu:0x12,did:0x2E00,length:2}}}),/Non-allowlisted/);
 console.log('Data Tool internal UDS scheduling: B57/B47 profile, grants, cache, multi-consumer, freshness, lease, failure PASS');
})().catch(error=>{console.error(error);process.exitCode=1;});
