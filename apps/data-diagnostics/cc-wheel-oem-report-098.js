'use strict';
// Preserve bounded recent attempts including failures. No VIN or personal data.
const fs=require('fs'),path=require('path');
const FILE='cc-wheel-oem-098.json',VERSION='0.1.98';
const clip=(x,n)=>String(x==null?'':x).slice(0,n);
function safe(input){
 if(!input||input.kind!=='wheelOemSequence')return null;
 const o={kind:'wheelOemSequence',mode:'app-on-oem-buttons',
  startedAt:clip(input.startedAt,30),finishedAt:clip(input.finishedAt,30),
  status:['CAPTURED','PARTIAL','FAIL','SKIP'].includes(input.status)?input.status:'FAIL',
  stage:clip(input.stage,60),commandAccepted:input.commandAccepted===true,commandAt:clip(input.commandAt,30),
  notes:'Human press timestamps are acknowledgments, not switch telemetry. KOMBI message classification is manual. 60s expiry is not verified.',
  errors:(input.errors||[]).slice(0,8).map(x=>clip(x,100)),
  samples:(input.samples||[]).slice(0,70).map(s=>({
   elapsedSec:Number.isFinite(s.elapsedSec)?s.elapsedSec:null,
   phase:clip(s.phase,35),at:clip(s.at,30),
   bytes:Array.isArray(s.bytes)&&s.bytes.length<=16&&s.bytes.every(v=>Number.isInteger(v)&&v>=0&&v<=255)?s.bytes:null,
   on:s.on===true?true:s.on===false?false:null,
   fitted:s.fitted===true?true:s.fitted===false?false:null,error:clip(s.error,90)
  }))};
 for(const k of ['press1','press2']){
  const p=input[k];
  o[k]=p&&typeof p==='object'?{acknowledgedAt:clip(p.acknowledgedAt,30),
   elapsedSec:Number.isFinite(p.elapsedSec)?p.elapsedSec:null,
   kombi:['activated','deactivated','none','unknown'].includes(p.kombi)?p.kombi:'unknown'}:null;
 }
 return o;
}
function create(file,io){
 const f=file||path.join(__dirname,'../../data',FILE),disk=io||fs;
 let attempts=[];
 try{const x=JSON.parse(disk.readFileSync(f,'utf8'));
  if(x.version===VERSION&&Array.isArray(x.attempts))attempts=x.attempts.slice(-4).map(safe).filter(Boolean);
 }catch(_){}
 const snapshot=()=>({version:VERSION,automaticControl:false,oemSynchronizationVerified:false,attempts:attempts.slice()});
 function save(r){
  const v=safe(r);if(!v)throw Error('Invalid OEM wheel trace');
  const next=attempts.concat([v]).slice(-4),data=JSON.stringify({...snapshot(),attempts:next});
  if(Buffer.byteLength(data)>40000)throw Error('Wheel trace report limit');
  disk.writeFileSync(f+'.tmp',data,{mode:0o600});disk.renameSync(f+'.tmp',f);
  attempts=next;return snapshot();
 }
 const envelope=()=>({schema:1,application:'bmrmodz-data-diagnostics',
  runMode:'cc-wheel-oem-sequence-0.1.98',results:[],notes:{ccWheelOemSequence:snapshot()}});
 function lines(){
  const out=[];for(const x of attempts){
   out.push(x.startedAt+' '+x.status+' '+x.stage+' / '+x.errors.join(' '));
   out.push('command='+x.commandAccepted+' press1='+JSON.stringify(x.press1)+' press2='+JSON.stringify(x.press2));
   for(const s of x.samples)out.push(s.elapsedSec+'s '+s.phase+' '+(s.bytes?s.bytes.map(v=>v.toString(16).padStart(2,'0')).join(' '):'ERROR '+s.error));
  }
  return out.length?out:['No OEM sequence captures'];
 }
 return {save,snapshot,envelope,lines};
}
module.exports={FILE,VERSION,safe,create};
