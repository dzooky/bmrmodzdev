'use strict';
// Explicit fixed diagnostic snapshot, not a production subscription endpoint.
// Returns only the already exposed allowlisted DPF readings, with sample times.
const {createScheduler}=require('./uds-demand-scheduler');
const {build}=require('./dpf-demand-profile');
const {decodeIdentity}=require('./data-catalog');
async function run(read,cancel){
 const stopped=cancel||(()=>false),start=Date.now();
 const result={ok:false,mode:'manual-scheduler-compare',productionAccessEnabled:false,engine:null,fields:{}};
 let scheduler;
 try{
  const profile=build(decodeIdentity(await read(0x12,0xF150),0x12));
  if(!profile||stopped())return result;
  result.engine=profile.engine;
  const token=Symbol('manual-compare');
  scheduler=createScheduler({definitions:profile.definitions,grants:new Map([[token,new Set(profile.fields)]]),read});
  scheduler.demand(token,profile.fields,60000,60000);
  // A single bounded pass: at most one attempt per field, no persistent polling.
  for(let i=0;i<profile.fields.length&&!stopped()&&Date.now()-start<20000;i++)await scheduler.tick();
  if(stopped())return result;
  const snapshot=scheduler.snapshot(token);
  for(const key of profile.fields){
   const row=snapshot.fields[key],spec=profile.definitions[key];
   if(!row||!row.valid)continue;
   result.fields[spec.did]={uds:row.uds,at:row.sampledAt};
  }
  result.ok=true;
  scheduler.release(token);
 }finally{if(scheduler)scheduler.close();}
 return result;
}
module.exports={run};
