'use strict';
// INTERNAL read-only UDS demand scheduler foundation. No IPC route or app grants.
// A future authenticated gateway must create Symbol capabilities and issue them
// only after verifying the app. Client-provided strings MUST NOT become grants.
const {getRead}=require('./profiles');
function createScheduler(options){
 const opts=options||{},read=opts.read,now=opts.now||Date.now;
 const definitions=opts.definitions,grants=opts.grants;
 if(typeof read!=='function'||!definitions||typeof definitions!=='object'||
    !(grants instanceof Map)||!grants.size||
    [...grants].some(([token,allowed])=>typeof token!=='symbol'||!(allowed instanceof Set)))
   throw Error('Trusted internal reads and Symbol grants required');
 const fields=new Map();
 for(const [key,spec] of Object.entries(definitions)){
  if(!spec||!Number.isInteger(spec.ecu)||!Number.isInteger(spec.did)||
     !Number.isInteger(spec.length)||spec.length<1||spec.length>4||
     !getRead(spec.ecu,spec.did))throw Error('Non-allowlisted signal: '+key);
  fields.set(key,Object.freeze({ecu:spec.ecu,did:spec.did,length:spec.length}));
 }
 for(const allowed of grants.values())for(const key of allowed)
  if(!fields.has(key))throw Error('Invalid grant');
 const subscriptions=new Map(),cache=new Map(),due=new Map();
 let busy=false,closed=false,timer=null;
 const stats={reads:0,failures:0,cacheHits:0,ticks:0};
 const time=()=>now();
 function active(){
  const clock=time();
  for(const [token,sub] of subscriptions)if(sub.expires<=clock)subscriptions.delete(token);
  return subscriptions;
 }
 function requested(){
  const needed=new Map();
  for(const sub of active().values())for(const key of sub.fields){
   const previous=needed.get(key);
   const freshness=typeof sub.freshnessMs==='number'?sub.freshnessMs:sub.freshnessMs[key];
   needed.set(key,previous===undefined?freshness:Math.min(previous,freshness));
  }
  return needed;
 }
 function demand(token,fieldsRequested,freshnessMs,leaseMs){
  if(closed)return {ok:false,error:'Closed'};
  const allowed=grants.get(token);
  if(!allowed||!Array.isArray(fieldsRequested)||!fieldsRequested.length||
     new Set(fieldsRequested).size!==fieldsRequested.length||
     fieldsRequested.some(key=>typeof key!=='string'||!allowed.has(key)))
   return {ok:false,error:'Not authorized'};
  const freshnessValid=typeof freshnessMs==='number'
   ?Number.isInteger(freshnessMs)&&freshnessMs>=1000&&freshnessMs<=300000
   :freshnessMs&&typeof freshnessMs==='object'&&!Array.isArray(freshnessMs)&&
     fieldsRequested.every(key=>Number.isInteger(freshnessMs[key])&&freshnessMs[key]>=1000&&freshnessMs[key]<=300000)&&
     Object.keys(freshnessMs).every(key=>fieldsRequested.includes(key));
  if(!freshnessValid||!Number.isInteger(leaseMs)||leaseMs<1000||leaseMs>60000)
   return {ok:false,error:'Unsupported freshness or lease'};
  subscriptions.set(token,{fields:fieldsRequested.slice(),freshnessMs,expires:time()+leaseMs});
  return {ok:true,accepted:fieldsRequested.length,leaseMs};
 }
 function release(token){
  if(!grants.has(token))return {ok:false,error:'Not authorized'};
  subscriptions.delete(token);
  return {ok:true};
 }
 function snapshot(token){
  if(!grants.has(token))return {ok:false,error:'Not authorized'};
  const sub=active().get(token);
  if(!sub)return {ok:true,active:false,fields:{}};
  const result={};
  for(const key of sub.fields){
   const entry=cache.get(key),age=entry?Math.max(0,time()-entry.at):null;
   const freshness=typeof sub.freshnessMs==='number'?sub.freshnessMs:sub.freshnessMs[key];
   const valid=!!entry&&age<=freshness&&entry.valid===true;
   if(valid)stats.cacheHits++;
   result[key]={valid,ageMs:age,sampledAt:entry?new Date(entry.at).toISOString():null,
      uds:valid?entry.uds.slice():null};
  }
  return {ok:true,active:true,fields:result};
 }
 async function tick(){
  if(closed||busy)return false;
  stats.ticks++;
  const required=requested();
  if(required.size===0)return false;
  const clock=time();
  // Iterate defined catalog order; no fixed ECU order is imposed on transport.
  // Only one missing/expired field is scheduled per tick. No parallel ECU reads.
  let key=null;
  for(const k of required.keys()){
   const entry=cache.get(k),maxAge=required.get(k);
   const earliest=due.get(k)||0;
   if(clock<earliest)continue;
   if(!entry||!entry.valid||clock-entry.at>=maxAge){key=k;break;}
  }
  if(key===null)return false;
  const spec=fields.get(key);
  busy=true;
  // Apply backoff on errors to prevent a failed ECU response from spinning.
  due.set(key,clock+required.get(key));
  try{
   stats.reads++;
   const reply=await read(spec.ecu,spec.did);
   const u=reply&&reply.uds;
   const sampled=reply&&typeof reply.at==='string'?Date.parse(reply.at):NaN;
   if(!reply||reply.ok!==true||!Array.isArray(u)||
      u.length!==spec.length+3||u[0]!==0x62||
      u[1]!==((spec.did>>8)&255)||u[2]!==(spec.did&255)||
      !u.every(b=>Number.isInteger(b)&&b>=0&&b<=255)||
      !Number.isFinite(sampled)||sampled>time()+2000||time()-sampled>300000){
    stats.failures++;return false;
   }
   cache.set(key,{uds:u.slice(),at:sampled,valid:true});
   due.set(key,sampled+required.get(key));
   return true;
  }catch(_){stats.failures++;return false;}
  finally{busy=false;}
 }
 function start(intervalMs=1000){
  if(closed||timer)return false;
  if(!Number.isInteger(intervalMs)||intervalMs<250)return false;
  timer=setInterval(()=>{tick().catch(()=>{});},intervalMs);
  if(timer.unref)timer.unref();
  return true;
 }
 function stop(){if(timer){clearInterval(timer);timer=null;}subscriptions.clear();}
 function close(){closed=true;stop();cache.clear();due.clear();}
 return {demand,release,snapshot,tick,start,stop,close,
  status:()=>({activeConsumers:active().size,fields:requested().size,busy,stats:{...stats}})};
}
module.exports={createScheduler};
