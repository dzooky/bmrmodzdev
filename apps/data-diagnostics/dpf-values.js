'use strict';
// Read-only DPF snapshot. DID/length/factors mirror dzooky/bmrmodz
// apps/dpf/dde-profiles.js. No raw UDS values are retained in the report.
const PROFILES=Object.freeze({
  '0F1FE8':{engine:'B57',averageDid:0x4B2F,averageLength:4,averageFactor:0.001},
  '0F2678':{engine:'B47',averageDid:0x44C7,averageLength:2,averageFactor:1}
});
const ECU=0x12;
function decodeUds(reply,did,length,factor){
  const bytes=reply&&reply.uds;
  if(reply&&reply.ok===false)return {ok:false,error:String(reply.error||'ECU read failed').slice(0,70)};
  if(!reply||reply.ok!==true||!Array.isArray(bytes)||bytes.length!==length+3||
    bytes[0]!==0x62||bytes[1]!==did>>8||bytes[2]!==did&255||
    !bytes.every(b=>Number.isInteger(b)&&b>=0&&b<=255))
    return {ok:false,error:'Unexpected UDS response length or DID'};
  let n=0;
  for(let i=3;i<bytes.length;i++)n=n*256+bytes[i];
  return {ok:true,value:Math.round(n*factor*100)/100};
}
function identify(reply){
  const bytes=reply&&reply.uds;
  if(!reply||reply.ok!==true||!Array.isArray(bytes)||bytes.length<6||
    bytes[0]!==0x62||bytes[1]!==0xF1||bytes[2]!==0x50)
    return null;
  const id=bytes.slice(3,6).map(b=>b.toString(16).padStart(2,'0')).join('').toUpperCase();
  return PROFILES[id]||null;
}
async function snapshot(request){
  const read=did=>request({op:'read',ecu:ECU,did},{timeoutMs:15000});
  const profile=identify(await read(0xF150));
  if(!profile)return {ok:false,engine:null,error:'Unsupported or unavailable DDE identity'};
  const fields=[
    ['soot',0x44BE,2,0.01525902],
    ['ash',0x44BD,2,0.01525902],
    ['since',0x44BF,4,0.001],
    ['average',profile.averageDid,profile.averageLength,profile.averageFactor]
  ];
  const values={};
  for(const [name,did,len,factor] of fields){
    const r=decodeUds(await read(did),did,len,factor);
    if(!r.ok)return {ok:false,engine:profile.engine,error:name+': '+r.error};
    values[name]=r.value;
  }
  return {ok:true,engine:profile.engine,values,units:{soot:'g',ash:'g',since:'km',average:'km'}};
}
function summary(dpf){
  if(!dpf||dpf.ok!==true)return 'DPF unavailable';
  return 'DPF '+dpf.engine+' soot='+dpf.values.soot+'g ash='+dpf.values.ash+
    'g since='+dpf.values.since+'km avg='+dpf.values.average+'km';
}
module.exports={snapshot,decodeUds,identify,summary,PROFILES};
