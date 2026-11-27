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
   // A missing BMW SOME/IP interface must not stall this bounded foreground test.
   let timedOut=false;
   const pending=Promise.resolve().then(()=>signals.watch(iface,'1',handler,opts.log||{info(){},warn(){}}));
   const p=await Promise.race([pending,new Promise(resolve=>setTimeout(()=>{
    timedOut=true;resolve(null);
   },3000))]);
   if(timedOut){
    report.sources[name]='watch-timeout';report.errors.push(name+':subscription-timeout');
    pending.then(late=>{if(late&&late.shutdown)return Promise.resolve(late.shutdown());}).catch(()=>{});
    return;
   }
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

/**
 * Operator-guided OEM wheel switch observation.
 * Reads BDC DID D074 only: never sends an actuator command.
 * The UI prompts are driven by observed state, not the operator's stopwatch.
 */
async function captureGuidedWheel(signals,options){
 const opts=options||{},now=opts.now||Date.now;
 const delay=opts.delay||((ms)=>new Promise(resolve=>setTimeout(resolve,ms)));
 const pollMs=Number.isInteger(opts.pollMs)?Math.max(500,Math.min(opts.pollMs,5000)):2000;
 const onLimitMs=Number.isInteger(opts.onLimitMs)?Math.max(2000,Math.min(opts.onLimitMs,120000)):60000;
 const offLimitMs=Number.isInteger(opts.offLimitMs)?Math.max(2000,Math.min(opts.offLimitMs,120000)):60000;
 const warmthMs=Number.isInteger(opts.warmthMs)?Math.max(0,Math.min(opts.warmthMs,90000)):60000;
 const notify=(phase,detail)=>{if(typeof opts.onStage==='function')opts.onStage(phase,detail||'');};
 const report={kind:'wheelTrace',at:new Date(now()).toISOString(),stage:'unavailable',
  ok:false,mode:'guided-oem',sequence:'Observe OFF; prompt OEM ON; hold for warmth; prompt OEM OFF; detect OFF',
  samples:[],errors:[],onDetected:false,offDetected:false,warmthHoldMs:warmthMs};
 const begin=now();
 let diag=null;
 const make=()=>{const Diag=opts.Diag||require('./kit/diag').Diag;
  const d=new Diag(signals,opts.log||{info(){},warn(){}});d.quiet=true;d.busyLog=false;return d;};
 async function read(phase){
  const sample={elapsedSec:Math.round((now()-begin)/1000),at:new Date(now()).toISOString(),
   phase,bytes:null,on:null,fitted:null,error:null};
  // Recover once from a transient OAP/TASU failure.
  for(let attempt=0;attempt<2;attempt++){
   try{
    if(!diag||!diag.p){diag=make();await diag.init();if(!diag.p)throw Error('tasu-proxy-unavailable');}
    const accept=u=>Array.isArray(u)&&((u[0]===0x62&&u[1]===0xd0&&u[2]===0x74)||
     (u[0]===0x7f&&u[1]===0x22));
    const u=await diag.physical(0x40,0x22,[0xd0,0x74],1500,accept,
     {maxRetries:0,callTimeoutMs:2000,hardTimeoutMs:3500});
    if(!u)throw Error('timeout');
    if(u[0]===0x7f)throw Error('NRC-'+(u[2]===undefined?'unknown':u[2]));
    sample.bytes=wheelBytes(u);if(!sample.bytes)throw Error('invalid-D074');
    sample.on=u[3]===1?true:u[3]===0?false:null;
    sample.fitted=u[7]===1?true:u[7]===0?false:null;
    sample.error=null;break;
   }catch(e){
    sample.error=String(e&&e.message||e).slice(0,85);
    if(attempt===0){if(diag&&diag.p&&diag.p.shutdown)try{await Promise.resolve(diag.p.shutdown());}catch(_){}
     diag=null;await delay(350);}
   }
  }
  if(report.samples.length<85)report.samples.push(sample);
  return sample;
 }
 async function waitFor(target,phase,limitMs){
  const deadline=now()+limitMs;
  while(now()<=deadline){
   const s=await read(phase);
   if(s.on===target)return s;
   if(now()>=deadline)break;
   notify(phase,'Waiting for BDC '+(target?'ON':'OFF'));
   await delay(Math.min(pollMs,Math.max(1,deadline-now())));
  }
  return null;
 }
 try{
  notify('baseline','Leave OEM wheel heating OFF');
  const first=await read('baseline');
  if(first.on!==false){report.stage=first.on===true?'start-wheel-must-be-off':'baseline-unavailable';
   notify('failed',report.stage);return report;}
  if(first.fitted!==true){report.stage='wheel-not-confirmed-fitted';notify('failed',report.stage);return report;}
  notify('turn-on','Press the original BMW wheel heating button NOW');
  const on=await waitFor(true,'turn-on',onLimitMs);
  if(!on){report.stage='on-timeout';notify('failed','ON state not detected');return report;}
  report.onDetected=true;
  notify('warmth','OEM ON detected. Feel the wheel; keep heating ON');
  const holdUntil=now()+warmthMs;
  while(now()<holdUntil){
   await delay(Math.min(5000,Math.max(1,holdUntil-now())));
   const s=await read('warmth');
   if(s.on===false){report.stage='early-off';notify('failed','Heating turned OFF before requested');return report;}
   notify('warmth','Heating ON. Time left '+Math.ceil(Math.max(0,holdUntil-now())/1000)+'s');
  }
  notify('turn-off','Press the original BMW wheel heating button OFF NOW');
  const off=await waitFor(false,'turn-off',offLimitMs);
  if(!off){report.stage='off-timeout';notify('failed','OFF state not detected');return report;}
  report.offDetected=true;report.ok=true;report.stage='on-off-confirmed';
  notify('completed','OEM ON and OFF both detected');
 }catch(e){report.stage='trace-error';report.errors.push(String(e&&e.message||e).slice(0,100));
  notify('failed',report.stage);}
 finally{if(diag&&diag.p&&diag.p.shutdown)try{await Promise.resolve(diag.p.shutdown());}catch(_){}}
 return report;
}

module.exports={BASIC,MDRIVE,LEVER,MODE,code,captureGear,captureWheel,captureGuidedWheel,wheelTransitions};
