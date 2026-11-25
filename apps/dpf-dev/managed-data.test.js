'use strict';
const assert=require('assert'),{create}=require('./managed-data');
(async()=>{
 let t=100000,fields=[],calls=[],closed=0;
 const managed=create({now:()=>t,connect:async()=>({close(){closed++;},async request(req){
 calls.push(req.op);
 if(req.op==='catalog')return {ok:true,engine:'B57'};
 if(req.op==='demand'){fields=req.fields;return {ok:true};}
 if(req.op==='snapshot')return {ok:true,active:true,fields:Object.fromEntries(fields.map(k=>[k,{valid:true,raw:1,validityMs:/\.(request|mode)$/.test(k)?15000:180000,sampledAt:new Date(t).toISOString()}]))};
 }})});
 let r=await managed.poll(true,false);assert.strictEqual(Object.keys(r.readings).length,12);assert.strictEqual(r.readings.SOOT.value,0.01525902);
 t+=500;await managed.poll(true,false);assert.strictEqual(calls.filter(x=>x==='demand').length,1);
 r=await managed.poll(false,true);assert.deepStrictEqual(Object.keys(r.readings),['REQUEST','MODE']);
 t+=5000;await managed.poll(false,true);assert.strictEqual(calls.filter(x=>x==='demand').length,3);
 await managed.poll(false,false);assert.strictEqual(closed,1);
 console.log('Managed DPF demand, decoding, renewal and release PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});
