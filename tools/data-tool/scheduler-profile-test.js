'use strict';
// Bounded manual test, fixed catalog only. No persistent demand or raw data output.
const {createScheduler}=require('./uds-demand-scheduler');
const {build}=require('./dpf-demand-profile');
const {decodeIdentity}=require('./data-catalog');
async function run(read,options){
 const opts=options||{},now=opts.now||Date.now,wait=opts.wait||(ms=>new Promise(r=>setTimeout(r,ms))),cancel=opts.cancel||(()=>false);
 const start=now(),duration=20000,freshness=5000,maxCalls=48;
 const result={ok:false,mode:'internal-profile-test',productionAccessEnabled:false,engine:null,fields:[],readCalls:0,failures:0,shared:false,passive:false,released:false,elapsedMs:0};
 let scheduler=null,a=Symbol('profile-a'),b=Symbol('profile-b');
 try{
  const identity=decodeIdentity(await read(0x12,0xF150),0x12),profile=build(identity);
  if(!profile||cancel())return result;
  result.engine=profile.engine;
  const records=new Map(profile.fields.map(key=>[key,{name:key.split('.').pop(),samples:0,firstMs:null,lastMs:null,maxIntervalMs:null,valid:false}]));
  result.fields=Array.from(records.values());
  const grants=new Map([[a,new Set(profile.fields)],[b,new Set(profile.fields)]]);
  scheduler=createScheduler({definitions:profile.definitions,grants,now,read:async(ecu,did)=>{
   result.readCalls++;return read(ecu,did);
  }});
  scheduler.demand(a,profile.fields,freshness,30000);
  scheduler.demand(b,profile.fields,freshness,30000);
  result.shared=true;result.passive=true;
  while(!cancel()&&now()-start<duration&&result.readCalls<maxCalls){
   await scheduler.tick();
   const before=result.readCalls,x=scheduler.snapshot(a),y=scheduler.snapshot(b);
   if(!x.active||!y.active){result.shared=false;break;}
   for(const [key,row] of records){
    const p=x.fields[key],q=y.fields[key];
    if(p.valid!==q.valid||p.sampledAt!==q.sampledAt||JSON.stringify(p.uds)!==JSON.stringify(q.uds))result.shared=false;
    row.valid=p.valid===true;
    if(!p.valid)continue;
    const ts=Date.parse(p.sampledAt)-start;
    if(row.lastMs!==ts){
     if(row.lastMs!==null)row.maxIntervalMs=Math.max(row.maxIntervalMs||0,ts-row.lastMs);
     else row.firstMs=ts;
     row.lastMs=ts;row.samples++;
    }
   }
   for(let i=0;i<3;i++){scheduler.snapshot(a);scheduler.snapshot(b);}
   if(before!==result.readCalls)result.passive=false;
   if(result.fields.every(row=>row.samples>=2))break;
   await wait(250);
  }
  result.failures=scheduler.status().stats.failures;
  scheduler.release(a);scheduler.release(b);
  const before=result.readCalls;
  result.released=!await scheduler.tick()&&scheduler.status().activeConsumers===0&&before===result.readCalls;
  result.ok=!cancel()&&result.shared&&result.passive&&result.released&&result.failures===0&&result.fields.every(row=>row.samples>=2);
 }catch(_){}
 finally{if(scheduler)scheduler.close();result.elapsedMs=now()-start;}
 return result;
}
module.exports={run};
