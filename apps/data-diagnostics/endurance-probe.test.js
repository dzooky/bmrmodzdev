'use strict';
const assert=require('assert'),{run}=require('./endurance-probe');
async function scenario(fail){
 let t=100000,active=false,closed=false;const start=t,field='dpf.b57.request';
 const r=await run({now:()=>t,wait:async ms=>{t+=ms;},connect:async()=>({close(){closed=true;},async request(q){
 if(q.op==='catalog')return {ok:true,engine:'B57',fields:[{name:field,minFreshnessMs:5000}]};
 if(q.op==='demand'){active=true;return {ok:true};}
 if(q.op==='release'){active=false;return {ok:true};}
 if(q.op==='snapshot')return {ok:true,active,fields:active?{[field]:{valid:!fail,sampledAt:new Date(start+Math.floor((t-start)/5000)*5000).toISOString()}}:{}};
 }})});
 assert.ok(closed&&r.released);return r;
}
(async()=>{assert.strictEqual((await scenario(false)).ok,true);assert.strictEqual((await scenario(true)).ok,false);console.log('Endurance probe PASS');})().catch(e=>{console.error(e);process.exitCode=1;});
