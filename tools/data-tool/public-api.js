'use strict';
// Offline v1 dispatcher. One session per connection; appId is a label, not authentication.
const {createScheduler}=require('./uds-demand-scheduler');
const {build}=require('./dpf-demand-profile');
const LIMITS=Object.freeze({sessions:8,fields:12,leaseMs:15000,minFastMs:5000,minSlowMs:60000,maxFreshnessMs:300000,requestsPerSecond:10,aggregateReadsPerSecond:1});
function createApi(options){
 const profile=build(options.identity),now=options.now||Date.now;
 if(!profile)throw Error('Unsupported DDE');
 const grants=new Map(),sessions=new Map();
 // Scheduler requires a nonempty grant map at construction.
 grants.set(Symbol('reserved'),new Set());
 const scheduler=createScheduler({definitions:profile.definitions,grants,now,read:options.read});
 let closed=false,lastTick=-Infinity;
 const fail=error=>({ok:false,error});
 function disconnect(token){scheduler.release(token);grants.delete(token);sessions.delete(token);}
 function prune(){for(const [token,s] of sessions)if(s.expires<=now())disconnect(token);}
 function connect(appId){
  prune();
  if(closed||typeof appId!=='string'||!/^[a-zA-Z0-9._-]{1,64}$/.test(appId)||sessions.size>=LIMITS.sessions)return null;
  const token=Symbol('connection');
  grants.set(token,new Set(profile.fields));
  sessions.set(token,{appId,expires:now()+LIMITS.leaseMs,window:now(),count:0});
  return {request:req=>dispatch(token,req),close:()=>disconnect(token)};
 }
 function dispatch(token,req){
  prune();const s=sessions.get(token);
  if(!s)return fail('SESSION_EXPIRED');
  if(now()-s.window>=1000){s.window=now();s.count=0;}
  if(++s.count>LIMITS.requestsPerSecond)return fail('RATE_LIMIT');
  if(!req||typeof req!=='object'||Array.isArray(req))return fail('INVALID_REQUEST');
  const keys=Object.keys(req);
  if(req.op==='catalog'&&keys.length===1)return {ok:true,api:1,engine:profile.engine,fields:profile.fields.map(name=>({name,minFreshnessMs:profile.freshnessMs[name]})),limits:LIMITS};
  if(req.op==='snapshot'&&keys.length===1){
   const x=scheduler.snapshot(token),fields={};
   for(const [name,row] of Object.entries(x.fields)){
    // v1 foundation exposes validated unsigned numeric samples, not raw UDS.
    let raw=null;if(row.valid){raw=0;for(const byte of row.uds.slice(3))raw=raw*256+byte;}
    fields[name]={valid:row.valid,raw,sampledAt:row.sampledAt,ageMs:row.ageMs};
   }
   return {ok:true,active:x.active,fields};
  }
  if(req.op==='release'&&keys.length===1){scheduler.release(token);return {ok:true};}
  if(req.op!=='demand'||keys.some(k=>!['op','fields','freshnessMs'].includes(k)))return fail('INVALID_REQUEST');
  const fields=req.fields,fresh=req.freshnessMs;
  if(!Array.isArray(fields)||!fields.length||fields.length>LIMITS.fields||new Set(fields).size!==fields.length||
   !fresh||typeof fresh!=='object'||Array.isArray(fresh)||Object.keys(fresh).length!==fields.length||
   fields.some(k=>typeof k!=='string'||!profile.fields.includes(k)||!Object.prototype.hasOwnProperty.call(fresh,k)||!Number.isInteger(fresh[k])||fresh[k]<profile.freshnessMs[k]||fresh[k]>LIMITS.maxFreshnessMs))return fail('INVALID_DEMAND');
  const result=scheduler.demand(token,fields.slice(),Object.assign(Object.create(null),fresh),LIMITS.leaseMs);
  if(result.ok)s.expires=now()+LIMITS.leaseMs;
  return result;
 }
 async function tick(){prune();if(closed||now()-lastTick<1000)return false;lastTick=now();return scheduler.tick();}
 return {connect,tick,close(){closed=true;for(const token of sessions.keys())disconnect(token);scheduler.close();},status(){prune();return {sessions:sessions.size,scheduler:scheduler.status()};}};
}
module.exports={createApi,LIMITS};
