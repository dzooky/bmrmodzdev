'use strict';
const client=require('./public-client');
async function run(options){
 const opts=options||{},connect=opts.connect||client.connect,wait=opts.wait||(ms=>new Promise(r=>setTimeout(r,ms)));
 const result={ok:false,engine:null,connection:false,limits:false,shared:false,automatic:false,released:false,error:null};
 let a,b;
 try{
  a=await connect('data-diagnostics');b=await connect('data-diagnostics-reference');
  result.connection=true;
  const catalog=await a.request({op:'catalog'});
  if(!catalog.ok||!Array.isArray(catalog.fields))throw Error('CATALOG');
  result.engine=catalog.engine;
  const field=catalog.fields.find(f=>f.name.endsWith('.request'))||catalog.fields.find(f=>f.name.endsWith('.soot'));
  if(!field)throw Error('FIELD');
  const demand={op:'demand',fields:[field.name],freshnessMs:{[field.name]:field.minFreshnessMs}};
  const denied=await a.request({op:'demand',fields:[field.name],freshnessMs:{[field.name]:1}});
  result.limits=denied.ok===false&&denied.error==='INVALID_DEMAND';
  if(!(await a.request(demand)).ok||!(await b.request(demand)).ok)throw Error('DEMAND');
  // Wait without snapshots: the Tool timer alone must acquire data.
  const firstWait=field.minFreshnessMs===5000?2500:5000;
  await wait(firstWait);
  const x=await a.request({op:'snapshot'}),y=await b.request({op:'snapshot'});
  const p=x.fields&&x.fields[field.name],q=y.fields&&y.fields[field.name];
  result.shared=!!(p&&q&&p.valid&&q.valid&&p.sampledAt===q.sampledAt&&p.raw===q.raw);
  if(!result.shared)throw Error('FIRST_SAMPLE');
  // Renew only the lease, not a read request. For slow B47 fields wait across the full cadence.
  const start=Date.parse(p.sampledAt),target=field.minFreshnessMs;
  for(let elapsed=0;elapsed<target+2000;elapsed+=Math.min(5000,target+2000-elapsed)){
   await wait(Math.min(5000,target+2000-elapsed));
   if(!(await a.request(demand)).ok||!(await b.request(demand)).ok)throw Error('LEASE');
  }
  const next=await a.request({op:'snapshot'}),v=next.fields&&next.fields[field.name];
  result.automatic=!!(v&&v.valid&&Date.parse(v.sampledAt)>start);
  await a.request({op:'release'});await b.request({op:'release'});
  const end=await a.request({op:'snapshot'});
  result.released=end.ok===true&&end.active===false&&Object.keys(end.fields||{}).length===0;
  result.ok=result.connection&&result.limits&&result.shared&&result.automatic&&result.released;
 }catch(e){result.error=String(e.message||e).slice(0,100);}
 finally{if(a)a.close();if(b)b.close();}
 return result;
}
module.exports={run};
