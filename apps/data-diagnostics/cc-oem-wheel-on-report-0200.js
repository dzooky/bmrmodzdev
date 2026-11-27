'use strict';
// Private sanitized four-attempt report, including rejected/unavailable attempts.
const fs=require('fs'),path=require('path');
const FILE='cc-oem-wheel-on-0200.json',VERSION='0.2.0';
const str=(v,n)=>String(v==null?'':v).slice(0,n);
const stamp=v=>str(v,30);
const state=v=>v&&typeof v==='object'?{at:stamp(v.at),
 heating:v.heating===true?true:v.heating===false?false:null,
 coded:v.coded===true?true:v.coded===false?false:null,
 available:v.available===true?true:v.available===false?false:null}:null;
function safe(v){
 if(!v||v.kind!=='oemWheelOn')return null;
 const x={kind:'oemWheelOn',startedAt:stamp(v.startedAt),finishedAt:stamp(v.finishedAt),
  status:['CAPTURED','PARTIAL','SKIP','FAIL'].includes(v.status)?v.status:'FAIL',
  stage:str(v.stage,65),requestAttempted:v.requestAttempted===true,
  requestAccepted:v.requestAccepted===true,reply:str(v.reply,40),
  before:state(v.before),after:state(v.after),afterButton:state(v.afterButton),
  offConfirmed:v.offConfirmed===true,finishConfirmed:v.finishConfirmed===true,
  cancelled:v.cancelled===true,
  kombi:['activated','deactivated','none','unknown'].includes(v.kombi)?v.kombi:'unknown',
  physical:['warm','cold','not-checked','unknown'].includes(v.physical)?v.physical:'unknown',
  oemButton:['activated','deactivated','none','not-pressed','unknown'].includes(v.oemButton)?v.oemButton:'unknown',
  samples:[],bdc:null,errors:Array.isArray(v.errors)?v.errors.slice(0,12).map(e=>str(e,100)):[],
  note:'OEM method fire-and-forget; request completion is not vehicle confirmation. No automatic OFF.'};
 if(Array.isArray(v.samples))x.samples=v.samples.slice(0,28).map(s=>({
  at:stamp(s.at),elapsedMs:Number.isFinite(s.elapsedMs)?s.elapsedMs:null,state:state(s.state)}));
 const b=v.bdc;
 if(b&&typeof b==='object'){
  x.bdc={status:str(b.status,25),error:str(b.error,100),bytes:null,
   on:b.on===true?true:b.on===false?false:null,led:b.led===true?true:b.led===false?false:null,
   currentAmps:Number.isFinite(b.currentAmps)?b.currentAmps:null};
  if(Array.isArray(b.bytes)&&b.bytes.length===8&&b.bytes.every(n=>Number.isInteger(n)&&n>=0&&n<=255))x.bdc.bytes=b.bytes.slice();
 }
 return x;
}
function create(file,io){
 const f=file||path.join(__dirname,'../../data',FILE),disk=io||fs;
 let attempts=[];
 try{const x=JSON.parse(disk.readFileSync(f,'utf8'));
  if(x.version===VERSION&&Array.isArray(x.attempts))attempts=x.attempts.slice(-4).map(safe).filter(Boolean);
 }catch(_){}
 const snapshot=()=>({version:VERSION,automaticControl:false,oemSynchronizationVerified:false,attempts:attempts.slice()});
 function save(r){
  const v=safe(r);if(!v)throw Error('Invalid OEM wheel activation result');
  const next=attempts.concat(v).slice(-4),data=JSON.stringify({...snapshot(),attempts:next});
  if(Buffer.byteLength(data)>30000)throw Error('OEM wheel report limit');
  disk.writeFileSync(f+'.tmp',data,{mode:0o600});disk.renameSync(f+'.tmp',f);
  attempts=next;return snapshot();
 }
 const envelope=()=>({schema:1,application:'bmrmodz-data-diagnostics',
  runMode:'cc-oem-wheel-on-manual-0.2.0',results:[],notes:{ccOemWheelOn:snapshot()}});
 function lines(){
  const out=[];
  for(const a of attempts){
   out.push(a.startedAt+' '+a.status+' '+a.stage+' / '+a.errors.join(' '));
   out.push('request='+a.requestAttempted+' accepted='+a.requestAccepted+' '+a.reply);
   out.push('OEM before '+JSON.stringify(a.before)+' after '+JSON.stringify(a.after));
   out.push('KOMBI='+a.kombi+' physical='+a.physical+' OEM-button='+a.oemButton);
   out.push('OFF sampled='+a.offConfirmed+' finished='+a.finishConfirmed+' cancelled='+a.cancelled);
   out.push('OEM after button '+JSON.stringify(a.afterButton)+' BDC '+JSON.stringify(a.bdc));
  }
  return out.length?out:['No OEM activation attempts'];
 }
 return {save,snapshot,envelope,lines};
}
module.exports={FILE,VERSION,safe,create};
