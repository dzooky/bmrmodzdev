'use strict';
// Manual, read-only OEM wheel services audit (no SOME/IP calls or setters).
// Known source shape: aurelmarius/bmw-apps apps/aurelm_wheel_heat/heat.js.
// BDC 22 D074 is optional independent read-only reference, never a gate.
const CLIMATE='de.bmw.infotainment.climate.climatemaster.ClimateMaster';
const BODY='de.bmw.body.steeringwheelcomfort.SteeringWheelClimate';
const pause=ms=>new Promise(r=>setTimeout(r,ms));
function find(raw,key,depth){
 if(!raw||typeof raw!=='object'||depth>4)return null;
 if(Object.prototype.hasOwnProperty.call(raw,key))return raw;
 for(const k of Object.keys(raw)){
  const found=find(raw[k],key,depth+1);
  if(found)return found;
 }
 return null;
}
const small=v=>typeof v==='string'||typeof v==='number'||typeof v==='boolean'?v:null;
const pick=(v,k)=>{const x=find(v,k,0);return x?small(x[k]):null;};
function parse(name,raw){
 if(name==='statusSteeringWheelHeating')return {
  configured:pick(raw,'configuredIntensityLevel'),
  actual:pick(raw,'actualIntensityLevel'),saveLUM:pick(raw,'saveLUM')};
 if(name==='statusAvailableSteeringWheelHeating')return {
  available:pick(raw,'steeringWheelHeatingAvailable'),priority:pick(raw,'priorityClientID')};
 if(name==='heatingState')return {
  coded:pick(raw,'functionalityCoded'),available:pick(raw,'availability'),heating:pick(raw,'heating')};
 return {};
}
const errorText=e=>String(e&&e.message||e).replace(/[\r\n\t]/g,' ').slice(0,95);
async function capture(signals,options){
 const opts=options||{},now=opts.now||Date.now,sleep=opts.pause||pause;
 const duration=Number.isInteger(opts.durationMs)?Math.max(500,Math.min(opts.durationMs,12000)):6000;
 const report={kind:'oemServices',at:new Date(now()).toISOString(),readOnly:true,stage:'unavailable',
  services:{climate:{status:'unavailable',samples:{}},body:{status:'unavailable',samples:{}}},
  bdc:{status:'not-read',bytes:null,on:null,led:null,currentAmps:null,actuator:null,coded:null},
  errors:[],writeCount:0};
 if(!signals||typeof signals.watch!=='function'){report.errors.push('watch-unavailable');return report;}
 let ended=false,active=[];
 const definitions=[
  {id:'climate',name:CLIMATE,fields:['statusSteeringWheelHeating','statusAvailableSteeringWheelHeating']},
  {id:'body',name:BODY,fields:['heatingState']}
 ];
 async function subscribe(d){
  const out=report.services[d.id],handlers={};
  for(const field of d.fields)handlers[field]=v=>{
   if(ended)return;
   out.samples[field]={at:new Date(now()).toISOString(),value:parse(field,v)};
  };
  let timedOut=false;
  const pending=Promise.resolve().then(()=>signals.watch(d.name,'1',handlers,opts.log||{info(){},warn(){}}));
  try{
   const sub=await Promise.race([pending,new Promise(resolve=>setTimeout(()=>{timedOut=true;resolve(null);},2500))]);
   if(timedOut){
    out.status='watch-timeout';report.errors.push(d.id+':watch-timeout');
    pending.then(s=>{if(s&&s.shutdown)return Promise.resolve(s.shutdown());}).catch(()=>{});
    return;
   }
   if(!sub||sub.error||sub.available===false){
    out.status=sub&&sub.error?'watch-error':sub&&sub.available===false?'unavailable':'no-subscription';
    if(sub&&sub.error)report.errors.push(d.id+':'+errorText(sub.error));
    if(sub&&sub.shutdown)try{await Promise.resolve(sub.shutdown());}catch(_){}
    return;
   }
   if(ended){if(sub.shutdown)await Promise.resolve(sub.shutdown());return;}
   out.status='watching';active.push(sub);
   // Read-only field reads; a missing getValue is not an error.
   if(sub.proxy&&typeof sub.proxy.getValue==='function'){
    await Promise.all(d.fields.map(async field=>{
     try{
      const data=await Promise.race([Promise.resolve().then(()=>sub.proxy.getValue(field,1200)),
       new Promise((_,reject)=>setTimeout(()=>reject(Error('get-timeout')),1800))]);
      handlers[field](data);
     }catch(e){if(!out.samples[field])report.errors.push(d.id+':'+field+':'+errorText(e));}
    }));
   }
  }catch(e){out.status='watch-error';report.errors.push(d.id+':'+errorText(e));}
 }
 try{
  if(opts.onStage)opts.onStage('watching');
  await Promise.all(definitions.map(subscribe));
  await sleep(duration);
  // Optional BDC D074 read-only reference; failures must not hide OEM service samples.
  if(opts.Diag!==false){
   let diag;
   try{
    if(opts.onStage)opts.onStage('BDC read-only');
    const Diag=opts.Diag||require('./kit/diag').Diag;
    diag=new Diag(signals,opts.log||{info(){},warn(){}});
    diag.quiet=true;diag.busyLog=false;
    await diag.init();
    if(!diag.p)throw Error('tasu-proxy-unavailable');
    const u=await diag.physical(0x40,0x22,[0xd0,0x74],1500,
     a=>Array.isArray(a)&&((a[0]===0x62&&a[1]===0xd0&&a[2]===0x74)||(a[0]===0x7f&&a[1]===0x22)),
     {maxRetries:0,callTimeoutMs:2000,hardTimeoutMs:3500});
    if(!Array.isArray(u)||u.length<8||u[0]!==0x62||u[1]!==0xd0||u[2]!==0x74)throw Error('invalid-D074');
    report.bdc={status:'sample',bytes:u.slice(0,8),on:u[3]===1?true:u[3]===0?false:null,
     led:u[4]===1?true:u[4]===0?false:null,
     currentAmps:Number.isInteger(u[5])&&u[5]<=254?u[5]/10:null,
     actuator:u[6],coded:u[7]===1?true:u[7]===0?false:null};
   }catch(e){report.bdc.status='read-failed';report.errors.push('BDC:'+errorText(e));}
   finally{if(diag&&diag.p&&diag.p.shutdown)try{await Promise.resolve(diag.p.shutdown());}catch(_){}}
  }
 }finally{
  ended=true;
  for(const sub of active)if(sub&&sub.shutdown)try{await Promise.resolve(sub.shutdown());}catch(e){report.errors.push('shutdown:'+errorText(e));}
 }
 for(const d of definitions){
  const out=report.services[d.id];
  if(out.status==='watching')out.status=Object.keys(out.samples).length?'sample':'no-sample';
 }
 report.stage=definitions.some(d=>report.services[d.id].status==='sample')?'oem-samples':
  report.bdc.status==='sample'?'bdc-only':'no-oem-sample';
 return report;
}
module.exports={CLIMATE,BODY,parse,capture};
