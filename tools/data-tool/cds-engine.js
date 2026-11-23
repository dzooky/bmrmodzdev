'use strict';
// One shared CDS child per Data Tool. Leases are renewed only by explicit
// consumer demand; status/snapshot reads never extend a subscription.
const {spawn}=require('child_process'),path=require('path');
const FIELDS=['oil','coolant','rpm'];
function createEngine(options){
  const opts=options||{},now=opts.now||Date.now;
  const spawnProcess=opts.spawn||spawn,worker=opts.worker||path.join(__dirname,'cds-stream-worker.js');
  const leaseMs=opts.leaseMs||3000,staleMs=opts.staleMs||2000;
  const leases=new Map(),cache={},updates={oil:0,coolant:0,rpm:0};
  const stats={starts:0,stops:0,invalid:0,errors:0,samples:0};
  let child=null,ready=false,closed=false,buffer='',error=null;
  function active(){
    const clock=now();
    for(const [id,expiry] of leases)if(expiry<=clock)leases.delete(id);
    return leases.size;
  }
  function stop(){
    if(!child)return;
    const previous=child;
    child=null;ready=false;buffer='';
    stats.stops++;
    try{previous.kill('SIGTERM');}catch(_){}
    const hard=setTimeout(()=>{try{previous.kill('SIGKILL');}catch(_){}},500);
    if(hard.unref)hard.unref();
  }
  function event(message,source){
    if(source!==child||!message||typeof message!=='object')return;
    if(message.type==='ready'){ready=true;return;}
    if(message.type==='error'){stats.errors++;error=String(message.error||'CDS stream error').slice(0,140);stop();return;}
    if(message.type==='invalid'){stats.invalid++;return;}
    if(message.type!=='sample')return;
    const keys=message.field==='statusEngineTemperature'?['oil','coolant']:
      message.field==='statusEngineSpeed2'?['rpm']:[];
    if(!keys.length)return;
    if(!message.value||keys.some(k=>typeof message.value[k]!=='number'||!Number.isFinite(message.value[k]))){
      stats.invalid++;return;
    }
    const at=now();
    keys.forEach(k=>{cache[k]=message.value[k];updates[k]=at;});
    stats.samples++;
  }
  function start(){
    if(child||closed)return;
    error=null;ready=false;buffer='';
    const instance=spawnProcess(process.execPath,[worker],{stdio:['ignore','pipe','ignore'],env:process.env});
    child=instance;stats.starts++;
    instance.stdout.setEncoding('utf8');
    instance.stdout.on('data',chunk=>{
      if(instance!==child)return;
      buffer+=chunk;
      if(buffer.length>8192){error='CDS worker output exceeded limit';stats.errors++;stop();return;}
      let index;
      while((index=buffer.indexOf('\n'))>=0){
        const line=buffer.slice(0,index);buffer=buffer.slice(index+1);
        try{event(JSON.parse(line),instance);}catch(_){stats.errors++;error='Invalid CDS worker output';stop();return;}
      }
    });
    instance.on('error',e=>{if(instance===child){error=String(e&&e.message||e).slice(0,140);stats.errors++;stop();}});
    instance.on('exit',()=>{if(instance===child){error='CDS worker exited';stats.errors++;child=null;ready=false;}});
  }
  function demand(id){
    if(closed)return {ok:false,error:'CDS engine closed'};
    if(id!=='diagnostics')return {ok:false,error:'Consumer is not allowlisted'};
    active();
    leases.set(id,now()+leaseMs);
    if(!child)start();
    return status();
  }
  function status(){
    const count=active();
    const clock=now();
    const fields={};
    FIELDS.forEach(k=>{
      const age=updates[k]?Math.max(0,clock-updates[k]):null;
      fields[k]={valid:age!==null&&age<=staleMs,ageMs:age};
    });
    return {ok:true,mode:'request-driven',running:!!child,ready,consumers:count,
      fields,stats:Object.assign({},stats),error};
  }
  function snapshot(){
    const state=status(),values={};
    FIELDS.forEach(k=>{if(state.fields[k].valid)values[k]=cache[k];});
    state.values=values;
    return state;
  }
  function release(id){
    if(id!=='diagnostics')return {ok:false,error:'Consumer is not allowlisted'};
    leases.delete(id);
    if(active()===0)stop();
    return status();
  }
  const timer=setInterval(()=>{if(active()===0)stop();},200);
  if(timer.unref)timer.unref();
  function close(){
    closed=true;leases.clear();clearInterval(timer);stop();
  }
  return {demand,snapshot,status,release,close};
}
module.exports={createEngine};
