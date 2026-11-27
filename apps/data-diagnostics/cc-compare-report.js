'use strict';
const fs=require('fs'),path=require('path'),logic=require('./cc-compare');
const FILE='cc-compare-093.json',VERSION='0.1.93';
function safe(record){
 if(!record||logic.FIELDS.indexOf(record.kind)<0)return null;
 const x={kind:record.kind,at:String(record.at||'').slice(0,32),
  ok:record.ok===true,stage:String(record.stage||'unavailable').slice(0,70),
  error:String(record.error||'').slice(0,120)};
 if(x.kind.startsWith('wheel')){
  const w=record.wheel;
  x.wheel=w&&Array.isArray(w.bytes)&&w.bytes.length>=8&&w.bytes.length<=32&&
   w.bytes.every(v=>Number.isInteger(v)&&v>=0&&v<=255)?
   {bytes:w.bytes.slice(),on:w.on===true?true:w.on===false?false:null,
    fitted:w.fitted===true?true:w.fitted===false?false:null}:null;
  x.trace=Array.isArray(record.trace)?record.trace.slice(0,6).map(t=>({
   at:String(t.at||'').slice(0,32),request:t.request==='22 D0 74'?'22 D0 74':null,
   response:Array.isArray(t.response)?t.response.slice(0,32).filter(v=>Number.isInteger(v)&&v>=0&&v<=255):null
  })):[];
 }else{
  x.expected=record.kind==='gearP'?'P':'D';
  x.gear=['P','R','N','D'].includes(record.gear)?record.gear:null;
  x.source=record.source==='oap-native-provider'?record.source:null;
  x.freshnessMs=Number.isFinite(record.freshnessMs)?Math.round(record.freshnessMs):null;
  const a=record.audit||{};
  x.audit={stage:String(a.stage||'unknown').slice(0,65),
   catalogStatus:String(a.catalogStatus||'unknown').slice(0,65),
   exactStatus:String(a.exactStatus||'unknown').slice(0,65),
   instance1:a.instance1===true,aclRegistered:a.aclRegistered===true,aclStaged:a.aclStaged===true,
   vehicleRequests:0};
 }
 return x;
}
function create(file,io){
 const f=file||path.join(__dirname,'../../data',FILE),disk=io||fs;
 let rows={};
 try{const x=JSON.parse(disk.readFileSync(f,'utf8'));if(x.version===VERSION&&Array.isArray(x.captures))
  x.captures.forEach(t=>{const s=safe(t);if(s)rows[s.kind]=s;});}catch(_){}
 const snapshot=()=>{const captures=logic.FIELDS.filter(k=>rows[k]).map(k=>rows[k]);
  return {version:VERSION,mode:'read-only-comparison',captures,
   wheelComparison:logic.compare(rows.wheelOff,rows.wheelOn),
   gearSourceVerified:!!(rows.gearP&&rows.gearP.ok&&rows.gearD&&rows.gearD.ok)};};
 function save(r){
  const x=safe(r);if(!x)throw Error('Invalid capture');
  rows[x.kind]=x;const body=JSON.stringify(snapshot());
  if(Buffer.byteLength(body)>16000)throw Error('Comparison report exceeds bound');
  const tmp=f+'.tmp';disk.writeFileSync(tmp,body,{mode:0o600});disk.renameSync(tmp,f);return snapshot();
 }
 function envelope(){
  return {schema:1,application:'bmrmodz-data-diagnostics',
   runMode:'cc-wheel-gear-comparison-0.1.93',results:[],notes:{ccComparison:snapshot()}};
 }
 function lines(){
  const s=snapshot(),out=[];
  for(const x of s.captures){
   out.push(x.kind+': '+x.stage+' / '+x.error);
   if(x.wheel)out.push('UDS='+x.wheel.bytes.map(v=>v.toString(16).padStart(2,'0')).join(' ')+' on='+x.wheel.on);
   if(x.expected)out.push('Expected='+x.expected+' observed='+(x.gear||'none')+' source='+(x.source||'unavailable'));
   if(x.audit)out.push('Audit='+x.audit.stage+' instance='+x.audit.instance1+' ACL='+x.audit.aclRegistered);
  }
  out.push('Wheel changed offsets='+s.wheelComparison.differences.map(x=>x.offset).join(','));
  out.push('Gear validated='+s.gearSourceVerified);
  return out;
 }
 return {save,snapshot,envelope,lines};
}
module.exports={FILE,create,safe};
