'use strict';
const {connect}=require('./public-client');
const names=['engine.oilTemperature','engine.coolantTemperature','engine.rpm','vehicle.speed','environment.outsideTemperature'];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function run(request){
 let cds,dpf;const result={rows:[],reference:false,released:false,error:''},samples={};
 try{
  const staged=await request({op:'osaSignalGenerate'},{timeoutMs:15000});
  if(!staged.ok)result.error='Staging: '+(staged.error||staged.stage||'FAIL');
  cds=await connect('diagnostics-cds',undefined,'cds');
  dpf=await connect('diagnostics-reference');
  const catalog=await dpf.request({op:'catalog'});const ref=catalog.fields.find(f=>f.name.endsWith('.request'))||catalog.fields[0];
  const demand={op:'demand',fields:names,freshnessMs:Object.assign({},...names.map(k=>({[k]:1000})))};
  const refDemand={op:'demand',fields:[ref.name],freshnessMs:{[ref.name]:ref.minFreshnessMs}};
  for(let i=0;i<40;i++){
   if(i%10===0){if(!(await cds.request(demand)).ok||!(await dpf.request(refDemand)).ok)throw Error('Demand rejected');}
   const snapshot=await cds.request({op:'snapshot'});for(const k of names){const v=snapshot.fields&&snapshot.fields[k];if(v&&v.valid)samples[k]=v;}
   const ds=await dpf.request({op:'snapshot'});if(ds.fields&&ds.fields[ref.name]&&ds.fields[ref.name].valid)result.reference=true;
   if(names.every(k=>samples[k])&&result.reference)break;
   await sleep(500);
  }
  const cr=await cds.request({op:'release'}),dr=await dpf.request({op:'release'});const cs=await cds.request({op:'snapshot'}),ds=await dpf.request({op:'snapshot'});result.released=!!(cr.ok&&dr.ok&&cs.ok&&ds.ok&&!cs.active&&!ds.active);
 }catch(e){result.error=String(e.message||e).slice(0,120);}
 finally{if(cds)cds.close();if(dpf)dpf.close();}
 result.rows=names.map(name=>({name,valid:!!samples[name],value:samples[name]?samples[name].value:null}));
 result.ok=!result.error&&result.rows.every(r=>r.valid)&&result.reference&&result.released;return result;
}
module.exports={run};
