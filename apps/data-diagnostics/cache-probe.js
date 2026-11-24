'use strict';
// Manual, bounded read-only cache/coalescing probe. Uses the existing Tool UDS API.
// No raw UDS bytes, VIN or vehicle data are included in the result.
const ECU=0x78,DID=0xD8D7;
function number(v){return Number.isInteger(v)&&v>=0?v:0;}
function counters(reply){
 if(!reply||reply.ok!==true||!reply.readHealth||reply.readHealth.scope!=='data-tool-uds-only')throw new Error('Tool UDS status unavailable');
 const s=reply.readHealth.stats||{};
 return {sent:number(s.sent),coalesced:number(s.coalesced),cacheHits:number(s.cacheHits)};
}
async function run(request){
 const before=counters(await request({op:'status'}));
 const query={op:'read',ecu:ECU,did:DID};
 const both=await Promise.all([request(query),request(query)]);
 const third=await request(query);
 const afterReply=await request({op:'status'});
 const after=counters(afterReply);
 const delta={sent:after.sent-before.sent,coalesced:after.coalesced-before.coalesced,
  cacheHits:after.cacheHits-before.cacheHits};
 const replies=both.concat([third]);
 const valid=replies.every(r=>r&&r.ok===true&&r.ecu===ECU&&r.did===DID);
 const same=valid&&replies.every(r=>r.at===replies[0].at&&
  Array.isArray(r.uds)&&JSON.stringify(r.uds)===JSON.stringify(replies[0].uds));
 const shared=delta.coalesced+delta.cacheHits;
 const ok=valid&&same&&third.cached===true&&delta.sent>=0&&delta.sent<=1&&shared>=2;
 return {ok,validResponses:replies.filter(r=>r&&r.ok===true).length,
  sameSample:!!same,thirdCached:third.cached===true,
  physicalReads:delta.sent,coalesced:delta.coalesced,cacheHits:delta.cacheHits,
  sampleAgeMs:afterReply.readHealth.sampleAgeMs,
  outcome:!valid?'read-failed':!same?'samples-differ':delta.sent>1?'duplicate-physical-read':
   !third.cached?'cache-miss':shared<2?'not-reused':delta.sent===0?'existing-cache':'single-read'};
}
module.exports={run,ECU,DID};
