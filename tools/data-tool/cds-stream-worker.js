'use strict';
// Shared, demand-selected read-only SOME/IP worker. Existing engine config is preserved.
const fs=require('fs'),path=require('path');
const {NODE_CANDIDATES}=require('./signal-environment');
const ROOT='/var/opt/bmrmodz-data-tool';
const specs={
 statusEngineTemperature:['generator-test','de_bmw_infotainment_vehicle_CDS',{oil:'temperatureEngineOilDrive',coolant:'temperatureEngineDrive'}],
 statusEngineSpeed2:['generator-test','de_bmw_infotainment_vehicle_CDS',{rpm:'actualValueRPMEngineCrankshaft'}],
 statusCarSpeed2:['generator-osa','de_bmw_infotainment_vehicle_Vehicle2',{speed:'speedVehicleCentreOfGravity'}],
 ExteriorTemperature:['generator-osa','de_bmw_infrastructure_EnvironmentalInformation',{outside:'temperatureExterior'}]
};
const fields=(process.argv[2]||'statusEngineTemperature,statusEngineSpeed2').split(',');
const proxies=[],polls=[];let stopped=false;
function emit(x){try{process.stdout.write(JSON.stringify(x)+'\n');}catch(_){}}
function stop(){if(stopped)return;stopped=true;polls.forEach(clearInterval);Promise.all(proxies.map(p=>Promise.resolve().then(()=>p.shutdown&&p.shutdown()).catch(()=>{}))).then(()=>process.exit(0));setTimeout(()=>process.exit(0),500).unref();}
process.on('SIGTERM',stop);process.on('SIGINT',stop);
function onValue(field,v){if(stopped)return;const value={};for(const k of Object.keys(specs[field][2])){const raw=v&&v[specs[field][2][k]];if(typeof raw==='number'&&Number.isFinite(raw))value[k]=raw;}if(!Object.keys(value).length)emit({type:'invalid',field});else emit({type:'sample',field,value});}
async function main(){
 if(fields.some(f=>!Object.prototype.hasOwnProperty.call(specs,f)))throw Error('Unknown signal group');
 let someip;if(process.env.BMRMODZ_SOMEIP_MODULE)someip=require(process.env.BMRMODZ_SOMEIP_MODULE);else{try{someip=require('someip');}catch(_){someip=require(require.resolve('someip',{paths:NODE_CANDIDATES}));}}
 const groups=new Map();for(const field of fields){const spec=specs[field];const filename=spec[0]==='generator-test'&&process.env.BMRMODZ_CDS_STREAM_TEST_CONFIG||path.join(ROOT,spec[0],spec[1]+'.json');if(!groups.has(filename))groups.set(filename,[]);groups.get(filename).push(field);}
 for(const [filename,names] of groups){
  try{
   const stat=fs.statSync(filename);if(!stat.isFile()||stat.size<2||stat.size>1048576)throw Error('Invalid staged configuration');
   const config=JSON.parse(fs.readFileSync(filename,'utf8'));if(!config.fields||names.some(f=>!config.fields[f]))throw Error('Staged fields missing');
   const proxy=await new Promise((resolve,reject)=>setImmediate(()=>{try{Promise.resolve(someip.buildProxy(config,'1')).then(p=>Promise.resolve(p.init()).then(()=>p)).then(resolve,reject);}catch(e){reject(e);}}));
   proxies.push(proxy);
   for(const field of names)await new Promise((resolve,reject)=>setImmediate(()=>{try{Promise.resolve(proxy.subscribe({name:field,onReceive:v=>onValue(field,v)})).then(resolve,reject);}catch(e){reject(e);}}));
   if(typeof proxy.getValue==='function'){const refresh=()=>names.filter(f=>f!=='ExteriorTemperature').forEach(field=>Promise.resolve().then(()=>proxy.getValue(field,1000)).then(v=>onValue(field,v),()=>{}));refresh();polls.push(setInterval(refresh,500));}
  }catch(e){emit({type:'invalid',field:names.join(','),error:String(e.message||e).slice(0,140)});}
 }
 if(!proxies.length)throw Error('No requested signal proxy available');
 emit({type:'ready'});
}
main().catch(e=>{emit({type:'error',error:String(e.message||e).slice(0,140)});stop();});
