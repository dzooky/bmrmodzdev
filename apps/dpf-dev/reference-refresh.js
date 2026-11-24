'use strict';
// DEV-only, user-triggered reference completion. Never schedules background reads.
// Only fields without a validated recent legacy sample are read through native TASU.
const {specFor,MAX_AGE_MS}=require('./all-fields-compare');
const ECU=0x12;
function current(sample,now){
 return !!sample&&sample.source==='legacy'&&Number.isInteger(sample.raw)&&
  Number.isFinite(sample.at)&&sample.at<=now&&now-sample.at<=MAX_AGE_MS;
}
async function collect(profile,readings,nativeRead,now){
 const snapshots={};
 for(const [key,value] of Object.entries(readings||{}))snapshots[key]={...value};
 const when=Number.isFinite(now)?now:Date.now();
 const needed=specFor(profile).filter(spec=>!current(snapshots[spec.key],when));
 const info={attempted:0,completed:0,missing:needed.length};
 for(const spec of needed){
  info.attempted++;
  try{
   const uds=await nativeRead(ECU,spec.did);
   if(!Array.isArray(uds)||uds.length!==spec.len+3||uds[0]!==0x62||
    uds[1]!==((spec.did>>8)&255)||uds[2]!==(spec.did&255)||
    !uds.every(b=>Number.isInteger(b)&&b>=0&&b<=255))continue;
   let raw=0;for(const b of uds.slice(3))raw=raw*256+b;
   snapshots[spec.key]={raw,source:'legacy',at:Date.now(),
     value:raw*spec.factor+spec.offset};
   info.completed++;
  }catch(_){ /* failure stays N/A; do not fabricate a sample */ }
 }
 return {snapshots,info};
}
module.exports={collect,current};
