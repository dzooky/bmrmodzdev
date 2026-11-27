'use strict';
// Manual, read-only MGU signal comparison. No gear actuation or inferred actual stage.
// Source reference: cruzen991/Cluster, apps/mx_classic_cluster/{main.js,gearmode.js}.
const BASIC='de.bmw.infrastructure.analytics.BasicDataSet';
const MDRIVE='de.bmw.infotainment.misc.MDrive';
const LEVER={0:'NA',1:'R',2:'N',3:'D',4:'M-',5:'M+',6:'M/S',7:'M',8:'L',14:'INIT',15:'INVALID'};
const MODE={0:'D-program',1:'S-program',2:'M-program',3:'L-program',4:'C-program',5:'B-program',7:'INVALID'};
function code(raw,map){
 const n=typeof raw==='number'&&Number.isInteger(raw)?raw:typeof raw==='string'?
  Object.keys(map).find(k=>map[k]===raw):undefined;
 return n===undefined?null:{raw:String(raw).slice(0,45),name:map[n]||'unknown'};
}
function observedValue(v,field){
 if(!v||typeof v!=='object')return null;
 const n=v[field];return typeof n==='number'&&Number.isFinite(n)||typeof n==='string'?n:null;
}
async function captureGear(expected,signals,options){
 const opts=options||{},now=opts.now||Date.now,delay=opts.delay||((ms)=>new Promise(r=>setTimeout(r,ms)));
 const duration=Number.isInteger(opts.durationMs)?Math.max(500,Math.min(opts.durationMs,15000)):12000;
 const report={kind:expected==='D'?'gearD':'gearP',at:new Date(now()).toISOString(),
  expected,stage:'unavailable',liveStageVerified:false,leverDObserved:false,
  sources:{BasicDataSet:'unavailable',MDrive:'unavailable'},events:[],errors:[]};
 if(expected!=='D'&&expected!=='P')return report;
 if(!signals||typeof signals.watch!=='function'){report.errors.push('watch-unavailable');return report;}
 let ended=false;
 const active=[];
 const add=(source,field,value)=>{
  if(ended||report.events.length>=30)return;
  const raw=observedValue(value,field),decode=source==='BasicDataSet'?code(raw,LEVER):code(raw,MODE);
  const event={at:new Date(now()).toISOString(),source,field,
   raw:raw===null?null:String(raw).slice(0,45),decoded:decode?decode.name:null};
  // Keep transition history but avoid spamming identical high-rate samples.
  const prev=report.events[report.events.length-1];
  if(prev&&prev.source===event.source&&prev.raw===event.raw)return;
  report.events.push(event);
  if(source==='BasicDataSet'&&decode&&decode.name==='D')report.leverDObserved=true;
 };
 async function subscribe(iface,name,field,member){
  try{
   const handler={};handler[field]=v=>add(name,member,v);
   const p=await signals.watch(iface,'1',handler,opts.log||{info(){},warn(){}});
   if(p&&p.error){report.sources[name]='watch-error';report.errors.push(name+':'+String(p.error).slice(0,65));
    if(p.shutdown)try{await Promise.resolve(p.shutdown());}catch(_){};return;}
   if(ended){if(p&&p.shutdown)try{await Promise.resolve(p.shutdown());}catch(_){};return;}
   active.push(p);report.sources[name]='watching';
  }catch(e){report.sources[name]='watch-error';report.errors.push(name+':'+String(e&&e.message||e).slice(0,70));}
 }
 try{
  // Concurrent and isolated: an unavailable service never blocks the other source.
  await Promise.all([
   subscribe(BASIC,'BasicDataSet','basicDataSet','operationGearSelectorSwitch'),
   subscribe(MDRIVE,'MDrive','dataDisplayGearbox','displayProgramGearbox')
  ]);
  if(!ended)await delay(duration);
 }finally{
  ended=true;
  for(const p of active)if(p&&p.shutdown)try{await Promise.resolve(p.shutdown());}catch(e){report.errors.push('shutdown:'+String(e).slice(0,45));}
 }
 for(const source of ['BasicDataSet','MDrive']){
  if(report.sources[source]==='watching')
   report.sources[source]=report.events.some(e=>e.source===source)?'sample':'no-sample';
 }
 report.stage=report.events.length?'signals-observed':'no-live-sample';
 // BasicDataSet lever D is only lever position, not independently verified
 // EGS actual stage. MDrive reports driving program, never P/R/N/D.
 return report;
}
function wheelBytes(reply){
 if(!Array.isArray(reply)||reply.length<8||reply.length>32||
  reply[0]!==0x62||reply[1]!==0xd0||reply[2]!==0x74)return null;
 return reply.slice(0,32);
}
async function captureWheel(signals,options){
 const opts=options||{},now=opts.now||Date.now;
 const delay=opts.delay||((ms)=>new Promise(r=>setTimeout(r,ms)));
 const times=opts.times||[0,5,10,15,20,25,30,35,40,45];
 const report={kind:'wheelTrace',at:new Date(now()).toISOString(),stage:'unavailable',ok:false,
  sequence:'OEM button ON near 5s; OEM button OFF near 35s; no UDS writes',
  samples:[],errors:[],requestedCount:times.length};
 const started=now();
 let diag=null;
 const make=()=>{const Diag=opts.Diag||require('./kit/diag').Diag;
  const d=new Diag(signals,opts.log||{info(){},warn(){}});
  d.quiet=true;d.busyLog=false;return d;};
 try{
  for(const second of times){
   const remaining=started+second*1000-now();
   if(remaining>0)await delay(remaining);
   const sample={elapsedSec:second,at:new Date(now()).toISOString(),bytes:null,
    on:null,fitted:null,error:null};
   // Initial read has one bounded reconnect if the TASU proxy is momentarily absent.
   for(let attempt=0;attempt<(second===0?2:1);attempt++){
    try{
     if(!diag||!diag.p){
      diag=make();await diag.init();
      if(!diag.p)throw Error('tasu-proxy-unavailable');
     }
     const accept=u=>Array.isArray(u)&&((u[0]===0x62&&u[1]===0xd0&&u[2]===0x74)||
      (u[0]===0x7f&&u[1]===0x22));
     const u=await diag.physical(0x40,0x22,[0xd0,0x74],1500,accept,
      {maxRetries:0,callTimeoutMs:2000,hardTimeoutMs:3500});
     if(!u)throw Error('timeout');
     if(u[0]===0x7f)throw Error('NRC-'+(u[2]===undefined?'unknown':u[2]));
     sample.bytes=wheelBytes(u);
     if(!sample.bytes)throw Error('invalid-D074');
     sample.on=u[3]===1?true:u[3]===0?false:null;
     sample.fitted=u[7]===1?true:u[7]===0?false:null;
     sample.error=null;break;
    }catch(e){
     sample.error=String(e&&e.message||e).slice(0,85);
     if(attempt===0&&second===0){
      if(diag&&diag.p&&diag.p.shutdown)try{await Promise.resolve(diag.p.shutdown());}catch(_){}
      diag=null;await delay(350);
     }
    }
   }
   report.samples.push(sample);
  }
  report.ok=report.samples.some(s=>s.bytes);
  report.stage=report.ok?'trace-collected':'all-reads-failed';
 }catch(e){report.errors.push(String(e&&e.message||e).slice(0,100));report.stage='trace-error';}
 finally{if(diag&&diag.p&&diag.p.shutdown)try{await Promise.resolve(diag.p.shutdown());}catch(_){}}
 return report;
}
function wheelTransitions(samples){
 const good=(samples||[]).filter(s=>Array.isArray(s.bytes));
 const out=[];for(let i=1;i<good.length;i++){
  const a=good[i-1],b=good[i],diff=[];
  for(let n=0;n<Math.max(a.bytes.length,b.bytes.length);n++)
   if(a.bytes[n]!==b.bytes[n])diff.push(n);
  if(diff.length)out.push({from:a.elapsedSec,to:b.elapsedSec,offsets:diff});
 }
 return out;
}
module.exports={BASIC,MDRIVE,LEVER,MODE,code,captureGear,captureWheel,wheelTransitions};
