'use strict';
// Capture exactly the same BMW CDS members and scaling as the original OSA.
// Data Tool mode uses the existing CDS public API; no service/ECU modifications.
const {connect}=require('./public-client');
const IFACE='de.bmw.infotainment.vehicle.CDS';
const FIELDS={oil:'engine.oilTemperature',coolant:'engine.coolantTemperature',rpm:'engine.rpm'};
const DURATION_MS=6500;
const nap=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const scrub=e=>String(e&&e.message||e||'unknown').replace(/[^a-zA-Z0-9 _.:/-]/g,'').slice(0,120);
const decode=(key,value)=>{
 const valid=Number.isInteger(value)&&value>=0&&value<=(key==='rpm'?65535:255)&&value!==(key==='rpm'?65535:255);
 return valid?{raw:value,value:key==='rpm'?value*0.25:value-48}:null;
};
function row(){return {oil:null,coolant:null,rpm:null};}
function status(x){return Object.keys(FIELDS).every(k=>x.values[k])?'complete':Object.keys(FIELDS).some(k=>x.values[k])?'partial':'missing';}
async function native(signals,log,options){
 const opts=options||{},delay=opts.delay||nap,result={source:'native',values:row(),events:row(),errors:[],subscribed:false,available:false};
 let active=true,sub=null;
 const capture=(key,raw)=>{if(!active)return;result.events[key]=(result.events[key]||0)+1;const v=decode(key,raw);if(v)result.values[key]={...v,at:new Date().toISOString()};};
 const handlers={
  statusEngineTemperature:v=>{capture('oil',v&&v.temperatureEngineOilDrive);capture('coolant',v&&v.temperatureEngineDrive);},
  statusEngineSpeed2:v=>capture('rpm',v&&v.actualValueRPMEngineCrankshaft)
 };
 try{
  // Resolve the original BMW application-local SOME/IP proxy with the same attributes.
  // Never poll at an extra rate; an initial getter and field notifications are enough.
  const pending=signals.watch(IFACE,'1',handlers,log);
  sub=await Promise.race([pending,delay(4000).then(()=>null)]);
  if(!sub){result.errors.push('native-watch-timeout');pending.then(late=>late&&late.shutdown&&late.shutdown()).catch(()=>{});}
  else{result.subscribed=!sub.error;result.available=!!sub.available;if(sub.error)result.errors.push(scrub(sub.error));}
  await delay(DURATION_MS);
  if(sub)result.available=!!sub.available;
 }catch(e){result.errors.push(scrub(e));}
 finally{active=false;if(sub)await Promise.race([Promise.resolve().then(()=>sub.shutdown()),delay(1500)]).catch(()=>{});}
 result.status=status(result);return result;
}
async function tool(options){
 const opts=options||{},delay=opts.delay||nap,open=opts.connect||connect;
 const result={source:'data-tool',values:row(),events:row(),errors:[],subscribed:false,available:false,invalid:[]};
 let client;
 try{
  client=await open('osa-engine-diagnostics',undefined,'cds');
  const fields=Object.values(FIELDS),freshnessMs={};
  fields.forEach(name=>freshnessMs[name]=1000);
  const demand=await client.request({op:'demand',fields,freshnessMs});
  if(!demand||!demand.ok)throw Error('demand '+(demand&&demand.error||'rejected'));
  result.subscribed=true;
  const end=Date.now()+DURATION_MS;
  do{
   const snap=await client.request({op:'snapshot'});
   if(!snap||!snap.ok)throw Error('snapshot '+(snap&&snap.error||'rejected'));
   result.available=!!snap.active;
   for(const [key,name] of Object.entries(FIELDS)){
    const v=snap.fields&&snap.fields[name];
    result.events[key]=(result.events[key]||0)+1;
    if(v&&v.valid===true&&Number.isFinite(v.value)&&Number.isFinite(v.ageMs)&&Number.isFinite(v.validityMs)&&v.ageMs<=v.validityMs){
     result.values[key]={raw:Number.isFinite(v.raw)?v.raw:null,value:v.value,ageMs:v.ageMs,sampledAt:v.sampledAt||null};
    }else if(!result.invalid.includes(key))result.invalid.push(key);
   }
   if(Date.now()+650>=end)break;
   await delay(650);
  }while(Date.now()<end);
 }catch(e){result.errors.push(scrub(e));}
 finally{if(client){try{await Promise.race([client.request({op:'release'}),delay(1000)]);}catch(_){}client.close();}}
 result.status=status(result);return result;
}
function compare(nativeResult,toolResult){
 const fields={};for(const key of Object.keys(FIELDS)){
  const a=nativeResult.values[key],b=toolResult.values[key];
  fields[key]={native:a?a.value:null,tool:b?b.value:null,delta:a&&b?Math.round((b.value-a.value)*100)/100:null,
   state:a&&b?'both':a?'native-only':b?'tool-only':'neither'};
 }return fields;
}
module.exports={native,tool,compare,decode,FIELDS,IFACE,DURATION_MS};
