'use strict';
// Catalog metadata only. Never read private profiles or infer rule state from actuator state.
const fs=require('fs');
const CATALOG='/etc/oap/someip/someip-interfaces.json';
const keys=['driverHeat','driverVent','wheelHeat'];
function inspect(catalog){
 const interfaces=catalog&&catalog.interfaces;
 const candidates=[];
 if(!interfaces||typeof interfaces!=='object')return {status:'unknown-schema',candidates};
 const climate=/climate|seatcomfort|seatheating|seatventilation|steeringwheel|personalization/i;
 const rule=/rule|automat|threshold|trigger|preset|profile|preference|comfortsetting/i;
 const safeName=s=>typeof s==='string'&&/^[a-zA-Z0-9_.:-]{1,140}$/.test(s);
 for(const name of Object.keys(interfaces)){
  if(!safeName(name)||!climate.test(name))continue;
  const entry=interfaces[name]||{};
  for(const field of Object.keys(entry.fields||entry.attributes||entry.properties||{})){
   if(!safeName(field)||!rule.test(field+' '+name))continue;
   if(candidates.length>=60)return {status:'candidate-limit',candidates};
   candidates.push({interface:name,field});
  }
 }
 return {status:candidates.length?'candidates-found':'no-candidates',candidates};
}
function capture(io=fs){
 let discovery;
 try{
  const st=io.statSync(CATALOG);
  if(!st.isFile()||st.size>20*1024*1024)throw Error('catalog unavailable');
  discovery=inspect(JSON.parse(io.readFileSync(CATALOG,'utf8')));
 }catch(_){discovery={status:'catalog-unavailable',candidates:[]};}
 const states={};keys.forEach(k=>states[k]='UNKNOWN');
 return {at:new Date().toISOString(),states,discovery,readOnly:true,writeCount:0};
}
const targets=[
 ['de.bmw.infotainment.climate.Climate','operationAutomaticSwitchDriverSeat'],
 ['de.bmw.infotainment.climate.climatemaster.ClimateMaster','statusClimateUpdateAutomatic']
];
// Only numeric/boolean leaves and schema keys; never export arbitrary strings.
function shape(v,depth=0){
 if(typeof v==='boolean'||(typeof v==='number'&&Number.isFinite(v)))return v;
 if(depth>=5||!v||typeof v!=='object')return null;
 if(Array.isArray(v))return v.slice(0,12).map(x=>shape(x,depth+1));
 const out={};for(const k of Object.keys(v).slice(0,20)){
  if(/^[a-zA-Z0-9_]{1,64}$/.test(k)&&! /vin|name|email|token|password|account|userId|profileId/i.test(k)&&!['__proto__','constructor','prototype'].includes(k))out[k]=shape(v[k],depth+1);
 }return out;
}
function profiles(io=fs){
 try{
  const st=io.statSync(CATALOG);if(!st.isFile()||st.size>20*1024*1024)throw Error('catalog');
  const i=JSON.parse(io.readFileSync(CATALOG,'utf8')).interfaces||{},found=[];
  for(const name of Object.keys(i)){
   if(!/^[a-zA-Z0-9_.:-]{1,140}$/.test(name))continue;
   for(const field of Object.keys(i[name].fields||i[name].attributes||i[name].properties||{})){
    if(!/^[a-zA-Z0-9_]{1,100}$/.test(field))continue;
    if(/profile|personaliz|driverIdentification|userManagement|userProfile/i.test(name+' '+field)&&/active|current|selected|logged|profileId|profileName|guest|userId/i.test(field)){
     found.push({interface:name,field});if(found.length>=40)return found;
    }
   }
  }return found;
 }catch(_){return [];}
}
// Passive metadata only: no proxy, getter, or unauthorized interface access.
function capabilities(io=fs){
 const result={};
 try{
  const st=io.statSync(CATALOG);if(!st.isFile()||st.size>20*1024*1024)throw Error('catalog');
  const i=JSON.parse(io.readFileSync(CATALOG,'utf8')).interfaces||{};
  for(const [name,field] of targets){
   const entry=i[name]||{},f=(entry.fields||entry.attributes||entry.properties||{})[field];
   const safeKeys=o=>o&&typeof o==='object'?Object.keys(o).filter(k=>/^[a-zA-Z0-9_.:-]{1,100}$/.test(k)).slice(0,30):[];
   const instances=entry.instances||entry.instanceMap||entry.availableInstances;
   result[field]={present:!!f,keys:safeKeys(f),getter:!!(f&&f.getter),notifier:!!(f&&f.notifier),setter:!!(f&&f.setter),instances:safeKeys(instances),status:'metadata-only'};
  }
 }catch(_){}
 return result;
}
function read(opts={}){
 const io=opts.io||fs,out=capture(io);
 out.profile={status:'UNKNOWN',candidates:profiles(io)};
 out.samples={};
 out.capabilities=capabilities(io);
 return out;
}
// Isolated, manually triggered profile getter. Never export the profile identifier.
const PROFILE='de.bmw.infrastructure.DriverSelectionModule',FIELD='piaProfileId';
// Error messages are restricted to allowlisted technical words; never export getter values.
// Restrict output to known technical words and redact every other token.
function proxyError(e){
 const msg=String(e&&e.message||e||'').slice(0,512);
 const known=/^(?:error|failed|failure|cannot|could|not|unable|to|build|building|buildProxy|then|px.init|p.init|someip.buildProxy|create|initialize|initialization|init|proxy|someip|native|module|available|unavailable|instance|id|invalid|unknown|missing|interface|config|configuration|permission|denied|access|rejected|timeout|timed|out|service|provider|connection|connect|socket|address|already|exists|in|use|undefined|null|object|is|a|the|of|for|with|no|such|file|method|function|unsupported|argument|type|expected|internal|exception|eacces|eperm|enoent|einval|eaddrinuse|econnrefused|etimedout|enotconn|eagain|ebusy|de\.bmw\.infrastructure\.DriverSelectionModule|piaProfileId)$/i;
 const detail=msg.replace(/[A-Za-z0-9_.@:/-]+/g,w=>known.test(w)?w:'[redacted]').replace(/[^A-Za-z0-9_.\[\] ,:;()'-]/g,' ').slice(0,240);
 const code=String(e&&e.code||'');
 return {detail,code:/^(EACCES|EPERM|ENOENT|EINVAL|EADDRINUSE|ECONNREFUSED|ETIMEDOUT|ENOTCONN|EAGAIN|EBUSY)$/.test(code)?code:null};
}
// Availability observation only; no field subscription or getter retry.
function waitForProvider(signals,p,item,timeoutMs){
 return new Promise(resolve=>{
  const started=Date.now();let done=false,timer,poll;
  item.availabilityEvents=[];item.providerAvailableBefore=null;item.availabilityMethod=typeof p.isAvailable;
  const finish=(available,reason)=>{if(done)return;done=true;clearTimeout(timer);clearInterval(poll);item.availabilityWaitMs=Date.now()-started;item.availabilityResult=reason;resolve(available);};
  const check=()=>{if(done||typeof p.isAvailable!=='function')return;try{const a=p.isAvailable();if(typeof a==='boolean'){if(item.providerAvailableBefore===null)item.providerAvailableBefore=a;if(a)finish(true,'isAvailable');}}catch(e){item.availabilityError=proxyError(e);}};
  timer=setTimeout(()=>finish(false,'deadline'),timeoutMs);
  item.availabilityCallback=typeof signals.onAvailable==='function'?'requested':'unsupported';
  if(typeof signals.onAvailable==='function'){
   Promise.resolve().then(()=>signals.onAvailable(p,a=>{if(done||typeof a!=='boolean')return;if(item.availabilityEvents.length<20)item.availabilityEvents.push({available:a,ms:Date.now()-started});if(a)finish(true,'callback');})).then(()=>{if(!done)item.availabilityCallback='registered';},e=>{if(!done){item.availabilityCallback='failed';item.availabilityError=proxyError(e);}});
  }
  check();if(!done)poll=setInterval(check,250);
 });
}
async function readProfile(signals,opts={}){
 const report=read(opts),item=report.samples[FIELD]={status:'not-started'};
 let localProfile=null,p;
 const bound=(promise,ms)=>new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error('timeout')),ms);
  Promise.resolve(promise).then(v=>{clearTimeout(timer);resolve(v);},e=>{clearTimeout(timer);reject(e);});
 });
 try{
  const catalog=JSON.parse((opts.io||fs).readFileSync(CATALOG,'utf8'));
  const entry=catalog.interfaces&&catalog.interfaces[PROFILE],f=entry&&entry.fields&&entry.fields[FIELD];
  if(!f||f.getter==null||!Object.prototype.hasOwnProperty.call((catalog.instanceIDs||{})[PROFILE]||{},'1')){item.status='catalog-mismatch';return {report,localProfile};}
  if(!signals||typeof signals.loadConfig!=='function'||typeof signals.proxyDiagnostic!=='function'){item.status='runtime-unavailable';return {report,localProfile};}
  let cfg;try{cfg=signals.loadConfig(PROFILE);}catch(e){item.configError=proxyError(e);item.status='config-unavailable';return {report,localProfile};}
  if(!cfg.fields||!cfg.fields[FIELD]||cfg.fields[FIELD].getter==null){item.status='config-no-getter';return {report,localProfile};}
  item.status='proxy-failed';
  item.nativeAvailable=typeof signals.hasNative==='function'?signals.hasNative():null;
  item.instance='1';
  item.configKeys=Object.keys(cfg).filter(k=>/^[A-Za-z_][A-Za-z0-9_]{0,40}$/.test(k)).slice(0,24);
  item.configInstanceKeys=Object.keys(cfg.instanceIDs||cfg.instances||{}).filter(k=>k==='1').slice(0,1);
  const started=Date.now();
  const pending=Promise.resolve().then(()=>signals.proxyDiagnostic(PROFILE,'1',item.proxyStages={}));
  try{const handle=await bound(pending,4000);p=handle.proxy;item.proxyHandoff='received';}catch(e){item.proxyError=proxyError(e);pending.then(x=>x&&x.proxy&&x.proxy.shutdown&&x.proxy.shutdown()).catch(()=>{});throw e;}finally{item.proxyElapsedMs=Date.now()-started;}
  item.providerAvailableBefore=null;
  item.availabilityMethod=typeof p.isAvailable;
  if(typeof p.isAvailable==='function'){
   try{const a=await bound(Promise.resolve().then(()=>p.isAvailable()),1000);if(typeof a==='boolean')item.providerAvailableBefore=a;}catch(e){item.availabilityError=proxyError(e);}
  }
  item.status='getter-failed';
  item.getterAttempted=true;
  const getterStarted=Date.now();
  let value;try{value=await bound(Promise.resolve().then(()=>p.getValue(FIELD,2500)),3500);}catch(e){item.getterErrorKind=e&&e.message==='timeout'?'timeout':e instanceof TypeError?'type-error':'rejected';item.getterError=proxyError(e);item.getterRejectionType=typeof e;throw e;}finally{item.getterElapsedMs=Date.now()-getterStarted;}
  const raw=value&&typeof value==='object'?value[FIELD]:value;
  if((typeof raw==='string'&&raw.length>0&&raw.length<=128)||(Number.isSafeInteger(raw)&&raw>=0)){
   localProfile=String(raw);item.status='sample';report.profile.status='sample';
  }else{item.status='unrecognized-shape';item.type=Array.isArray(value)?'array':typeof value;item.keys=value&&typeof value==='object'?Object.keys(value).filter(k=>/^[a-zA-Z_][a-zA-Z0-9_]{0,63}$/.test(k)).slice(0,12):[];}
 }catch(e){if(e&&e.message==='timeout')item.status+='-timeout';else if(item.status==='not-started')item.status='catalog-unavailable';}
 finally{if(p&&p.shutdown)try{await bound(Promise.resolve().then(()=>p.shutdown()),1500);}catch(_){}}
 return {report,localProfile};
}
module.exports={inspect,capture,keys,read,shape,profiles,targets,capabilities,readProfile,PROFILE,FIELD};
