'use strict';
const assert=require('assert');
const {run,ECU,DID}=require('./cache-probe');
function makeMock(mode){
 let sent=0,coalesced=0,cacheHits=0,cache=null,pending=null;
 async function request(req){
  if(req.op==='status')return {ok:true,readHealth:{scope:'data-tool-uds-only',sampleAgeMs:9,stats:{sent,coalesced,cacheHits}}};
  assert.deepStrictEqual(req,{op:'read',ecu:ECU,did:DID});
  if(cache){cacheHits++;return Object.assign({cached:true},cache);}
  if(pending){coalesced++;return pending;}
  sent++;
  pending=new Promise(resolve=>setTimeout(()=>{
   cache={ok:true,ecu:ECU,did:DID,at:'2026-11-24T14:00:00Z',uds:[0x62,0xd8,0xd7,1]};
   resolve(cache);
  },10));
  const reply=await pending;pending=null;return reply;
 }
 if(mode==='warm')cache={ok:true,ecu:ECU,did:DID,at:'2026-11-24T14:00:00Z',uds:[0x62,0xd8,0xd7,1]};
 return request;
}
(async()=>{
 const cold=await run(makeMock());
 assert.strictEqual(cold.ok,true);
 assert.deepStrictEqual([cold.physicalReads,cold.coalesced,cold.cacheHits],[1,1,1]);
 assert.strictEqual(cold.validResponses,3);
 const warm=await run(makeMock('warm'));
 assert.strictEqual(warm.ok,true);
 assert.deepStrictEqual([warm.physicalReads,warm.coalesced,warm.cacheHits],[0,0,3]);
 const bad=await run(async req=>req.op==='status'?
  {ok:true,readHealth:{scope:'data-tool-uds-only',stats:{sent:0,coalesced:0,cacheHits:0}}}:
  {ok:false,error:'read failed'});
 assert.strictEqual(bad.ok,false);
 assert.strictEqual(bad.outcome,'read-failed');
 console.log('Diagnostics cache probe: shared request, warm cache and failed read handled');
})().catch(e=>{console.error(e);process.exitCode=1;});
