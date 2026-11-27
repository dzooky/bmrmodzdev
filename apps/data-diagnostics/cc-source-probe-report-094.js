'use strict';
const fs=require('fs'),path=require('path'),logic=require('./cc-source-probe-094');
const FILE='cc-probe-095.json',VERSION='0.1.95';
function safe(r){
 if(!r||!['wheelTrace','gearP','gearD'].includes(r.kind))return null;
 const x={kind:r.kind,at:String(r.at||'').slice(0,30),
  stage:String(r.stage||'unavailable').slice(0,60),
  errors:Array.isArray(r.errors)?r.errors.slice(0,8).map(t=>String(t).slice(0,95)):[]};
 if(r.kind==='wheelTrace'){
  x.ok=r.ok===true;x.sequence=String(r.sequence||'OEM guided ON/OFF').slice(0,120);x.mode=r.mode==='guided-oem'?'guided-oem':'legacy';x.onDetected=r.onDetected===true;x.offDetected=r.offDetected===true;x.warmthHoldMs=Number.isFinite(r.warmthHoldMs)?r.warmthHoldMs:null;
  x.samples=(r.samples||[]).slice(0,85).map(s=>({
   elapsedSec:Number.isFinite(s.elapsedSec)?s.elapsedSec:null,phase:String(s.phase||'').slice(0,24),
   at:String(s.at||'').slice(0,30),
   bytes:Array.isArray(s.bytes)&&s.bytes.length<=32&&s.bytes.every(v=>Number.isInteger(v)&&v>=0&&v<=255)?s.bytes:null,
   on:s.on===true?true:s.on===false?false:null,
   fitted:s.fitted===true?true:s.fitted===false?false:null,
   error:String(s.error||'').slice(0,85)
  }));
  x.transitions=logic.wheelTransitions(x.samples);
 }else{
  x.expected=r.kind==='gearD'?'D':'P';x.liveStageVerified=false;
  x.leverDObserved=r.leverDObserved===true;
  const source=r.sources||{};
  x.sources={BasicDataSet:String(source.BasicDataSet||'unavailable').slice(0,55),
   MDrive:String(source.MDrive||'unavailable').slice(0,55)};
  x.events=(r.events||[]).slice(0,30).map(e=>({
   at:String(e.at||'').slice(0,30),
   source:e.source==='BasicDataSet'?'BasicDataSet':'MDrive',
   field:e.source==='BasicDataSet'?'operationGearSelectorSwitch':'displayProgramGearbox',
   raw:e.raw===null?null:String(e.raw||'').slice(0,45),
   decoded:e.decoded===null?null:String(e.decoded||'').slice(0,35)
  }));
 }
 return x;
}
function create(file,io){
 const f=file||path.join(__dirname,'../../data',FILE),disk=io||fs;
 let rows={};
 try{const x=JSON.parse(disk.readFileSync(f,'utf8'));if(x.version===VERSION&&Array.isArray(x.captures))
  x.captures.forEach(t=>{const s=safe(t);if(s)rows[s.kind]=s;});}catch(_){}
 const snapshot=()=>({version:VERSION,readOnly:true,gearStageVerified:false,
  captures:['wheelTrace','gearP','gearD'].filter(k=>rows[k]).map(k=>rows[k])});
 function save(r){const x=safe(r);if(!x)throw Error('Invalid source capture');
  rows[x.kind]=x;const body=JSON.stringify(snapshot());
  if(Buffer.byteLength(body)>35000)throw Error('Source report too large');
  const tmp=f+'.tmp';disk.writeFileSync(tmp,body,{mode:0o600});disk.renameSync(tmp,f);return snapshot();
 }
 const envelope=()=>({schema:1,application:'bmrmodz-data-diagnostics',
  runMode:'cc-guided-oem-wheel-gear-sources-0.1.95',results:[],notes:{ccSourceProbe:snapshot()}});
 function lines(){
  const out=[];for(const x of snapshot().captures){
   out.push(x.kind+': '+x.stage+' / '+x.errors.join(' '));if(x.kind==='wheelTrace')out.push('OEM ON='+x.onDetected+' OFF='+x.offDetected+' / '+x.mode);
   if(x.samples){for(const s of x.samples)out.push(s.elapsedSec+'s '+(s.phase?s.phase+' ':'')+(s.bytes?s.bytes.map(v=>v.toString(16).padStart(2,'0')).join(' '):'ERROR '+s.error));
    out.push('Changed offsets='+x.transitions.map(t=>t.from+'-'+t.to+':'+t.offsets.join(',')).join(' / '));}
   if(x.events){out.push('Sources='+JSON.stringify(x.sources));
    for(const e of x.events)out.push(e.source+':'+e.raw+' '+e.decoded);
    out.push('Lever D observed='+x.leverDObserved+' / EGS stage NOT verified');}
  }
  return out.length?out:['No source captures'];
 }
 return {save,snapshot,envelope,lines};
}
module.exports={FILE,create,safe};
