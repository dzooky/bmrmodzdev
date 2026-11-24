'use strict';
const assert=require('assert');
const {collect,current}=require('./reference-refresh');
const {forDde,B57,B47}=require('./dde-profiles');
(async()=>{
 const now=Date.now(),b47=forDde(B47);
 const original={
  SOOT:{raw:100,source:'legacy',at:now-1000},
  ASH:{raw:40,source:'legacy',at:now-91000},
  SINCE:{raw:900,source:'tool',at:now-1000}
 };
 const requested=[];
 const {snapshots,info}=await collect(b47,original,async(ecu,did)=>{
  requested.push([ecu,did]);
  const len=did===0x44BF?4:2;
  return [0x62,did>>8,did&255,...Array(len).fill(0)];
 },now);
 assert.strictEqual(requested.length,3,'skip fresh native soot');
 assert.deepStrictEqual(requested.map(x=>x[1]),[0x44BD,0x44BF,0x44C7]);
 assert.strictEqual(info.completed,3);
 assert.strictEqual(info.missing,3);
 assert.strictEqual(snapshots.SOOT.raw,100);
 assert.strictEqual(snapshots.ASH.source,'legacy');
 assert.strictEqual(snapshots.SINCE.source,'legacy');
 assert.strictEqual(original.ASH.at,now-91000,'do not mutate live DPF readings');
 assert.strictEqual(current({raw:1,source:'legacy',at:now-60000},now),true);
 assert.strictEqual(current({raw:1,source:'legacy',at:now-92000},now),false);
 let calls=0;
 const valid=Array.from({length:12},()=>undefined);
 const missing=await collect(forDde(B57),{},async(ecu,did)=>{
  calls++;throw new Error('unavailable');
 },now);
 assert.strictEqual(calls,12);
 assert.strictEqual(missing.info.completed,0);
 assert.deepStrictEqual(missing.snapshots,{});
 assert.deepStrictEqual(valid.length,12);
 const invalid=await collect(b47,{SOOT:{raw:100,source:'legacy',at:now}},async()=>[0x62,0x44,0xBE,0],now);
 assert.strictEqual(invalid.info.completed,0,'incorrect UDS DIDs must never produce native samples');
 console.log('DPF DEV native reference refresh: reuse, bounded retries, validation and errors PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});
