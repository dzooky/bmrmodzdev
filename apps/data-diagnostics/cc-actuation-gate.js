'use strict';
// A fresh Data Tool belt gate before every manual native actuator test.
// P/R/N/D is still unverified; an operator must additionally confirm PARKED.
const {CASES}=require('./cc-actuation');
function decodeRear(reply,side){
 const u=reply&&reply.ok&&reply.uds;
 if(!Array.isArray(u)||u.length<8||u[0]!==0x62||u[1]!==0x40||u[2]!==0x53)return null;
 const n=u[side==='rearLeft'?5:7];
 return n>=130&&n<=150?'latched':n>=20&&n<=50?'unlatched':null;
}
async function check(id,request,now){
 const at=now||Date.now,spec=CASES[id];
 if(!spec)return {ok:false,stage:'unsupported-actuator'};
 try{
  if(spec.belt.startsWith('rear')){
   const reply=await request({op:'read',ecu:1,did:0x4053},{timeoutMs:12000});
   const state=decodeRear(reply,spec.belt);
   return {ok:state==='latched',stage:state==='latched'?'fresh-rear-latched':state||'rear-read-unavailable',
    source:'tool-uds-rear'};
  }
  const reply=await request({op:'ccNativeSnapshot'},{timeoutMs:21000});
  if(!reply||reply.ok!==true||!reply.sampledAt)return {ok:false,stage:'front-sample-unavailable'};
  const age=at()-Date.parse(reply.sampledAt);
  if(!Number.isFinite(age)||age<0||age>5000)return {ok:false,stage:'front-sample-stale'};
  const row=reply.fields&&reply.fields[spec.belt];
  const state=row&&row.valid===true?row.value:null;
  const gear=reply.fields&&reply.fields.gear;
  const selector=gear&&gear.valid===true&&['P','R','N','D'].includes(gear.value)?gear.value:null;
  // Passive data only. Do not infer D from RPM and do not gate wheel actuation
  // on a not-yet-verified gear source.
  return {ok:state==='latched',stage:state==='latched'?'fresh-front-latched':state||'front-read-unavailable',
   source:'tool-oap-front',ageMs:age,gearObservation:selector,
   gearSourceVerified:selector!==null};
 }catch(e){return {ok:false,stage:'belt-request-error',error:String(e&&e.message||e).slice(0,100)};}
}
module.exports={check,decodeRear};
