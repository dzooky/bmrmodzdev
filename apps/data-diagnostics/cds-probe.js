'use strict';
const {connect}=require('./public-client');
const names=['engine.oilTemperature','engine.coolantTemperature','engine.rpm','vehicle.speed','environment.outsideTemperature'];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function run(request){
 let cds,dpf,egs;const result={rows:[],reference:false,released:false,error:'',config:false,isolated:0,isolatedError:'',mixedError:''},samples={};
 try{
  const original=await request({op:'someipGenerate'},{timeoutMs:15000});
  result.config=!!original.ok;
  if(!original.ok)result.isolatedError=String(original.error||original.stage||'Configuration unavailable');
  const staged=await request({op:'osaSignalGenerate'},{timeoutMs:15000});
  if(!staged.ok)result.error='Staging: '+(staged.error||staged.stage||'FAIL');
  cds=await connect('diagnostics-cds',undefined,'cds');
  const motor=names.slice(0,3),isolatedDemand={op:'demand',fields:motor,freshnessMs:Object.assign({},...motor.map(k=>({[k]:1000})))};
  const seen=new Set();
  for(let i=0;i<20;i++){
   if(i%10===0&&!(await cds.request(isolatedDemand)).ok)throw Error('Isolated demand rejected');
   const snap=await cds.request({op:'snapshot'});
   for(const k of motor)if(snap.fields&&snap.fields[k]&&snap.fields[k].valid)seen.add(k);
   if(seen.size===3)break;
   await sleep(500);
  }
  result.isolated=seen.size;
  const isolatedState=await request({op:'cdsStatus'},{timeoutMs:2500});
  if(isolatedState.error)result.isolatedError=isolatedState.error;
  await cds.request({op:'release'});
  // End isolated worker before starting mixed test; original shutdown bound 500 ms.
  await sleep(600);
  dpf=await connect('diagnostics-reference');
  const catalog=await dpf.request({op:'catalog'});const ref=catalog.fields.find(f=>f.name.endsWith('.request'))||catalog.fields[0];
  egs=await connect('diagnostics-egs',undefined,'egs');
  const atf='transmission.oilTemperature',atfDemand={op:'demand',fields:[atf],freshnessMs:{[atf]:5000}};
  const demand={op:'demand',fields:names,freshnessMs:Object.assign({},...names.map(k=>({[k]:1000})))};
  const refDemand={op:'demand',fields:[ref.name],freshnessMs:{[ref.name]:ref.minFreshnessMs}};
  for(let i=0;i<40;i++){
   if(i%10===0){if(!(await cds.request(demand)).ok||!(await dpf.request(refDemand)).ok||!(await egs.request(atfDemand)).ok)throw Error('Demand rejected');}
   const snapshot=await cds.request({op:'snapshot'});for(const k of names){const v=snapshot.fields&&snapshot.fields[k];if(v&&v.valid)samples[k]=v;}
   const ds=await dpf.request({op:'snapshot'});if(ds.fields&&ds.fields[ref.name]&&ds.fields[ref.name].valid)result.reference=true;
   const es=await egs.request({op:'snapshot'});if(es.fields&&es.fields[atf]&&es.fields[atf].valid)samples[atf]=es.fields[atf];
   if(names.every(k=>samples[k])&&samples[atf]&&result.reference)break;
   await sleep(500);
  }
  const mixedState=await request({op:'cdsStatus'},{timeoutMs:2500});
  result.mixedError=mixedState.error||'';
  const er=await egs.request({op:'release'}),ee=await egs.request({op:'snapshot'});
  const cr=await cds.request({op:'release'}),dr=await dpf.request({op:'release'});const cs=await cds.request({op:'snapshot'}),ds=await dpf.request({op:'snapshot'});result.released=!!(er.ok&&ee.ok&&!ee.active&&cr.ok&&dr.ok&&cs.ok&&ds.ok&&!cs.active&&!ds.active);
 }catch(e){result.error=String(e.message||e).slice(0,120);}
 finally{if(cds)cds.close();if(dpf)dpf.close();if(egs)egs.close();}
 result.rows=names.concat('transmission.oilTemperature').map(name=>({name,valid:!!samples[name],value:samples[name]?samples[name].value:null}));
 result.ok=result.config&&result.isolated===3&&!result.error&&result.rows.every(r=>r.valid)&&result.reference&&result.released;return result;
}
module.exports={run};
