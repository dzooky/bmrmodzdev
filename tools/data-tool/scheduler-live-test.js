'use strict';
// Explicit bounded INTERNAL experiment using one already allowlisted DPF DID.
// No app authentication, no externally supplied demand, no raw data returned.
// Use the service's established serialized read path; no timers or background polling.
const {createScheduler}=require('./uds-demand-scheduler');
async function run(read){
 const a=Symbol('internal-a'),b=Symbol('internal-b'),field='dpf.request';
 const grants=new Map([[a,new Set([field])],[b,new Set([field])]]);
 let reads=0;
 const scheduler=createScheduler({definitions:{[field]:{ecu:0x12,did:0x44BB,length:1}},grants,
  read:async(ecu,did)=>{reads++;return read(ecu,did);}});
 const result={ok:false,mode:'internal-fixed-read-test',productionAccessEnabled:false,
  accepted:false,shared:false,passive:false,released:false,denied:false,valid:false,readCalls:0};
 try{
  result.denied=!scheduler.demand('dpf-dev',[field],5000,10000).ok;
  result.accepted=scheduler.demand(a,[field],5000,10000).ok&&scheduler.demand(b,[field],5000,10000).ok;
  const empty=!scheduler.snapshot(a).fields[field].valid;
  const first=await scheduler.tick();
  const x=scheduler.snapshot(a).fields[field],y=scheduler.snapshot(b).fields[field];
  result.valid=first&&x.valid&&y.valid;
  result.shared=result.valid&&reads===1&&x.sampledAt===y.sampledAt&&JSON.stringify(x.uds)===JSON.stringify(y.uds);
  // UI sampling is passive. No more ticks during active demand.
  for(let i=0;i<10;i++){scheduler.snapshot(a);scheduler.snapshot(b);}
  result.passive=empty&&reads===1;
  scheduler.release(a);scheduler.release(b);
  result.released=!await scheduler.tick()&&scheduler.status().activeConsumers===0&&reads===1;
  result.ok=['accepted','shared','passive','released','denied','valid'].every(k=>result[k]===true);
 }catch(_){}
 finally{scheduler.close();result.readCalls=reads;}
 return result;
}
module.exports={run};
