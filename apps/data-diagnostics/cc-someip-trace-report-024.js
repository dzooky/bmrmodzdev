'use strict';
// Four bounded read-only SOME/IP connection traces, no raw proxy payloads or VIN.
const fs=require('fs'),path=require('path');
const FILE='cc-someip-trace-024.json',VERSION='0.2.4';
const str=(v,n)=>String(v==null?'':v).slice(0,n);
const ms=v=>Number.isFinite(v)?Math.max(0,Math.min(60000,v)):null;
const b=v=>v===true?true:v===false?false:null;
function safe(v){
 if(!v||v.kind!=='oemSomeIpTrace')return null;
 const w=v.watch||{},n=v.notifications||{},s=v.shutdown||{},a=n.last||{};
 return {kind:'oemSomeIpTrace',at:str(v.at,30),readOnly:true,writeCount:0,
  service:'SteeringWheelClimate',instance:'1',durationMs:ms(v.durationMs),
  stage:str(v.stage,40),
  watch:{status:str(w.status,35),elapsedMs:ms(w.elapsedMs),
   proxyPresent:w.proxyPresent===true,shutdownAvailable:w.shutdownAvailable===true,
   error:str(w.error,100)},
  notifications:{total:Number.isInteger(n.total)?Math.min(999,Math.max(0,n.total)):0,
   valid:Number.isInteger(n.valid)?Math.min(999,Math.max(0,n.valid)):0,
   firstMs:ms(n.firstMs),lastMs:ms(n.lastMs),
   last:n.last?{heating:b(a.heating),available:b(a.available),coded:b(a.coded)}:null},
  shutdown:{status:str(s.status,35),error:str(s.error,100)},
  errors:Array.isArray(v.errors)?v.errors.slice(0,5).map(x=>str(x,100)):[]};
}
function create(file,io){
 const f=file||path.join(__dirname,'../../data',FILE),disk=io||fs;
 let captures=[];
 try{const x=JSON.parse(disk.readFileSync(f,'utf8'));
  if(x.version===VERSION&&Array.isArray(x.captures))captures=x.captures.slice(-4).map(safe).filter(Boolean);
 }catch(_){}
 const snapshot=()=>({version:VERSION,readOnly:true,writeCount:0,captures:captures.slice()});
 function save(v){
  const item=safe(v);if(!item)throw Error('Invalid SOME/IP trace');
  const next=captures.concat(item).slice(-4),payload=JSON.stringify({...snapshot(),captures:next});
  if(Buffer.byteLength(payload)>14000)throw Error('Trace report size limit');
  disk.writeFileSync(f+'.tmp',payload,{mode:0o600});disk.renameSync(f+'.tmp',f);
  captures=next;return snapshot();
 }
 const envelope=()=>({schema:1,application:'bmrmodz-data-diagnostics',
  runMode:'cc-someip-wheel-trace-0.2.4',results:[],notes:{ccSomeIpTrace:snapshot()}});
 function lines(){
  const out=[];
  for(const x of captures){
   out.push(x.at+' '+x.stage+' / '+x.watch.status);
   out.push('Watch '+x.watch.elapsedMs+'ms proxy='+x.watch.proxyPresent+' / '+x.watch.error);
   out.push('Notifications '+x.notifications.total+' valid='+x.notifications.valid+
    ' first='+x.notifications.firstMs+'ms last='+x.notifications.lastMs+'ms');
   out.push('Last '+JSON.stringify(x.notifications.last));
   out.push('Shutdown '+x.shutdown.status+' / '+x.shutdown.error);
  }
  return out.length?out:['No SOME/IP connection traces'];
 }
 return {save,snapshot,envelope,lines};
}
module.exports={FILE,VERSION,safe,create};
