'use strict';
const assert=require('assert');
const {compareAll,specFor,formatDifference,decode,summaryState}=require('./all-fields-compare');
const profiles=require('./dde-profiles');
(async()=>{
 const b57=profiles.forDde(profiles.B57),b47=profiles.forDde(profiles.B47);
 assert.strictEqual(specFor(b57).length,12);
 assert.strictEqual(specFor(b47).length,4);
 const specs=specFor(b57),now=Date.now(),samples={},raws={};
 for(const s of specs){raws[s.did]=s.len===1?10:s.len===2?100:10000;
  samples[s.key]={raw:raws[s.did],source:'legacy',at:now-1000};}
 const encode=s=>{
  let value=raws[s.did],bytes=Array(s.len).fill(0);
  for(let i=s.len-1;i>=0;i--){bytes[i]=value&255;value=Math.floor(value/256);}
  return [0x62,s.did>>8,s.did&255,...bytes];
 };
 let calls=0;
 const result=await compareAll(b57,samples,async(ecu,did,opts)=>{
  calls++;assert.strictEqual(ecu,0x12);assert.strictEqual(opts.withMeta,true);
  const spec=specs.find(s=>s.did===did);
  return {uds:encode(spec),at:new Date().toISOString()};
 },now);
 assert.strictEqual(calls,12);
 assert.strictEqual(result.ok,true);
 assert.strictEqual(result.matched,12);
 assert.ok(result.rows.every(x=>x.display==='OK'));
 const shift=await compareAll(b47,{
  SOOT:{raw:100,source:'legacy',at:now},ASH:{raw:100,source:'legacy',at:now},
  SINCE:{raw:1000,source:'legacy',at:now},AVERAGE:{raw:100,source:'legacy',at:now}
 },async(ecu,did)=>{
  const spec=specFor(b47).find(s=>s.did===did);
  const arr=encode(spec);
  if(did===0x44BE)arr[arr.length-1]+=1;
  return {uds:arr,at:new Date().toISOString()};
 },now);
 assert.strictEqual(shift.rows[0].status,'difference');
 assert.strictEqual(summaryState(shift),'Difference');
 assert.strictEqual(summaryState(result),'Responding');
 assert.strictEqual(shift.rows[0].display,'+0.015 g');
 assert.strictEqual(shift.rows[1].display,'OK');
 assert.strictEqual(formatDifference(-0.001,'km'),'-0.001 km');
 assert.strictEqual(formatDifference(0,'g'),'OK');
 assert.strictEqual(decode({uds:[0x62,0x44,0xBE,0,9]},specs[0]),9);
 assert.strictEqual(decode({uds:[0x7f,0x44,0xBE,0,9]},specs[0]),null);
 const missing=await compareAll(b57,{},async()=>{throw Error('unexpected ECU read');},now);
 assert.strictEqual(missing.missing,12);
 assert.strictEqual(summaryState(missing),'Incomplete');
 assert.strictEqual(summaryState({...shift,failed:1}),'Failed');
 assert.strictEqual(missing.rows[0].display,'N/A');
 console.log('DPF DEV all-fields comparison: 12 B57/4 B47, exact OK, delta and missing handling PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});
