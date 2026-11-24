'use strict';
// Private, offline-only bridge. Never register on the legacy diagnostic socket.
// The caller must provide an independently trusted live peer attestor and a
// scheduler using the same private Symbol capabilities. No runtime wiring.
const {createPolicy}=require('./auth-policy');
function createDemandGateway(options){
 const opts=options||{},scheduler=opts.scheduler;
 if(!scheduler||!['demand','snapshot','release'].every(k=>typeof scheduler[k]==='function'))
  throw Error('Internal scheduler required');
 const policy=createPolicy({trustedVerifier:opts.trustedVerifier,grants:opts.grants});
 const deny=()=>({ok:false,error:'Not authorized'});
 async function dispatch(peer,request){
  if(!request||typeof request!=='object'||Array.isArray(request)||
    !['demand','snapshot','release'].includes(request.op))return {ok:false,error:'Unsupported request'};
  const permitted=request.op==='demand'?['op','fields','freshnessMs','leaseMs']:['op'];
  if(Object.keys(request).some(k=>!permitted.includes(k)))return deny();
  // Only the trusted verifier may resolve identity, on every operation.
  const identity=await policy.resolve(peer);
  if(!identity.verified)return deny();
  try{
   if(request.op==='demand'){
    // Do not pass mutable client objects into the scheduler.
    const fields=request.fields;
    const freshness=request.freshnessMs;
    if(!Array.isArray(fields)||fields.length<1||fields.length>32||
      !fields.every(k=>typeof k==='string'&&k.length<=80))return {ok:false,error:'Invalid demand'};
    const copy=typeof freshness==='number'?freshness:
      freshness&&typeof freshness==='object'&&!Array.isArray(freshness)?
      Object.assign(Object.create(null),freshness):null;
    return scheduler.demand(identity.capability,fields.slice(),copy,request.leaseMs);
   }
   return scheduler[request.op](identity.capability);
  }catch(_){return {ok:false,error:'Internal request failed'};}
 }
 return {dispatch,productionReady:false};
}
module.exports={createDemandGateway};
