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
async function read(signals,opts={}){
 const out=capture(opts.io||fs);out.profile={status:'UNKNOWN',candidates:profiles(opts.io||fs)};out.samples={};
 const pause=opts.pause||(ms=>new Promise(r=>setTimeout(r,ms)));
 for(const [iface,field] of targets){
  const item=out.samples[field]={status:'no-sample',value:null};let sub,ended=false,timer;
  try{
   const pending=Promise.resolve().then(()=>signals.watch(iface,'1',{[field]:v=>{if(!ended){item.status='sample';item.value=shape(v);}}},opts.log));
   const race=await Promise.race([pending,new Promise(r=>{timer=setTimeout(()=>r(null),3000);})]);clearTimeout(timer);
   if(!race){item.status='watch-timeout';pending.then(s=>s&&s.shutdown&&s.shutdown()).catch(()=>{});continue;}
   sub=race;if(sub.error){item.status='watch-error';continue;}
   await pause(2500);if(item.status!=='sample'&&sub.available===false)item.status='unavailable';
  }catch(_){item.status='watch-error';}
  finally{ended=true;clearTimeout(timer);if(sub&&sub.shutdown)try{await sub.shutdown();}catch(_){}}
 }
 return out;
}
module.exports={inspect,capture,keys,read,shape,profiles,targets};
