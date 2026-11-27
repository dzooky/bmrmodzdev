'use strict';
// Manual foreground SOME/IP connection trace. Observation only:
// one watch subscription, callbacks and shutdown; no getters or method calls.
const BODY='de.bmw.body.steeringwheelcomfort.SteeringWheelClimate';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const iso=ms=>new Date(ms).toISOString();
const errorText=e=>String(e&&e.message||e).replace(/[\r\n\t]/g,' ').slice(0,100);
function readState(v,depth){
 if(!v||typeof v!=='object'||depth>4)return null;
 if(Object.prototype.hasOwnProperty.call(v,'heating')&&
    Object.prototype.hasOwnProperty.call(v,'availability')&&
    Object.prototype.hasOwnProperty.call(v,'functionalityCoded')){
  return {
   heating:typeof v.heating==='boolean'?v.heating:null,
   available:typeof v.availability==='boolean'?v.availability:null,
   coded:typeof v.functionalityCoded==='boolean'?v.functionalityCoded:null
  };
 }
 for(const k of Object.keys(v)){const r=readState(v[k],depth+1);if(r)return r;}
 return null;
}
async function capture(signals,options){
 const o=options||{},now=o.now||Date.now,delay=o.pause||sleep;
 const duration=Math.max(500,Math.min(12000,Number.isInteger(o.durationMs)?o.durationMs:8000));
 const start=now(),result={kind:'oemSomeIpTrace',at:iso(start),readOnly:true,writeCount:0,
  service:'SteeringWheelClimate',instance:'1',durationMs:duration,
  stage:'not-started',watch:{status:'not-started',elapsedMs:null,
   proxyPresent:false,shutdownAvailable:false,error:''},
  notifications:{total:0,valid:0,firstMs:null,lastMs:null,last:null},
  shutdown:{status:'not-attempted',error:''},errors:[]};
 const stage=v=>{result.stage=v;if(o.onStage)try{o.onStage(v);}catch(_){}};
 if(!signals||typeof signals.watch!=='function'){stage('watch-api-missing');return result;}
 let sub=null,stopped=false,pending=null;
 const handler=raw=>{
  if(stopped)return;
  const n=result.notifications;n.total=Math.min(999,n.total+1);
  const elapsed=Math.max(0,now()-start);
  if(n.firstMs===null)n.firstMs=elapsed;
  n.lastMs=elapsed;
  const parsed=readState(raw,0);
  if(parsed){n.valid=Math.min(999,n.valid+1);n.last=parsed;}
 };
 try{
  stage('watch-request');
  pending=Promise.resolve().then(()=>signals.watch(BODY,'1',{heatingState:handler},
   o.log||{info(){},warn(){}}));
  let timer=null;
  try{
   const raced=await Promise.race([
    pending.then(value=>({kind:'resolved',value}),error=>({kind:'rejected',error})),
    new Promise(resolve=>{timer=setTimeout(()=>resolve({kind:'timeout'}),3000);})
   ]);
   if(timer!==null)clearTimeout(timer);
   result.watch.elapsedMs=Math.max(0,now()-start);
   if(raced.kind==='timeout'){
    result.watch.status='timeout';result.watch.error='watch-timeout';
    pending.then(value=>{if(value&&typeof value.shutdown==='function')return Promise.resolve(value.shutdown());}).catch(()=>{});
    stage('watch-timeout');return result;
   }
   if(raced.kind==='rejected'){
    result.watch.status='exception';result.watch.error=errorText(raced.error);
    stage('watch-exception');return result;
   }
   sub=raced.value;
   if(!sub){result.watch.status='null-subscription';stage('no-subscription');return result;}
   result.watch.proxyPresent=!!sub.proxy;
   result.watch.shutdownAvailable=typeof sub.shutdown==='function';
   result.watch.error=sub.error?errorText(sub.error):'';
   if(sub.error){result.watch.status='watch-error';stage('watch-error');return result;}
   if(sub.available===false){result.watch.status='unavailable';stage('service-unavailable');return result;}
   result.watch.status='subscribed';
   stage('observing');
   await delay(duration);
   stage(result.notifications.valid>0?'valid-notification':
    result.notifications.total>0?'unparsed-notification':'no-notification');
  }finally{if(timer!==null)clearTimeout(timer);}
 }catch(e){stage('trace-exception');result.errors.push(errorText(e));}
 finally{
  stopped=true;
  if(sub&&typeof sub.shutdown==='function'){
   try{await Promise.resolve(sub.shutdown());result.shutdown.status='ok';}
   catch(e){result.shutdown.status='error';result.shutdown.error=errorText(e);}
  }else if(sub)result.shutdown.status='unsupported';
 }
 return result;
}
module.exports={BODY,readState,capture};
