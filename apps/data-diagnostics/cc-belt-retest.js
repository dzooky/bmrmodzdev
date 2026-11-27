'use strict';
// A single Tool-owned snapshot after the operator changes seat-belt states.
// No direct ACSM read, ECU probe, polling, or implied gearbox measurement.
const FIELDS=['frontLeft','frontRight'];
function fieldsOf(x){return x&&x.fields||{};}
function state(s,key){const x=fieldsOf(s)[key];return x&&x.valid===true&&
 (x.value==='latched'||x.value==='unlatched')?x.value:null;}
function compare(before,after){
 const result={ok:false,stage:'missing-sample',changed:[],unchanged:[],before:{},after:{},
  sampledAt:after&&after.sampledAt||null};
 if(!before||before.ok!==true||!after||after.ok!==true)return result;
 if(!before.sampledAt||!after.sampledAt||before.sampledAt===after.sampledAt){
  result.stage='same-sample';return result;
 }
 const start=Date.parse(before.sampledAt),end=Date.parse(after.sampledAt);
 if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start){
  result.stage='non-monotonic-sample';return result;
 }
 for(const key of FIELDS){
  const first=state(before,key),second=state(after,key);
  result.before[key]=first;result.after[key]=second;
  if(!first||!second){result.stage='invalid-contact';return result;}
  (first===second?result.unchanged:result.changed).push(key);
 }
 result.ok=true;result.stage=result.changed.length?'changed':'unchanged';
 return result;
}
async function run(request,previous){
 let next;
 try{next=await request({op:'ccNativeSnapshot'},{timeoutMs:21000});}
 catch(e){return {ok:false,stage:'request-error',error:String(e&&e.message||e).slice(0,80)};}
 if(!next||next.ok!==true)return {ok:false,stage:next&&next.stage||'provider-unavailable'};
 return Object.assign(compare(previous,next),{sample:next});
}
module.exports={run,compare};
