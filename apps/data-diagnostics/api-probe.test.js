'use strict';
const assert=require('assert'),{run}=require('./api-probe');
async function scenario(delay){
 let t=100000,closed=0;const start=t,field='dpf.b57.request';
 const result=await run({now:()=>t,wait:async ms=>{t+=ms;},connect:async()=>{let demand=false;return {close(){closed++;},async request(r){
 if(r.op==='catalog')return {ok:true,engine:'B57',fields:[{name:field,minFreshnessMs:5000}]};
 if(r.op==='demand'){if(r.freshnessMs[field]===1)return {ok:false,error:'INVALID_DEMAND'};demand=true;return {ok:true};}
 if(r.op==='release'){demand=false;return {ok:true};}
 if(r.op==='snapshot')return {ok:true,active:demand,fields:demand?{[field]:{valid:t-start>=delay,raw:1,sampledAt:new Date(t).toISOString()}}:{}};
 }};}});
 assert.strictEqual(closed,2);assert.strictEqual(result.released,true);
 return result;
}
(async()=>{
 const fast=await scenario(500),slow=await scenario(6500),missing=await scenario(Infinity);
 assert.strictEqual(fast.ok,true,JSON.stringify(fast));
 assert.strictEqual(slow.ok,true,JSON.stringify(slow));assert.strictEqual(slow.firstSampleMs,6500);
 assert.strictEqual(missing.ok,false);assert.strictEqual(missing.error,'FIRST_SAMPLE_TIMEOUT');assert.strictEqual(missing.automatic,null);
 console.log('Diagnostics API probe: immediate, delayed, missing sample and release PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});
