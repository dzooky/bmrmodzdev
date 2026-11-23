'use strict';
// Demand-driven, read-only CDS field worker. Runs only while the Data Tool
// has a live lease. No ACL registration, config changes or vehicle controls.
const fs=require('fs'),path=require('path');
const {NODE_CANDIDATES}=require('./signal-environment');
const CONFIG='/var/opt/bmrmodz-data-tool/generator-test/de_bmw_infotainment_vehicle_CDS.json';
const FIELDS=['statusEngineTemperature','statusEngineSpeed2'];
let proxy=null,stopped=false,poll=null;
function emit(message){try{process.stdout.write(JSON.stringify(message)+'\n');}catch(_){}}
function stop(){
  if(stopped)return;
  stopped=true;
  if(poll)clearInterval(poll);
  const close=proxy&&typeof proxy.shutdown==='function'?Promise.resolve().then(()=>proxy.shutdown()).catch(()=>{}):Promise.resolve();
  close.then(()=>process.exit(0));
  setTimeout(()=>process.exit(0),500).unref();
}
process.on('SIGTERM',stop);
process.on('SIGINT',stop);
function onValue(field,v){
  if(stopped)return;
  const value=field==='statusEngineTemperature'
    ? {oil:v&&v.temperatureEngineOilDrive,coolant:v&&v.temperatureEngineDrive}
    : {rpm:v&&v.actualValueRPMEngineCrankshaft};
  if(!Object.keys(value).every(k=>typeof value[k]==='number'&&Number.isFinite(value[k]))){
    emit({type:'invalid',field});return;
  }
  emit({type:'sample',field,value});
}
async function main(){
  const filename=process.env.BMRMODZ_CDS_STREAM_TEST_CONFIG||CONFIG;
  const stat=fs.statSync(filename);
  if(!stat.isFile()||stat.size<2||stat.size>1048576)throw Error('Invalid staged CDS configuration');
  const config=JSON.parse(fs.readFileSync(filename,'utf8'));
  if(!config||!config.fields||FIELDS.some(f=>!config.fields[f]))throw Error('Staged CDS fields missing');
  let someip;
  if(process.env.BMRMODZ_SOMEIP_MODULE)someip=require(process.env.BMRMODZ_SOMEIP_MODULE);
  else {try{someip=require('someip');}catch(_){someip=require(require.resolve('someip',{paths:NODE_CANDIDATES}));}}
  proxy=await new Promise((resolve,reject)=>setImmediate(()=>{
    try{Promise.resolve(someip.buildProxy(config,'1')).then(p=>Promise.resolve(p.init()).then(()=>p)).then(resolve,reject);}catch(e){reject(e);}
  }));
  for(const field of FIELDS){
    await new Promise((resolve,reject)=>setImmediate(()=>{
      try{Promise.resolve(proxy.subscribe({name:field,onReceive:v=>onValue(field,v)})).then(resolve,reject);}
      catch(e){reject(e);}
    }));
  }
  emit({type:'ready'});
  if(typeof proxy.getValue==='function'){
    // Bounded refresh of two already subscribed fields; one shared proxy.
    const refresh=()=>FIELDS.forEach(field=>{
      Promise.resolve().then(()=>proxy.getValue(field,1000)).then(v=>onValue(field,v),()=>{});
    });
    refresh();
    poll=setInterval(refresh,500);
  }
}
main().catch(e=>{emit({type:'error',error:String(e&&e.message||e).replace(/[\r\n]/g,' ').slice(0,140)});stop();});
