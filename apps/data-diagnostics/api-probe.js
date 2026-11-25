'use strict';
const client=require('./public-client');
async function run(options){
 const opts=options||{},connect=opts.connect||client.connect,wait=opts.wait||(ms=>new Promise(r=>setTimeout(r,ms)));
 const now=opts.now||Date.now;
 const result={ok:false,engine:null,connection:null,limits:null,shared:null,automatic:null,released:null,firstSampleMs:null,error:null};
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
  const started=now(),firstLimit=20000;
  let p=null;
  for(let elapsed=0;elapsed<firstLimit;elapsed+=500){
   await wait(500);
   if((elapsed+500)%5000===0){
    if(!(await a.request(demand)).ok||!(await b.request(demand)).ok)throw Error('LEASE');
   }
   const x=await a.request({op:'snapshot'});
   const row=x.fields&&x.fields[field.name];
   if(row&&row.valid){
    const y=await b.request({op:'snapshot'}),q=y.fields&&y.fields[field.name];
    if(q&&q.valid&&row.sampledAt===q.sampledAt&&row.raw===q.raw){p=row;result.firstSampleMs=now()-started;break;}
   }
  }
  result.shared=!!p;
  if(!p)throw Error('FIRST_SAMPLE_TIMEOUT');
  // Renew only the lease, not a read request. For slow B47 fields wait across the full cadence.
  const start=Date.parse(p.sampledAt),target=field.minFreshnessMs;
  for(let elapsed=0;elapsed<target+2000;elapsed+=Math.min(5000,target+2000-elapsed)){
   await wait(Math.min(5000,target+2000-elapsed));
   if(!(await a.request(demand)).ok||!(await b.request(demand)).ok)throw Error('LEASE');
  }
  const next=await a.request({op:'snapshot'}),v=next.fields&&next.fields[field.name];
  result.automatic=!!(v&&v.valid&&Date.parse(v.sampledAt)>start);

 }catch(e){result.error=String(e.message||e).slice(0,100);}
 finally{
  if(a&&b&&result.connection){try{const ra=await a.request({op:'release'}),rb=await b.request({op:'release'});const x=await a.request({op:'snapshot'}),y=await b.request({op:'snapshot'});result.released=!!(ra.ok&&rb.ok&&x.ok&&y.ok&&x.active===false&&y.active===false&&Object.keys(x.fields||{}).length===0&&Object.keys(y.fields||{}).length===0);}catch(_){result.released=false;}}
  if(a)a.close();if(b)b.close();
 }
 result.ok=!!(result.connection&&result.limits&&result.shared&&result.automatic&&result.released);
 return result;
}
module.exports={run};
