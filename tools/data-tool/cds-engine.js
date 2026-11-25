'use strict';
// One shared CDS child per Data Tool. Leases are renewed only by explicit
// consumer demand; status/snapshot reads never extend a subscription.
const {spawn}=require('child_process'),path=require('path');
const manifest=require('./data-manifest.json');
const CONSUMERS=manifest.consumers;
const FIELDS=['oil','coolant','rpm','speed','outside'];
const GROUPS={oil:'statusEngineTemperature',coolant:'statusEngineTemperature',rpm:'statusEngineSpeed2',speed:'statusCarSpeed2',outside:'ExteriorTemperature'};
function createEngine(options){
  const opts=options||{},now=opts.now||Date.now;
  const spawnProcess=opts.spawn||spawn,worker=opts.worker||path.join(__dirname,'cds-stream-worker.js');
  const leaseMs=opts.leaseMs||3000,staleMs=opts.staleMs||2000;
  const publicLeases=new Map();
  const leases=new Map(),cache={},updates={oil:0,coolant:0,rpm:0};
  const stats={starts:0,stops:0,invalid:0,errors:0,samples:0};
  let child=null,ready=false,closed=false,buffer='',error=null,selected='';
  function active(){
    const clock=now();
    for(const [id,expiry] of leases)if(expiry<=clock)leases.delete(id);
    for(const [id,lease] of publicLeases)if(lease.expiry<=clock)publicLeases.delete(id);
    return leases.size+publicLeases.size;
  }
  function stop(){
    if(!child)return;
    const previous=child;
    child=null;ready=false;buffer='';
    stats.stops++;
    // Never expose data left by a stopped subscription as current.
    FIELDS.forEach(k=>{updates[k]=0;delete cache[k];});
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
      message.field==='statusEngineSpeed2'?['rpm']:message.field==='statusCarSpeed2'?['speed']:message.field==='ExteriorTemperature'?['outside']:[];
    if(!keys.length)return;
    const at=now();
    keys.forEach(k=>{const raw=message.value&&message.value[k];if(!Number.isInteger(raw)||raw<0||raw>(k==='rpm'||k==='speed'?65535:255)||raw===(k==='rpm'||k==='speed'?65535:255)){stats.invalid++;return;}cache[k]=raw;updates[k]=at;});
    stats.samples++;
  }
  function desired(){
    active();const fields=new Set();for(const id of leases.keys())for(const k of CONSUMERS[id].fields)fields.add(k);
    for(const lease of publicLeases.values())for(const k of lease.fields)fields.add(k);
    return [...new Set([...fields].map(k=>GROUPS[k]))].sort().join(',');
  }
  function reconcile(){
    const next=desired();if(!next){stop();selected='';return;}
    if(child&&selected!==next)stop();selected=next;if(!child)start();
  }
  function start(){
    if(child||closed)return;
    error=null;ready=false;buffer='';
    const instance=spawnProcess(process.execPath,[worker,selected],{stdio:['ignore','pipe','ignore'],env:process.env});
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
    instance.on('exit',()=>{if(instance===child){error='CDS worker exited';stats.errors++;child=null;ready=false;FIELDS.forEach(k=>{updates[k]=0;delete cache[k];});}});
  }
  function demand(id){
    if(closed)return {ok:false,error:'CDS engine closed'};
    if(typeof id!=='string'||!Object.prototype.hasOwnProperty.call(CONSUMERS,id))return {ok:false,error:'Consumer is not allowlisted'};
    active();
    leases.set(id,now()+Math.min(leaseMs,CONSUMERS[id].leaseMs));
    reconcile();
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
      fields,groups:selected?selected.split(','):[],stats:Object.assign({},stats),error};
  }
  function snapshot(id){
    const consumer=id||'diagnostics'; // Compatible with existing diagnostic probes.
    if(!Object.prototype.hasOwnProperty.call(CONSUMERS,consumer))
      return {ok:false,error:'Consumer is not allowlisted'};
    const state=status(),values={},fields={};
    const owned=leases.has(consumer);
    CONSUMERS[consumer].fields.forEach(k=>{
      fields[k]=owned?state.fields[k]:{valid:false,ageMs:null};
      if(owned&&state.fields[k].valid)values[k]=cache[k];
    });
    state.values=values;
    state.fields=fields;
    return state;
  }
  function release(id){
    if(typeof id!=='string'||!Object.prototype.hasOwnProperty.call(CONSUMERS,id))return {ok:false,error:'Consumer is not allowlisted'};
    leases.delete(id);
    reconcile();
    return status();
  }
  // Internal Symbol capability, never supplied by an IPC client.
  function demandPublic(id,expiry,fields){
    if(closed||typeof id!=='symbol'||!Number.isFinite(expiry)||expiry<=now()||!Array.isArray(fields)||!fields.length||fields.some(k=>!FIELDS.includes(k)))return false;
    publicLeases.set(id,{expiry,fields:fields.slice()});
    reconcile();
    return true;
  }
  function releasePublic(id){
    publicLeases.delete(id);
    reconcile();
  }
  function samplePublic(id,key){
    active();
    if(!publicLeases.has(id)||!publicLeases.get(id).fields.includes(key)||!child||!updates[key])return null;
    return {raw:cache[key],at:updates[key]};
  }
  const timer=setInterval(()=>{const next=desired();if(next!==selected)reconcile();},200);
  if(timer.unref)timer.unref();
  function close(){
    closed=true;leases.clear();publicLeases.clear();clearInterval(timer);stop();
  }
  return {demand,snapshot,status,release,close,demandPublic,releasePublic,samplePublic};
}
module.exports={createEngine};
