'use strict';
// Manual, read-only VehicleInformation signal probe based on the public Redline
// kit/runtime/car.js source. No gear command, no inferred actual EGS stage.
const IFACE='de.bmw.infrastructure.VehicleInformation';
function stage(raw) {
 const map={P:'P',R:'R',N:'N',D:'D',1:'P',2:'R',3:'N',4:'D'};
 return Object.prototype.hasOwnProperty.call(map,raw)?map[raw]:null;
}
function selection(raw){
 const names={N:1,R:2,P:3,NP:4},s=String(raw);
 const n=typeof raw==='number'&&Number.isInteger(raw)?raw:
  Object.prototype.hasOwnProperty.call(names,s)?names[s]:
  /^_[1-9]$/.test(s)?4+Number(s.slice(1)):null;
 if(n===1)return {stage:'N',gear:0};
 if(n===2)return {stage:'R',gear:-1};
 if(n===3)return {stage:'P',gear:0};
 if(n===4)return {stage:null,gear:0};
 if(n>=5&&n<=13)return {stage:'D',gear:n-4};
 return null;
}
async function capture(expected,signals,options){
 const opts=options||{},now=opts.now||Date.now;
 const delay=opts.delay||((ms)=>new Promise(resolve=>setTimeout(resolve,ms)));
 const durationMs=Number.isInteger(opts.durationMs)?Math.max(500,Math.min(opts.durationMs,15000)):12000;
 const report={kind:'gear'+expected,at:new Date(now()).toISOString(),
  mode:'vehicle-information',expected,stage:'no-live-sample',liveStageVerified:false,
  sources:{statusGearboxDrive:'unavailable',DataPowerTrain2:'unavailable'},
  events:[],errors:[],matchingObservation:false,conflictingObservation:false};
 if(!['P','R','D'].includes(expected)||!signals||typeof signals.watch!=='function'){
  report.stage='invalid-request';return report;
 }
 let done=false;const subs=[];
 const add=(source,field,raw,decoded)=>{
  if(done||report.events.length>=24)return;
  const rawText=raw==null?null:String(raw).slice(0,45);
  const event={at:new Date(now()).toISOString(),source,field,raw:rawText,decoded:decoded||null};
  if(report.events.some(e=>e.source===source&&e.raw===rawText))return;
  report.events.push(event);
  if(decoded===expected)report.matchingObservation=true;
  if(decoded&&decoded!==expected)report.conflictingObservation=true;
 };
 const handlers={
  statusGearboxDrive:v=>{
   const raw=v&&v.statusActualStageDrive;
   add('statusGearboxDrive','statusActualStageDrive',raw,stage(raw));
  },
  DataPowerTrain2:v=>{
   const raw=v&&v.statusGearSelectionDrive,s=selection(raw);
   add('DataPowerTrain2','statusGearSelectionDrive',raw,s?s.stage:null);
  }
 };
 // Both event groups share the one VehicleInformation service subscription.
 try{
  let timedOut=false;
  const pending=Promise.resolve().then(()=>signals.watch(IFACE,'1',handlers,opts.log||{info(){},warn(){}}));
  const sub=await Promise.race([pending,new Promise(resolve=>setTimeout(()=>{timedOut=true;resolve(null);},3000))]);
  if(timedOut){
   report.stage='subscription-timeout';
   report.errors.push('VehicleInformation:subscription-timeout');
   pending.then(late=>{if(late&&late.shutdown)return Promise.resolve(late.shutdown());}).catch(()=>{});
  }else if(sub&&sub.error){
   report.stage='subscription-error';report.errors.push(String(sub.error).slice(0,95));
   if(sub.shutdown)await Promise.resolve(sub.shutdown());
  }else{
   if(sub&&sub.shutdown)subs.push(sub);
   report.sources.statusGearboxDrive='watching';report.sources.DataPowerTrain2='watching';
   await delay(durationMs);
   report.stage=report.events.length?'signals-observed':'no-live-sample';
  }
 }catch(e){report.stage='subscription-error';report.errors.push(String(e&&e.message||e).slice(0,95));}
 finally{
  done=true;
  for(const s of subs)try{await Promise.resolve(s.shutdown());}catch(e){report.errors.push('shutdown:'+String(e).slice(0,65));}
 }
 for(const source of ['statusGearboxDrive','DataPowerTrain2'])
  if(report.sources[source]==='watching')report.sources[source]=
   report.events.some(e=>e.source===source)?'sample':'no-sample';
 // A matching decoded value is evidence only for THIS observed source;
 // cross-vehicle and Tool-side EGS validation are still required.
 report.liveStageVerified=false; // selector observation is not independently verified EGS engagement
 return report;
}
module.exports={IFACE,stage,selection,capture};
