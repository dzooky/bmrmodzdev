'use strict';
// Existing ctl.sock, opt-in protocol per connection. No reads at startup.
const {createApi}=require('./public-api');
const {decodeIdentity}=require('./data-catalog');
function createRuntime(read,cdsEngine){
 const cdsApi=cdsEngine?createApi({cdsEngine}):null;
 let api=null,initializing=null,closed=false,attempt=0,clients=new Set(),busy=false;
 const fail=error=>({ok:false,error});
 async function init(){
  if(api)return api;
  if(!initializing&&Date.now()-attempt>=15000){
   attempt=Date.now();
   initializing=Promise.resolve().then(()=>read(0x12,0xF150)).then(reply=>{
    const identity=decodeIdentity(reply,0x12);
    if(identity&&!closed)api=createApi({identity,read});
    return api;
   }).catch(()=>null).then(x=>{initializing=null;return x;});
  }
  return initializing||null;
 }
 const timer=setInterval(()=>{if(cdsApi&&!closed)cdsApi.tick().catch(()=>{});if(api&&!busy&&!closed){busy=true;api.tick().catch(()=>{}).then(()=>{busy=false;});}},250);
 if(timer.unref)timer.unref();
 function attach(client){
  if(closed||clients.size>=8)return null;
  let session=null,ended=false,opening=false;
  const entry={close(){if(ended)return;ended=true;clients.delete(entry);if(session)session.close();client.destroy();}};
  clients.add(entry);
  client.once('close',()=>entry.close());
  client.setTimeout(20000,()=>entry.close());
  return {async request(req){
   if(ended)return fail('SESSION_EXPIRED');
   if(!session){
    if(opening||req.op!=='apiHello'||(Object.keys(req).length!==3&&!(Object.keys(req).length===4&&req.scope==='cds'))||req.api!==1||
     typeof req.appId!=='string'||!/^[a-zA-Z0-9._-]{1,64}$/.test(req.appId))return fail('INVALID_HELLO');
    opening=true;const target=req.scope==='cds'?cdsApi:await init();opening=false;
    if(ended||closed)return fail('SESSION_EXPIRED');
    if(!target)return fail('PROFILE_UNAVAILABLE');
    session=target.connect(req.appId);
    return session?{ok:true,api:1}:fail('CAPACITY');
   }
   if(req.op!=='apiRequest'||Object.keys(req).length!==2||!req.request)return fail('INVALID_REQUEST');
   return session.request(req.request);
  }};
 }
 return {attach,status:()=>({connections:clients.size,ready:!!api,scheduler:api?api.status():null}),close(){closed=true;clearInterval(timer);for(const c of clients)c.close();if(api)api.close();if(cdsApi)cdsApi.close();}};
}
module.exports={createRuntime};
