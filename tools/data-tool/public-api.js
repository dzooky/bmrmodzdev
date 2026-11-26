'use strict';
// Offline v1 dispatcher. One session per connection; appId is a label, not authentication.
const {createScheduler}=require('./uds-demand-scheduler');
const {build}=require('./dpf-demand-profile');
const LIMITS=Object.freeze({sessions:8,fields:12,leaseMs:15000,minFastMs:5000,minSlowMs:60000,maxFreshnessMs:300000,requestsPerSecond:10,aggregateReadsPerSecond:1});
function createApi(options){
 if(options.cdsEngine&&!options.identity)return createCdsApi(options);
 const egs=options.scope==='egs',ihka=options.scope==='ihka',field='transmission.oilTemperature';
 const ihkaFields=['climate.frontLeftFootwell','climate.frontRightFootwell','climate.rearLeftFootwell','climate.rearRightFootwell'];
 const profile=ihka?{engine:'IHKA',fields:ihkaFields,
   definitions:Object.fromEntries(ihkaFields.map(name=>[name,{ecu:0x78,did:0xD8D7,length:16}])),
   freshnessMs:Object.fromEntries(ihkaFields.map(name=>[name,5000]))}:
   egs?{engine:'EGS',fields:[field],definitions:{[field]:{ecu:0x18,did:0x6000,length:1}},freshnessMs:{[field]:5000}}:
   build(options.identity),now=options.now||Date.now;
 if(!profile)throw Error('Unsupported DDE');
 const grants=new Map(),sessions=new Map();
 // Scheduler requires a nonempty grant map at construction.
 grants.set(Symbol('reserved'),new Set());
 let closed=false,lastRead=-Infinity,identified=false,identifyAfter=0;
 const scheduler=createScheduler({definitions:profile.definitions,grants,now,validityMultiplier:3,read:async(ecu,did)=>{lastRead=now();if(egs&&!identified){if(now()<identifyAfter)return {ok:false};identifyAfter=now()+30000;const reply=await options.read(0x18,0xF150);identified=require('./data-catalog').decodeIdentity(reply,0x18)==='0F25D0';return {ok:false};}return options.read(ecu,did);}});
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
    fields[name]={valid:row.valid,raw,validityMs:row.validityMs,sampledAt:row.sampledAt,ageMs:row.ageMs};
    if(egs){fields[name].value=row.valid?raw-40:null;fields[name].unit='C';}
    if(ihka){
     const spec=require('./data-catalog').DEFINITIONS[name];
     const decoded=row.valid?require('./data-catalog').decodeFootwell({ok:true,uds:row.uds},spec):null;
     fields[name].valid=!!decoded;
     fields[name].raw=decoded?row.uds[spec.index]:null;
     fields[name].value=decoded?decoded.value:null;
     fields[name].unit='C';
    }
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
 async function tick(){prune();if(closed||now()-lastRead<1000)return false;return scheduler.tick();}
 return {connect,tick,close(){closed=true;for(const token of sessions.keys())disconnect(token);scheduler.close();},status(){prune();return {sessions:sessions.size,scheduler:scheduler.status()};}};
}
// CDS scope uses the same service-owned engine and raw signal cache.
const CDS=Object.freeze({'engine.oilTemperature':'oil','engine.coolantTemperature':'coolant','engine.rpm':'rpm','vehicle.speed':'speed','environment.outsideTemperature':'outside'});
function createCdsApi(options){
 const engine=options.cdsEngine,now=options.now||Date.now,sessions=new Map();
 const {DEFINITIONS,decodeCds}=require('./data-catalog');
 let closed=false;
 const fail=error=>({ok:false,error});
 function disconnect(id){engine.releasePublic(id);sessions.delete(id);}
 function prune(){for(const [id,s] of sessions)if(s.expires<=now())disconnect(id);}
 function connect(appId){
  prune();
  if(closed||typeof appId!=='string'||!/^[a-zA-Z0-9._-]{1,64}$/.test(appId)||sessions.size>=LIMITS.sessions)return null;
  const id=Symbol('cds-session'),s={expires:now()+LIMITS.leaseMs,window:now(),count:0,fields:[],fresh:{}};
  sessions.set(id,s);
  return {request(req){
   prune();
   if(!sessions.has(id))return fail('SESSION_EXPIRED');
   if(now()-s.window>=1000){s.window=now();s.count=0;}
   if(++s.count>LIMITS.requestsPerSecond)return fail('RATE_LIMIT');
   if(!req||typeof req!=='object'||Array.isArray(req))return fail('INVALID_REQUEST');
   const keys=Object.keys(req);
   if(req.op==='catalog'&&keys.length===1)return {ok:true,api:1,scope:'cds',fields:Object.keys(CDS).map(name=>({name,minFreshnessMs:1000,unit:DEFINITIONS[name].unit})),limits:LIMITS};
   if(req.op==='release'&&keys.length===1){engine.releasePublic(id);s.fields=[];s.fresh={};return {ok:true};}
   if(req.op==='snapshot'&&keys.length===1){
    const fields={};
    for(const name of s.fields){
     const row=engine.samplePublic(id,CDS[name]),validityMs=s.fresh[name]*3;
     const ageMs=row?Math.max(0,now()-row.at):null;
     const decoded=row&&decodeCds(row.raw,DEFINITIONS[name]);
     const valid=!!decoded&&ageMs<=validityMs;
     fields[name]={valid,raw:valid?row.raw:null,value:valid?decoded.value:null,unit:DEFINITIONS[name].unit,validityMs,ageMs,sampledAt:row?new Date(row.at).toISOString():null};
    }
    return {ok:true,active:s.fields.length>0,fields};
   }
   if(req.op!=='demand'||keys.some(k=>!['op','fields','freshnessMs'].includes(k)))return fail('INVALID_REQUEST');
   const fields=req.fields,fresh=req.freshnessMs;
   if(!Array.isArray(fields)||!fields.length||new Set(fields).size!==fields.length||!fresh||typeof fresh!=='object'||Array.isArray(fresh)||Object.keys(fresh).length!==fields.length||fields.some(k=>!Object.prototype.hasOwnProperty.call(CDS,k)||!Object.prototype.hasOwnProperty.call(fresh,k)||!Number.isInteger(fresh[k])||fresh[k]<1000||fresh[k]>LIMITS.maxFreshnessMs))return fail('INVALID_DEMAND');
   const expiry=now()+LIMITS.leaseMs;
   if(!engine.demandPublic(id,expiry,fields.map(k=>CDS[k])))return fail('CDS_UNAVAILABLE');
   s.fields=fields.slice();s.fresh=Object.assign(Object.create(null),fresh);s.expires=expiry;
   return {ok:true,accepted:fields.length,leaseMs:LIMITS.leaseMs};
  },close:()=>disconnect(id)};
 }
 return {connect,async tick(){prune();return false;},close(){closed=true;for(const id of sessions.keys())disconnect(id);},status(){prune();return {sessions:sessions.size};}};
}
module.exports={createApi,LIMITS};
