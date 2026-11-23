'use strict';
// Trusted-process gateway adaptor: authorization is supplied by an OS-verified,
// package-aware resolver, never inferred from JSON fields or UID alone.
// Production constructs no resolver and leaves secure data access disabled.
const {DEFINITIONS}=require('./data-catalog');
function createGateway(broker,resolveIdentity){
 if(!broker||typeof broker.get!=='function')throw Error('Broker is required');
 const authorize=typeof resolveIdentity==='function'?resolveIdentity:null;
 async function dispatch(peer,request){
   if(!request||typeof request!=='object'||Array.isArray(request)||
     request.op!=='getData')return {ok:false,error:'Unsupported request'};
   if(!Array.isArray(request.fields)||request.fields.length<1||
     request.fields.length>16||new Set(request.fields).size!==request.fields.length||
     !request.fields.every(x=>typeof x==='string'&&Object.prototype.hasOwnProperty.call(DEFINITIONS,x)))
     return {ok:false,error:'Unsupported field request'};
   if(!authorize)return {ok:false,error:'Authenticated data access unavailable'};
   let result;
   try{result=await authorize(peer);}catch(_){return {ok:false,error:'Authentication unavailable'};}
   // Internal capability MUST be a Symbol from a trusted resolver, not a string.
   if(!result||result.verified!==true||typeof result.capability!=='symbol')
     return {ok:false,error:'Not authorized'};
   return broker.get(request.fields,result.capability);
 }
 return {dispatch,enabled:!!authorize};
}
module.exports={createGateway};
