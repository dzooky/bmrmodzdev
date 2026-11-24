'use strict';
// Manual DEV comparison: compare each supported DDE profile field against its
// existing native TASU snapshot. Never initiate legacy ECU reads or polling.
const ECU=0x12,MAX_AGE_MS=90000;
function specFor(profile){
 if(!profile)return [];
 return profile.overview.concat(profile.detail).map(([key,did,len,factor,offset=0])=>({
  key,did,len,factor,offset,unit:
   key==='SOOT'||key==='ASH'?'g':
   key==='SINCE'||key==='AVERAGE'||key==='REMAINING'?'km':
   key==='PRESSURE'?'hPa':
   key==='TEMP'||key==='AVG TEMP'?'°C':
   key==='RUNTIME'?'s':'raw',
  scale:key==='SINCE'?profile.distanceFactor:
   key==='AVERAGE'?profile.averageFactor:
   key==='REMAINING'?1:1
 }));
}
function decode(reply,spec){
 const u=reply&&reply.uds;
 if(!u||!Array.isArray(u)||u.length!==spec.len+3||u[0]!==0x62||
  u[1]!==((spec.did>>8)&255)||u[2]!==(spec.did&255)||
  !u.every(b=>Number.isInteger(b)&&b>=0&&b<=255))return null;
 let raw=0;for(const b of u.slice(3))raw=raw*256+b;
 return raw;
}
function formatDifference(delta,unit){
 if(delta===0)return 'OK';
 const decimals=unit==='g'||unit==='km'||unit==='hPa'||unit==='°C'?3:0;
 // Never round a nonzero difference to zero (or falsely display OK).
 const value=decimals?Number(delta.toFixed(decimals)):delta;
 const shown=value===0?delta.toPrecision(3):value.toFixed(decimals);
 return (delta>0?'+':'')+shown+' '+unit;
}
async function compareAll(profile,samples,read,now){
 const at=Number.isFinite(now)?now:Date.now();
 const fields=specFor(profile);
 const rows=[];
 for(const spec of fields){
  const old=samples&&samples[spec.key];
  const age=old&&Number.isFinite(old.at)?Math.max(0,at-old.at):null;
  if(!old||old.source!=='legacy'||!Number.isInteger(old.raw)||age===null||age>MAX_AGE_MS){
   rows.push({key:spec.key,status:'no-sample',display:'N/A'});
   continue;
  }
  try{
   const tool=await read(ECU,spec.did,{timeoutMs:15000,withMeta:true});
   const raw=decode(tool,spec);
   if(raw===null||!tool.at||!Number.isFinite(Date.parse(tool.at))){
    rows.push({key:spec.key,status:'invalid',display:'FAIL'});continue;
   }
   const deltaRaw=raw-old.raw;
   const scale=spec.factor*spec.scale;
   const delta=deltaRaw*scale;
   rows.push({key:spec.key,status:deltaRaw===0?'ok':'difference',
    display:formatDifference(delta,spec.unit),difference:delta,
    legacyAgeMs:age,toolAgeMs:Math.max(0,Date.now()-Date.parse(tool.at))});
  }catch(_){rows.push({key:spec.key,status:'read-failed',display:'FAIL'});}
 }
 return {rows,ok:rows.length>0&&rows.every(r=>r.status==='ok'),
  matched:rows.filter(r=>r.status==='ok').length,
  different:rows.filter(r=>r.status==='difference').length,
  missing:rows.filter(r=>r.status==='no-sample').length,
  failed:rows.filter(r=>r.status==='invalid'||r.status==='read-failed').length};
}
// Distinguish a real ECU failure from a changed value or missing reference.
function summaryState(result){
 if(!result||!Array.isArray(result.rows)||result.rows.length===0)return 'Failed';
 if(result.failed>0)return 'Failed';
 if(result.different>0)return 'Difference';
 if(result.missing>0)return 'Incomplete';
 return 'Responding';
}
module.exports={compareAll,specFor,decode,formatDifference,summaryState,MAX_AGE_MS};
