'use strict';
// Foreground-only consumer of the service-owned CDS and EGS caches.
const {connect}=require('./public-client');
const GROUPS={cds:{oil:'engine.oilTemperature',coolant:'engine.coolantTemperature',rpm:'engine.rpm',speed:'vehicle.speed',outside:'environment.outsideTemperature'},egs:{atf:'transmission.oilTemperature'}};
function create(options){
 const open=options&&options.connect||connect, now=options&&options.now||Date.now;
 let visible=false,generation=0,listener=()=>{},reset=()=>{},onStatus=options&&options.onStatus||(()=>{});
 const groups=Object.keys(GROUPS).map(scope=>({scope,client:null,busy:false,renew:0,next:0,values:{},stamp:'',status:''}));
 function clear(g){g.values={};g.stamp='';g.renew=0;}
 function report(g,state){if(g.status===state)return;g.status=state;onStatus(g.scope,state);}
 function setVisible(on){
  on=!!on;if(on===visible)return;visible=on;generation++;
  for(const g of groups){clear(g);g.status='';g.next=0;if(g.client){g.client.close();g.client=null;}}
  reset();
 }
 function data(){
  const result={demo:false,oil:null,coolant:null,rpm:null,speed:null,outside:null,atf:null};
  if(visible)for(const g of groups)for(const [key,row] of Object.entries(g.values))if(now()<=row.until)result[key]=row.value;
  return result;
 }
 async function pollGroup(g){
  if(!visible||g.busy||now()<g.next)return;
  const epoch=generation;g.busy=true;let client=g.client;
  const current=()=>visible&&epoch===generation;
  try{
   if(!client){client=await open('osa-dev',undefined,g.scope);if(!current()){client.close();return;}g.client=client;g.renew=0;}
   if(!g.renew||now()-g.renew>=5000){
    const fields=Object.values(GROUPS[g.scope]),freshnessMs={};for(const field of fields)freshnessMs[field]=g.scope==='egs'?5000:1000;
    const reply=await client.request({op:'demand',fields,freshnessMs});if(!current())return;
    if(!reply.ok)throw Error(reply.error||'Demand rejected');g.renew=now();
   }
   const reply=await client.request({op:'snapshot'});if(!current())return;
   if(!reply.ok||!reply.active)throw Error(reply.error||'Inactive demand');
   const values={},stamps=[];
   for(const [key,name] of Object.entries(GROUPS[g.scope])){
    const row=reply.fields&&reply.fields[name];
    if(row&&row.valid&&Number.isFinite(row.value)&&Number.isFinite(row.ageMs)&&Number.isFinite(row.validityMs)&&row.ageMs>=0&&row.ageMs<=row.validityMs){
     values[key]={value:row.value,until:now()+row.validityMs-row.ageMs};
     stamps.push(key+':'+String(row.sampledAt));
    }
   }
   g.values=values;
   const missing=Object.keys(GROUPS[g.scope]).filter(key=>!Object.prototype.hasOwnProperty.call(values,key));
   report(g,missing.length?'missing:'+missing.join(','):'ready');
   const stamp=stamps.join('|');
   if(g.scope==='cds'&&stamp!==g.stamp){g.stamp=stamp;listener(data());}
   g.next=now()+500;
  }catch(e){if(client)client.close();if(current()){
    const reason=String(e&&e.message||e).replace(/[^a-zA-Z0-9_ -]/g,'').slice(0,100);
    report(g,'error:'+reason);g.client=null;clear(g);g.next=now()+2000;
   }}
  finally{g.busy=false;}
 }
 return {data,setVisible,onSample(fn,onReset){listener=fn;reset=onReset||(()=>{});},poll(){return Promise.all(groups.map(pollGroup));}};
}
module.exports={create};
