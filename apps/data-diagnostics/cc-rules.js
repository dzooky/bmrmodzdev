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
async function readProfile(signals,opts={}){
 const report=read(opts),item=report.samples[FIELD]={status:'not-started'};
 let localProfile=null,p,timer;
 const bound=(promise,ms)=>Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('timeout')),ms);})]).finally(()=>clearTimeout(timer));
 try{
  const catalog=JSON.parse((opts.io||fs).readFileSync(CATALOG,'utf8'));
  const entry=catalog.interfaces&&catalog.interfaces[PROFILE],f=entry&&entry.fields&&entry.fields[FIELD];
  if(!f||f.getter==null||!Object.prototype.hasOwnProperty.call((catalog.instanceIDs||{})[PROFILE]||{},'1')){item.status='catalog-mismatch';return {report,localProfile};}
  if(!signals||typeof signals.loadConfig!=='function'||typeof signals.proxy!=='function'){item.status='runtime-unavailable';return {report,localProfile};}
  let cfg;try{cfg=signals.loadConfig(PROFILE);}catch(_){item.status='config-unavailable';return {report,localProfile};}
  if(!cfg.fields||!cfg.fields[FIELD]||cfg.fields[FIELD].getter==null){item.status='config-no-getter';return {report,localProfile};}
  item.status='proxy-failed';
  const pending=Promise.resolve().then(()=>signals.proxy(PROFILE,'1'));
  try{p=await bound(pending,4000);}catch(e){pending.then(x=>x&&x.shutdown&&x.shutdown()).catch(()=>{});throw e;}
  item.status='getter-failed';
  const value=await bound(Promise.resolve().then(()=>p.getValue(FIELD,2500)),3500);
  const raw=value&&typeof value==='object'?value[FIELD]:value;
  if((typeof raw==='string'&&raw.length>0&&raw.length<=128)||(Number.isSafeInteger(raw)&&raw>=0)){
   localProfile=String(raw);item.status='sample';report.profile.status='sample';
  }else{item.status='unrecognized-shape';item.type=Array.isArray(value)?'array':typeof value;item.keys=value&&typeof value==='object'?Object.keys(value).filter(k=>/^[a-zA-Z_][a-zA-Z0-9_]{0,63}$/.test(k)).slice(0,12):[];}
 }catch(e){if(e&&e.message==='timeout')item.status+='-timeout';else if(item.status==='not-started')item.status='catalog-unavailable';}
 finally{if(p&&p.shutdown)try{await bound(Promise.resolve().then(()=>p.shutdown()),1500);}catch(_){}}
 return {report,localProfile};
}
module.exports={inspect,capture,keys,read,shape,profiles,targets,capabilities,readProfile,PROFILE,FIELD};
