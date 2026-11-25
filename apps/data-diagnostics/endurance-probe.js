'use strict';
const client=require('./public-client');
async function run(options){
 const o=options||{},now=o.now||Date.now,wait=o.wait||(ms=>new Promise(r=>setTimeout(r,ms))),connect=o.connect||client.connect;
 const result={ok:false,engine:null,elapsedMs:0,fields:[],released:false,error:null};
 let c;
 try{
  c=await connect('data-diagnostics-endurance');
  const catalog=await c.request({op:'catalog'});
  if(!catalog.ok)throw Error('CATALOG');
  result.engine=catalog.engine;
  const fields=catalog.fields.filter(f=>/\.(request|mode)$/.test(f.name));
  if(!fields.length)throw Error('FAST_FIELDS_UNAVAILABLE');
  const demand={op:'demand',fields:fields.map(f=>f.name),freshnessMs:{}};
  for(const f of fields)demand.freshnessMs[f.name]=f.minFreshnessMs;
  const rows=fields.map(f=>({name:f.name.split('.').pop(),targetMs:f.minFreshnessMs,samples:0,maxGapMs:0,last:null,stale:0,met:false}));
  result.fields=rows;
  const start=now(),duration=120000;
  let renewed=start;
  if(!(await c.request(demand)).ok)throw Error('DEMAND');
  while(now()-start<duration){
   await wait(500);
   if(now()-renewed>=5000){if(!(await c.request(demand)).ok)throw Error('LEASE');renewed=now();}
   const snapshot=await c.request({op:'snapshot'});
   if(!snapshot.ok||!snapshot.active)throw Error('SESSION');
   result.elapsedMs=now()-start;
   rows.forEach((row,i)=>{
    const v=snapshot.fields[fields[i].name];
    if(!v||!v.valid){row.stale++;return;}
    const stamp=Date.parse(v.sampledAt);
    if(!Number.isFinite(stamp)||stamp<start||stamp===row.last)return;
    if(row.last!==null)row.maxGapMs=Math.max(row.maxGapMs,stamp-row.last);
    row.last=stamp;row.samples++;
   });
   if(o.progress)o.progress(result.elapsedMs);
  }
  for(const row of rows)row.met=row.samples>=Math.floor(duration/(row.targetMs+1500))-1&&row.maxGapMs<=row.targetMs+1500&&row.last!==null&&now()-row.last<=row.targetMs+1500;
 }catch(e){result.error=String(e.message||e).slice(0,100);}
 finally{
  if(c){try{const r=await c.request({op:'release'}),s=await c.request({op:'snapshot'});result.released=!!(r.ok&&s.ok&&!s.active&&Object.keys(s.fields||{}).length===0);}catch(_){}c.close();}
 }
 result.ok=!result.error&&result.elapsedMs>=120000&&result.fields.length>0&&result.fields.every(f=>f.met)&&result.released;
 return result;
}
module.exports={run};
