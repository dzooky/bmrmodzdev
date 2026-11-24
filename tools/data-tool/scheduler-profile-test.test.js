'use strict';
const assert=require('assert'),{run}=require('./scheduler-profile-test'),{build}=require('./dpf-demand-profile');
async function exercise(identity,failed,mixed){
 let time=100000,calls=0;
 const profile=build(identity);
 const result=await run(async(ecu,did)=>{
  assert.strictEqual(ecu,0x12);time+=200;
  if(did===0xF150)return {ok:true,uds:[0x62,0xF1,0x50,...identity.match(/../g).map(v=>parseInt(v,16))]};
  calls++;
  const spec=Object.values(profile.definitions).find(v=>v.did===did);
  assert.ok(spec);
  if(failed&&did===0x44BE)return {ok:false};
  return {ok:true,at:new Date(time).toISOString(),uds:[0x62,did>>8,did&255,...Array(spec.length).fill(1)]};
 },{now:()=>time,wait:async ms=>{time+=ms;},mixed});
 assert.strictEqual(result.ok,!failed,JSON.stringify(result));
 assert.strictEqual(result.fields.length,profile.fields.length);
 assert.strictEqual(result.readCalls,calls);
 assert.strictEqual(result.released,true);
 assert.strictEqual(result.productionAccessEnabled,false);
 assert.ok(calls<=(mixed?64:48));
 if(mixed&&!failed){assert.ok(result.fields.every(r=>r.met&&r.minIntervalMs>=r.targetMs));assert.ok(result.fields.every(r=>r.targetMs===profile.freshnessMs[profile.fields.find(k=>k.endsWith('.'+r.name))]));if(identity==='0F1FE8')assert.ok(result.fields.find(r=>r.name==='request').samples>result.fields.find(r=>r.name==='soot').samples);}

 if(!failed)assert.ok(result.fields.every(r=>r.samples>=2&&r.maxIntervalMs>=5000));
 assert.strictEqual(JSON.stringify(result).includes('uds'),false);
}
(async()=>{await exercise('0F1FE8',false);await exercise('0F2678',false);await exercise('0F1FE8',true);await exercise('0F1FE8',false,true);await exercise('0F2678',false,true);await exercise('0F1FE8',true,true);console.log('Bounded profile scheduler: B57/B47, repeated samples, shared cache, failure and release PASS');})().catch(e=>{console.error(e);process.exitCode=1;});
