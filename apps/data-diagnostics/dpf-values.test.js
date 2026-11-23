'use strict';
const assert=require('assert');
const {snapshot,decodeUds,identify,summary}=require('./dpf-values');
function response(did,values){return {ok:true,uds:[0x62,did>>8,did&255,...values]};}
function b32(n){return [(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255];}
async function main(){
  assert.strictEqual(identify(response(0xF150,[0x0F,0x1F,0xE8])).engine,'B57');
  assert.strictEqual(identify(response(0xF150,[0x0F,0x26,0x78])).engine,'B47');
  assert.strictEqual(identify(response(0xF150,[0x00,0x00,0x00])),null);
  assert.strictEqual(decodeUds(response(0x44BE,[0x01,0x00]),0x44BE,2,0.01525902).value,3.91);
  assert.strictEqual(decodeUds(response(0x44BF,b32(123450)),0x44BF,4,0.001).value,123.45);
  assert.strictEqual(decodeUds(response(0x44BE,[0x01]),0x44BE,2,0.01525902).ok,false);
  assert.strictEqual(decodeUds(response(0x44BD,[0x01,0x00]),0x44BE,2,1).ok,false);
  assert.strictEqual(decodeUds({ok:true,uds:[0x7F,0x22,0x31]},0x44BE,2,1).ok,false);
  for(const [index,averageDid,averageValue] of [
    [[0x0F,0x1F,0xE8],0x4B2F,b32(345600)],
    [[0x0F,0x26,0x78],0x44C7,[0x01,0x2C]]
  ]){
    const calls=[];
    const data=await snapshot(async req=>{
      calls.push(req);assert.strictEqual(req.op,'read');assert.strictEqual(req.ecu,0x12);
      const did=req.did;
      if(did===0xF150)return response(did,index);
      if(did===0x44BE)return response(did,[0,100]);
      if(did===0x44BD)return response(did,[0,90]);
      if(did===0x44BF)return response(did,b32(120000));
      if(did===averageDid)return response(did,averageValue);
      throw Error('unexpected DID');
    });
    assert.strictEqual(data.ok,true);
    assert.strictEqual(data.values.since,120);
    assert.strictEqual(data.values.average,averageDid===0x4B2F?345.6:300);
    assert.strictEqual(calls.length,5);
    assert.strictEqual(calls[4].did,averageDid);
    assert.ok(summary(data).includes('soot='));
    assert.strictEqual(JSON.stringify(data).includes('uds'),false);
  }
  let calls=0;
  const invalid=await snapshot(async req=>{calls++;return response(req.did,[0,0,0]);});
  assert.strictEqual(invalid.ok,false);
  assert.strictEqual(calls,1);
  console.log('DPF: B57/B47 profile, UDS length/endian/scaling, sanitized 5-read snapshots passed');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
