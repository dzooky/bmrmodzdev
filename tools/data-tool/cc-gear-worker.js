'use strict';
// Short-lived, read-only, explicit-only SOME/IP selector probe.
// Never runs at service boot; no vehicle controls are sent.
const fs=require('fs');
const {NODE_CANDIDATES}=require('./signal-environment');
const {createGearState}=require('./gear-state');
const FILE='/var/opt/bmrmodz-data-tool/generator-cc-gear/de_bmw_infrastructure_VehicleInformation.json';
const FIELDS=['statusGearboxDrive','DataPowerTrain2'];
const state=createGearState({maxAgeMs:5000});
let proxy=null,done=false,received={},errors={};
function finish(){
 if(done)return;done=true;
 const snap=state.snapshot();
 const result={ok:snap.valid,stage:snap.valid?'sample':'selector-unavailable',
  selector:snap.stage,source:snap.source,received,errors};
 process.stdout.write(JSON.stringify(result)+'\n');
 if(proxy&&typeof proxy.shutdown==='function')Promise.resolve().then(()=>proxy.shutdown()).catch(()=>{}).then(()=>process.exit(0));
 else process.exit(0);
 setTimeout(()=>process.exit(0),300).unref();
}
async function main(){
 let config;
 try{
  const stat=fs.statSync(FILE);
  if(!stat.isFile()||stat.size<2||stat.size>1048576)throw Error('Invalid gear config');
  config=JSON.parse(fs.readFileSync(FILE,'utf8'));
  if(!config.fields||FIELDS.some(field=>!config.fields[field]))throw Error('Missing gear fields');
 }catch(e){errors.config=String(e.message||e).slice(0,110);return finish();}
 let someip;
 try{
  if(process.env.BMRMODZ_SOMEIP_MODULE)someip=require(process.env.BMRMODZ_SOMEIP_MODULE);
  else try{someip=require('someip');}catch(_){someip=require(require.resolve('someip',{paths:NODE_CANDIDATES}));}
 }catch(e){errors.module=String(e.message||e).slice(0,110);return finish();}
 try{
  proxy=await Promise.resolve().then(()=>someip.buildProxy(config,'1')).then(p=>Promise.resolve(p.init()).then(()=>p));
 }catch(e){errors.proxy=String(e.message||e).slice(0,110);return finish();}
 for(const field of FIELDS){
  const onReceive=value=>{
   if(done)return;
   received[field]={observed:true,valid:state.update(field,value)};
  };
  try{
   await proxy.subscribe({name:field,onReceive});
   if(typeof proxy.getValue==='function')
    Promise.resolve().then(()=>proxy.getValue(field,2000)).then(v=>{if(v)onReceive(v);},()=>{});
  }catch(e){errors[field]=String(e.message||e).slice(0,110);}
 }
 setTimeout(finish,3500);
}
main().catch(e=>{errors.unexpected=String(e.message||e).slice(0,110);finish();});
