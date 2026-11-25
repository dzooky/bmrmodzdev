'use strict';
const {connect}=require('./public-client');
const {plan}=require('./data-demand-plan');
const {B57,B47,forDde}=require('./dde-profiles');
function create(options){
 const o=options||{},now=o.now||Date.now,open=o.connect||connect;
 let client=null,identity=null,declared='',renewed=0,retryAt=0;
 function close(){if(client)client.close();client=null;identity=null;declared='';renewed=0;}
 async function poll(foreground){
  if(!foreground){close();return {identity:null,readings:{}};}
  if(now()<retryAt)return {identity:null,readings:{}};
  try{
   if(!client){
    client=await open('dpf-dev');
    const cat=await client.request({op:'catalog'});
    identity=cat.ok&&(cat.engine==='B57'?B57:cat.engine==='B47'?B47:null);
    if(!identity)throw Error('Unsupported DDE');
   }
   const p=plan(identity),fields=p.fields;
   if(!fields.length){close();return {identity:null,readings:{}};}
   const key=fields.join(',');
   if(key!==declared||now()-renewed>=5000){
    const freshnessMs={};for(const name of fields)freshnessMs[name]=p.freshnessMs[name];
    const reply=await client.request({op:'demand',fields,freshnessMs});
    if(!reply.ok)throw Error(reply.error||'DEMAND');
    declared=key;renewed=now();
   }
   const snap=await client.request({op:'snapshot'});
   if(!snap.ok||!snap.active)throw Error('SNAPSHOT');
   const readings={},profile=forDde(identity);
   for(const [name,did,len,factor,offset=0] of profile.overview.concat(profile.detail)){
    const field='dpf.'+p.engine+'.'+name.toLowerCase().replace(/ /g,'_'),row=snap.fields[field];
    if(!fields.includes(field)||!row||!row.valid||!Number.isInteger(row.raw)||row.raw<0||row.raw>=Math.pow(256,len))continue;
    const at=Date.parse(row.sampledAt);
    if(!Number.isFinite(at)||at>now()+2000||row.validityMs!==3*p.freshnessMs[field]||now()-at>row.validityMs)continue;
    readings[name]={raw:row.raw,value:row.raw*factor+offset,at,validityMs:row.validityMs,source:'tool'};
   }
   return {identity,readings};
  }catch(e){close();retryAt=now()+5000;return {identity:null,readings:{},error:String(e.message||e)};}
 }
 return {poll,close};
}
module.exports={create};
