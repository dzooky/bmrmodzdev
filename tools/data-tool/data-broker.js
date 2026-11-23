'use strict';
// PRIVATE broker foundation. This module has NO socket handler.
// A future authenticated gateway must supply a per-process Symbol capability;
// never build that capability from JSON, a client-provided consumer string or UID.
const {DEFINITIONS,decode,decodeFootwell,decodeIdentity,decodeCds}=require('./data-catalog');
function createBroker(options){
 const opts=options||{},read=opts.read,cds=opts.cds,grants=opts.grants,now=opts.now||Date.now;
 if(typeof read!=='function'||!(grants instanceof Map)||grants.size===0||
    Array.from(grants).some(([token,allowed])=>typeof token!=='symbol'||!(allowed instanceof Set)))
   throw Error('Internal broker requires trusted per-app grants');
 const pending=new Map(),stats={requests:0,denied:0,coalesced:0,reads:0,cdsSnapshots:0};
 let cdsUsers=0,cdsLease=null;
 function uds(ecu,did){
   const key=ecu+':'+did;
   if(pending.has(key)){stats.coalesced++;return pending.get(key);}
   stats.reads++;
   const task=Promise.resolve().then(()=>read(ecu,did)).catch(()=>({ok:false,error:'Read unavailable'}));
   pending.set(key,task);
   task.then(()=>pending.delete(key),()=>pending.delete(key));
   return task;
 }
 async function get(fields,capability){
   const allowed=grants.get(capability);
   if(!allowed||!Array.isArray(fields)||fields.some(k=>!allowed.has(k))){stats.denied++;return {ok:false,error:'Not authorized'};}
   if(!Array.isArray(fields)||fields.length<1||fields.length>16||
      fields.some(k=>typeof k!=='string'||!Object.prototype.hasOwnProperty.call(DEFINITIONS,k))||
      new Set(fields).size!==fields.length){
     return {ok:false,error:'Unsupported field request'};
   }
   stats.requests++;
   const results={};
   const entries=fields.map(key=>({key,spec:DEFINITIONS[key]}));
   const needsCds=entries.some(e=>e.spec.source==='cds');
   const needsDde=entries.some(e=>e.spec.profile==='dde');
   const needsEgs=entries.some(e=>e.spec.profile==='egs');
   let identityDde=null,identityEgs=null;
   // Explicit request only; identity is never inferred from arbitrary bytes.
   const ids=await Promise.all([
     needsDde?uds(0x12,0xF150):null,
     needsEgs?uds(0x18,0xF150):null
   ]);
   if(needsDde)identityDde=decodeIdentity(ids[0],0x12);
   if(needsEgs)identityEgs=decodeIdentity(ids[1],0x18);
   let snapshot=null;
   if(needsCds&&cds){
     // Reference-count concurrent clients to avoid premature CDS release.
     cdsUsers++;
     try{
       if(!cdsLease)cdsLease=Promise.resolve().then(()=>cds.demand('diagnostics')).catch(()=>({ok:false}));
       const started=await cdsLease;
       if(started&&started.ok){
         snapshot=cds.snapshot('diagnostics');stats.cdsSnapshots++;
       }
     }catch(_){snapshot=null;}
   }
   try{
     const reads=new Map();
     for(const e of entries){
       const s=e.spec;
       if(s.source!=='uds')continue;
       if(s.profile==='dde'&&!identityDde)continue;
       if(s.profile==='egs'&&!identityEgs)continue;
       const variant=s.variants&&s.variants[identityDde],did=variant?variant.did:s.did;
       const key=s.ecu+':'+did;
       if(!reads.has(key))reads.set(key,uds(s.ecu,did));
     }
     const replies=new Map(await Promise.all(Array.from(reads,async([key,p])=>[key,await p])));
     for(const e of entries){
       const s=e.spec;
       let measure=null;
       if(s.source==='cds'){
         const f=snapshot&&snapshot.fields&&snapshot.fields[s.field];
         if(f&&f.valid===true&&typeof f.ageMs==='number'&&f.ageMs>=0&&f.ageMs<=2000)
           measure=decodeCds(snapshot.values&&snapshot.values[s.field],s);
       }else{
         const variant=s.variants&&s.variants[identityDde],did=variant?variant.did:s.did;
         const reply=replies.get(s.ecu+':'+did);
         measure=s.profile==='ihka'?decodeFootwell(reply,s):
           decode(reply,s,s.profile==='dde'?identityDde:identityEgs);
         // A previously cached or delayed UDS response cannot be advertised as live.
         const age=reply&&typeof reply.at==='string'?now()-Date.parse(reply.at):NaN;
         if(!Number.isFinite(age)||age<0||age>10000)measure=null;
       }
       results[e.key]=measure?{valid:true,value:measure.value,unit:measure.unit,
         sampledAt:s.source==='uds'&&reply&&typeof reply.at==='string'?reply.at:null,
         ageMs:s.source==='cds'?snapshot.fields[s.field].ageMs:null}:
         {valid:false,value:null,unit:s.unit,sampledAt:null,ageMs:null};
     }
     return {ok:true,mode:'internal-test-only',results,at:new Date(now()).toISOString()};
   }finally{
     if(needsCds&&cds){
       cdsUsers--;
       if(cdsUsers===0){
         try{await cds.release('diagnostics');}catch(_){}
         cdsLease=null;
       }
     }
   }
 }
 return {get,stats:()=>Object.assign({},stats)};
}
module.exports={createBroker};
