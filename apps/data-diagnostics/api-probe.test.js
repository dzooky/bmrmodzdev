'use strict';
const assert=require('assert'),{run}=require('./api-probe');
(async()=>{
 let t=100000,reads=0;const field='dpf.b57.request';let active=0,closed=0;
 const result=await run({wait:async ms=>{t+=ms;reads++;},connect:async()=>{let demand=false;return {close(){closed++;},async request(r){
 if(r.op==='catalog')return {ok:true,engine:'B57',fields:[{name:field,minFreshnessMs:5000}]};
 if(r.op==='demand'){if(r.freshnessMs[field]===1)return {ok:false,error:'INVALID_DEMAND'};demand=true;return {ok:true};}
 if(r.op==='release'){demand=false;return {ok:true};}
 if(r.op==='snapshot')return {ok:true,active:demand,fields:demand?{[field]:{valid:true,raw:1,sampledAt:new Date(t).toISOString()}}:{}};
 }};}});
 assert.strictEqual(result.ok,true,JSON.stringify(result));assert.strictEqual(closed,2);assert.ok(reads>1);
 console.log('Diagnostics API probe PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});
