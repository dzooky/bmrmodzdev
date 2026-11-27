'use strict';
// Private sanitized test report, maximum 4 captures; never stores unbounded SOME/IP structures.
const fs=require('fs'),path=require('path');
const FILE='cc-oem-services-099.json',VERSION='0.1.99';
const clip=(v,n)=>String(v==null?'':v).slice(0,n);
const atom=v=>v===null||typeof v==='boolean'||typeof v==='number'||typeof v==='string'?(typeof v==='string'?clip(v,60):v):null;
function safe(v){
 if(!v||v.kind!=='oemServices')return null;
 const x={kind:'oemServices',at:clip(v.at,30),readOnly:true,stage:clip(v.stage,50),services:{},errors:[],
  writeCount:0,bdc:{status:clip(v.bdc&&v.bdc.status,35),bytes:null,on:null,led:null,currentAmps:null,actuator:null,coded:null}};
 for(const id of ['climate','body']){
  const s=v.services&&v.services[id]||{},samples={};
  const fields=id==='climate'?['statusSteeringWheelHeating','statusAvailableSteeringWheelHeating']:['heatingState'];
  for(const name of fields){
   const data=s.samples&&s.samples[name];
   if(!data)continue;
   const values={},keys=name==='statusSteeringWheelHeating'?['configured','actual','saveLUM']:
    name==='statusAvailableSteeringWheelHeating'?['available','priority']:['coded','available','heating'];
   for(const k of keys)values[k]=atom(data.value&&data.value[k]);
   samples[name]={at:clip(data.at,30),value:values};
  }
  x.services[id]={status:clip(s.status,40),samples};
 }
 const b=v.bdc||{};
 if(Array.isArray(b.bytes)&&b.bytes.length===8&&b.bytes.every(n=>Number.isInteger(n)&&n>=0&&n<=255))x.bdc.bytes=b.bytes.slice();
 for(const k of ['on','led','currentAmps','actuator','coded'])x.bdc[k]=atom(b[k]);
 x.errors=Array.isArray(v.errors)?v.errors.slice(0,12).map(e=>clip(e,100)):[];
 return x;
}
function create(file,io){
 const f=file||path.join(__dirname,'../../data',FILE),disk=io||fs;
 let captures=[];
 try{const x=JSON.parse(disk.readFileSync(f,'utf8'));
  if(x.version===VERSION&&Array.isArray(x.captures))captures=x.captures.slice(-4).map(safe).filter(Boolean);
 }catch(_){}
 const snapshot=()=>({version:VERSION,readOnly:true,activationVerified:false,captures:captures.slice()});
 function save(r){
  const v=safe(r);if(!v)throw Error('Invalid OEM services result');
  const next=captures.concat([v]).slice(-4),body=JSON.stringify({...snapshot(),captures:next});
  if(Buffer.byteLength(body)>24000)throw Error('OEM report limit');
  disk.writeFileSync(f+'.tmp',body,{mode:0o600});disk.renameSync(f+'.tmp',f);
  captures=next;return snapshot();
 }
 const envelope=()=>({schema:1,application:'bmrmodz-data-diagnostics',
  runMode:'cc-oem-services-read-only-0.1.99',results:[],notes:{ccOemServices:snapshot()}});
 function lines(){
  const out=[];
  for(const x of captures){
   out.push(x.at+' '+x.stage+' / '+x.errors.join(' '));
   for(const id of ['climate','body']){
    const s=x.services[id];out.push(id+': '+s.status);
    for(const field of Object.keys(s.samples))out.push(field+' '+JSON.stringify(s.samples[field].value));
   }
   out.push('BDC '+x.bdc.status+' '+JSON.stringify(x.bdc.bytes)+' / no writes');
  }
  return out.length?out:['No OEM service captures'];
 }
 return {save,snapshot,envelope,lines};
}
module.exports={FILE,VERSION,safe,create};
