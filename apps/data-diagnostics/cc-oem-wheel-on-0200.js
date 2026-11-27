'use strict';
// Manual, foreground-only OEM SteeringWheelClimate ON proof.
// Exactly one bounded requestHeating(true) after a fresh OFF sample and
// independent caller belt gate. Never issues OFF or retries an ambiguous call.
// User physically controls OEM button; this test cannot guarantee automatic stop.
const BODY='de.bmw.body.steeringwheelcomfort.SteeringWheelClimate';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function find(v,key,depth){
 if(!v||typeof v!=='object'||depth>4)return null;
 if(Object.prototype.hasOwnProperty.call(v,key))return v;
 for(const k of Object.keys(v)){const r=find(v[k],key,depth+1);if(r)return r;}
 return null;
}
function state(raw){
 const x=find(raw,'heating',0);
 if(!x)return null;
 return {heating:typeof x.heating==='boolean'?x.heating:null,
  coded:typeof x.functionalityCoded==='boolean'?x.functionalityCoded:null,
  available:typeof x.availability==='boolean'?x.availability:null};
}
const err=e=>String(e&&e.message||e).replace(/[\r\n\t]/g,' ').slice(0,100);
async function run(options){
 const o=options||{},now=o.now||Date.now,delay=o.delay||sleep;
 const out={kind:'oemWheelOn',startedAt:new Date(now()).toISOString(),finishedAt:'',
  status:'SKIP',stage:'not-confirmed',requestAttempted:false,requestAccepted:false,
  reply:'',before:null,after:null,afterButton:null,kombi:'unknown',physical:'unknown',
  oemButton:'unknown',finishConfirmed:false,offConfirmed:false,cancelled:false,samples:[],bdc:null,errors:[],note:'Method may be fire-and-forget; request completion does not prove heating. OEM button and KOMBI are manually reported.'};
 const mark=(v)=>{out.stage=v;if(typeof o.onStage==='function')try{o.onStage(v);}catch(_){}};
 if(o.confirmed!==true||o.beltGate!==true||!o.signals||typeof o.signals.watch!=='function'||typeof o.signals.call!=='function'||typeof o.ask!=='function')return out;
 let sub=null,live=null,liveAt=0,ended=false,onObservedAt=0,offObservedAt=0;
 const update=raw=>{
  if(ended)return;
  const s=state(raw);
  if(!s)return;
  live=s;liveAt=now();
  if(out.requestAttempted&&s.heating===true)onObservedAt=liveAt;
  if(onObservedAt>0&&s.heating===false)offObservedAt=liveAt;
  if(out.samples.length<28)out.samples.push({at:new Date(liveAt).toISOString(),
   elapsedMs:liveAt-Date.parse(out.startedAt),state:s});
 };
 // Vehicle's SOME/IP proxy does not expose get:heatingState. Only the
 // watch callback is a supported observation path on this platform.
 // Bounded wait: never send an ON request without a recent valid OFF sample.
 async function awaitInitialState(){
  for(let i=0;i<6;i++){
   if(live&&now()-liveAt>=0&&now()-liveAt<=3000)return true;
   await delay(1000);
  }
  return !!(live&&now()-liveAt>=0&&now()-liveAt<=3000);
 }
 const snapshot=()=>live?{...live,at:new Date(liveAt).toISOString()}:null;
 async function ask(phase,values){
  mark(phase);
  let result;
  // Manual phases have no elapsed-time cutoff. Only a user tap advances.
  try{result=await o.ask(phase);}catch(e){out.errors.push(phase+':'+err(e));}
  if(result==='cancelled')return 'cancelled';
  return values.includes(result)?result:'unknown';
 }
 function cancelled(){out.cancelled=true;out.status='PARTIAL';mark('cancelled');}
 async function observeOff(){
  // After hardware-button OFF, only passive heatingState callbacks may prove OFF.
  for(let i=0;i<5;i++){
   if(live&&live.heating===false&&offObservedAt>0)return snapshot();
   await delay(600);
  }
  return live&&offObservedAt>0&&live.heating===false?snapshot():null;
 }
 async function bdc(){
  if(o.Diag===false)return null;
  let d=null;
  try{
   const Diag=o.Diag||require('./kit/diag').Diag;
   d=new Diag(o.signals,o.log||{info(){},warn(){}});
   d.quiet=true;d.busyLog=false;await d.init();if(!d.p)throw Error('tasu-proxy-unavailable');
   const u=await d.physical(0x40,0x22,[0xd0,0x74],1500,
    x=>Array.isArray(x)&&((x[0]===0x62&&x[1]===0xd0&&x[2]===0x74)||(x[0]===0x7f&&x[1]===0x22)),
    {maxRetries:0,callTimeoutMs:2000,hardTimeoutMs:3500});
   if(!Array.isArray(u)||u.length<8||u[0]!==0x62||u[1]!==0xd0||u[2]!==0x74)throw Error('invalid-D074');
   return {status:'sample',bytes:u.slice(0,8),on:u[3]===1,led:u[4]===1,currentAmps:u[5]/10};
  }catch(e){return {status:'read-failed',error:err(e)};}
  finally{if(d&&d.p&&d.p.shutdown)try{await Promise.resolve(d.p.shutdown());}catch(_){}}
 }
 try{
  mark('watch-oem');
  sub=await o.signals.watch(BODY,'1',{heatingState:update},o.log||{info(){},warn(){}});
  if(!sub||sub.available===false||sub.error||!sub.proxy){
   mark('oem-unavailable');if(sub&&sub.error)out.errors.push(err(sub.error));return out;
  }
  await awaitInitialState();
  if(!live||now()-liveAt<0||now()-liveAt>3000){
   mark('no-fresh-oem-state');return out;
  }
  out.before=snapshot();
  if(live.coded!==true||live.available!==true||live.heating!==false){
   mark('not-ready-off');return out;
  }
  // No alternate requestors, repeated writes or speculative fallback routes.
  mark('request-on');
  out.requestAttempted=true;
  const payload={requestor:[0,0,0,0,0],heating:true};
  try{
   const r=await o.signals.call(sub.proxy,'requestHeating',payload,3000);
   out.requestAccepted=true;out.reply=r===undefined?'no-method-reply':'returned';
  }catch(e){out.errors.push('request:'+err(e));mark('request-error');return out;}
  for(let i=0;i<5;i++)await delay(1000);
  out.after=snapshot();
  // User feedback is captured even if no state update was delivered.
  out.kombi=await ask('kombi-on',['activated','deactivated','none']);
  if(out.kombi==='cancelled'){cancelled();return out;}
  out.physical=await ask('physical-heat',['warm','cold','not-checked']);
  if(out.physical==='cancelled'){cancelled();return out;}
  const press=await ask('press-oem-button',['pressed']);
  if(press==='cancelled'){cancelled();return out;}
  if(press==='pressed'){
   out.oemButton=await ask('kombi-after-button',['activated','deactivated','none']);
   if(out.oemButton==='cancelled'){cancelled();return out;}
   out.afterButton=await observeOff();
   out.offConfirmed=!!(out.afterButton&&out.afterButton.heating===false);
   out.bdc=await bdc();
  }else{
   out.oemButton='not-pressed';out.errors.push('OEM-button-not-confirmed');
   // No automatic OFF: original BMW button is the only test stop.
   out.bdc=await bdc();
  }
  const done=await ask('finish-test',['finish']);
  if(done==='cancelled'){cancelled();return out;}
  out.finishConfirmed=done==='finish';
  out.status='CAPTURED';mark('captured');
 }catch(e){out.status=out.requestAttempted?'PARTIAL':'FAIL';mark('failed');out.errors.push(err(e));}
 finally{
  ended=true;
  if(sub&&sub.shutdown)try{await Promise.resolve(sub.shutdown());}catch(e){out.errors.push('shutdown:'+err(e));}
  out.finishedAt=new Date(now()).toISOString();
  if(out.requestAttempted&&out.status==='SKIP')out.status='PARTIAL';
 }
 return out;
}
module.exports={BODY,state,run};
