'use strict';
// Manual-only native InternalTasu probe in a disposable child of Data Tool.
// Never reads on boot. Uses only a Tool-owned generated config (no borrowed ACL).
const fs=require('fs');
const {NODE_CANDIDATES}=require('./signal-environment');
const FILE='/var/opt/bmrmodz-data-tool/generator-cc-tasu/com_harman_infotainment_systemfunctions_tasu_tasu_InternalTasu.json';
const INSTANCE='SystemFunctionsInternalTasuInst1';
const ADDRESS=1,SERVICE=0x31;
let proxy=null,done=false,activeTimer=null,pending=null;
function bytes(value){
 if(Buffer.isBuffer(value)||Array.isArray(value))return Array.prototype.slice.call(value);
 if(value&&value.data)return bytes(value.data);
 if(value&&typeof value.length==='number')return Array.prototype.slice.call(value);
 return [];
}
function state(uds,contact){
 if(uds[0]===0x7f&&uds[1]===SERVICE){
  return {state:'unknown',detail:'NRC '+(uds.length>=3?('0'+uds[2].toString(16).toUpperCase()).slice(-2):'unknown')};
 }
 if(uds.length===5&&uds[0]===0x71&&uds[1]===1&&uds[2]===0xA0&&uds[3]===0xD2&&
   (uds[4]===0||uds[4]===1))return {state:uds[4]===1?'latched':'unlatched'};
 return {state:'unknown',detail:'invalid-reply'};
}
function result(output){
 if(done)return;done=true;clearTimeout(activeTimer);
 if(pending){pending.finish({state:'unknown',detail:'worker-closed'});pending=null;}
 process.stdout.write(JSON.stringify(output)+'\n');
 Promise.resolve().then(()=>proxy&&proxy.shutdown&&proxy.shutdown()).catch(()=>{}).then(()=>process.exit(0));
 setTimeout(()=>process.exit(0),300).unref();
}
function fail(stage,e){
 result({ok:false,stage,error:String(e&&e.message||e).slice(0,100),
  source:'service-native-InternalTasu',aclRegistered:false});
}
function capture(message){
 if(!pending)return;
 if(message&&message.errorCode!==undefined&&message.errorCode!=='NO_ERROR'&&message.errorCode!==0)
  return pending.finish({state:'unknown',detail:'transport-error'});
 const b=bytes(message&&message.udsResponse!==undefined?message.udsResponse:message);
 if(b.length<10||b[6]!==ADDRESS)return;
 const u=b.slice(9),contact=pending.contact;
 if(u[0]===0x7f&&u[1]===SERVICE&&u[2]===0x78)return;
 if(u[0]===0x7f&&u[1]===SERVICE)return pending.finish(state(u,contact));
 if(u.length===5&&u[0]===0x71&&u[1]===1&&u[2]===0xA0&&u[3]===0xD2)
  pending.finish(state(u,contact));
}
function read(contact){
 return new Promise(resolve=>{
  const data=[1,0xA0,0xD2,contact];
  let closed=false;
  const complete=x=>{if(closed)return;closed=true;clearTimeout(timer);pending=null;resolve(x);};
  const timer=setTimeout(()=>complete({state:'unknown',detail:'timeout'}),3300);
  pending={contact,finish:complete};
  const params={sourceAddress:0xF2,targetAddress:ADDRESS,serviceID:SERVICE,
    subroutineID:0,udsDataLength:4,udsData:Buffer.from(data),deadlockTime:0};
  // This is an explicit diagnostic read, never a routine control action.
  Promise.resolve().then(()=>proxy.callMethod('sendTasuRequest',params,2500)).then(verdict=>{
   if(closed)return;
   const raw=verdict&&typeof verdict==='object'?(verdict.TasuErrorEnum||Object.keys(verdict).map(k=>verdict[k]).find(x=>typeof x==='string')):verdict;
   if(raw!==undefined&&!/^(NO_ERROR|REQUEST_PENDING|0|1)$/.test(String(raw)))
    complete({state:'unknown',detail:'request-rejected'});
  }).catch(()=>complete({state:'unknown',detail:'call-failed'}));
 });
}
async function main(){
 if(process.argv.length!==3||process.argv[2]!=='read')return fail('args','Unsupported native probe');
 let config;
 try{
  const stat=fs.statSync(FILE);
  if(!stat.isFile()||stat.size<2||stat.size>1048576)throw Error('invalid-config');
  config=JSON.parse(fs.readFileSync(FILE,'utf8'));
  if(!config.methods||!config.methods.sendTasuRequest)throw Error('method-missing');
 }catch(e){return fail('config',e);}
 let someip;
 try{
  if(process.env.BMRMODZ_SOMEIP_MODULE)someip=require(process.env.BMRMODZ_SOMEIP_MODULE);
  else try{someip=require('someip');}
  catch(_){someip=require(require.resolve('someip',{paths:NODE_CANDIDATES}));}
  if(!someip||typeof someip.buildProxy!=='function')throw Error('buildProxy unavailable');
 }catch(e){return fail('native-module',e);}
 try{
  proxy=await new Promise((resolve,reject)=>setImmediate(()=>{
   try{Promise.resolve(someip.buildProxy(config,INSTANCE)).then(p=>Promise.resolve(p.init()).then(()=>p)).then(resolve,reject);}
   catch(e){reject(e);}
  }));
 }catch(e){return fail('proxy-init',e);}
 try{
  await Promise.resolve(proxy.subscribe({name:'sendTasuResponse',onReceive:capture}));
 }catch(e){return fail('subscribe',e);}
 const readings={};
 readings.frontLeft=await read(1);
 readings.frontRight=await read(2);
 const ok=['frontLeft','frontRight'].every(key=>readings[key].state==='latched'||readings[key].state==='unlatched');
 result({ok,stage:ok?'verified-read':'native-read-unavailable',source:'service-native-InternalTasu',
  readings,aclRegistered:false,accessVerified:ok});
}
main().catch(e=>fail('unexpected',e));
module.exports={bytes,state};
