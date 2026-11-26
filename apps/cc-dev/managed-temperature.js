'use strict';
// Foreground-only read-only temperature consumer. Data Tool owns acquisition and cache.
const {connect}=require('./public-client');
const FIELDS={
 cds:{outside:'environment.outsideTemperature'},
 ihka:{frontLeft:'climate.frontLeftFootwell',frontRight:'climate.frontRightFootwell',
       rearLeft:'climate.rearLeftFootwell',rearRight:'climate.rearRightFootwell'}
};
function create(options){
 const open=options&&options.connect||connect,now=options&&options.now||Date.now;
 let visible=false,generation=0;
 const groups=Object.keys(FIELDS).map(scope=>({scope,client:null,busy:false,renew:0,next:0,values:{}}));
 function clear(g){g.values={};g.renew=0;}
 function setVisible(on){
  on=!!on;if(on===visible)return;
  visible=on;generation++;
  for(const g of groups){
   clear(g);g.next=0;
   if(g.client){g.client.close();g.client=null;}
  }
 }
 function data(){
  const result={outside:null,frontLeft:null,frontRight:null,rearLeft:null,rearRight:null};
  if(visible)for(const g of groups)for(const [key,row] of Object.entries(g.values)){
   if(now()<=row.until)result[key]=row.value;
  }
  return result;
 }
 function hasValidFootwell(){
  const values=data();
  return ['frontLeft','frontRight','rearLeft','rearRight'].some(k=>Number.isFinite(values[k]));
 }
 async function pollGroup(g){
  if(!visible||g.busy||now()<g.next)return;
  const epoch=generation;g.busy=true;
  let client=g.client;
  const current=()=>visible&&epoch===generation;
  try{
   if(!client){
    client=await open('cc-dev',undefined,g.scope);
    if(!current()){client.close();return;}
    g.client=client;g.renew=0;
   }
   if(!g.renew||now()-g.renew>=5000){
    const fields=Object.values(FIELDS[g.scope]),freshnessMs={};
    for(const f of fields)freshnessMs[f]=g.scope==='ihka'?5000:1000;
    const reply=await client.request({op:'demand',fields,freshnessMs});
    if(!current())return;
    if(!reply||reply.ok!==true)throw Error(reply&&reply.error||'Demand rejected');
    g.renew=now();
   }
   const reply=await client.request({op:'snapshot'});
   if(!current())return;
   if(!reply||reply.ok!==true||!reply.active)throw Error(reply&&reply.error||'Inactive demand');
   const values={};
   for(const [key,name] of Object.entries(FIELDS[g.scope])){
    const row=reply.fields&&reply.fields[name];
    if(row&&row.valid===true&&Number.isFinite(row.value)&&Number.isFinite(row.ageMs)&&
       Number.isFinite(row.validityMs)&&row.ageMs>=0&&row.ageMs<=row.validityMs){
     values[key]={value:row.value,until:now()+row.validityMs-row.ageMs};
    }
   }
   g.values=values;g.next=now()+500;
  }catch(_){
   if(client)client.close();
   if(current()){g.client=null;clear(g);g.next=now()+2000;}
  }finally{g.busy=false;}
 }
 return {data,hasValidFootwell,setVisible,poll(){return Promise.all(groups.map(pollGroup));}};
}
module.exports={create};
