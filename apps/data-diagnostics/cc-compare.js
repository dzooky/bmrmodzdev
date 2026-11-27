'use strict';
// Manual, read-only capture. Wheel snapshots compare OEM switch OFF vs ON.
// Gear snapshots compare operator-confirmed P vs D without inferring gear from RPM.
// No transmissions, shifting commands, new ACLs or subscriptions.
const {run:gearAudit}=require('./cc-gear-retest');
const FIELDS=['wheelOff','wheelOn','gearP','gearD'];
function parseWheel(reply){
 if(!Array.isArray(reply)||reply.length<8||reply.length>32||
  reply[0]!==0x62||reply[1]!==0xd0||reply[2]!==0x74)return null;
 return {bytes:reply.slice(0,32),on:reply[3]===1?true:reply[3]===0?false:null,
  fitted:reply[7]===1?true:reply[7]===0?false:null};
}
function compare(off,on){
 if(!off||!on)return {comparable:false,differences:[]};
 const a=off.wheel&&off.wheel.bytes,b=on.wheel&&on.wheel.bytes;
 if(!a||!b)return {comparable:false,differences:[]};
 const changes=[];for(let i=0;i<Math.max(a.length,b.length);i++){
  if(a[i]!==b[i])changes.push({offset:i,before:a[i]===undefined?null:a[i],after:b[i]===undefined?null:b[i]});
 }
 return {comparable:true,differences:changes};
}
async function wheelCapture(kind,options){
 const opts=options||{},at=opts.now||Date.now;
 const record={kind,at:new Date(at()).toISOString(),ok:false,stage:'unstarted',wheel:null,error:null,trace:[]};
 if(!['wheelOff','wheelOn'].includes(kind))return record;
 let diag;
 try{
  const Diagnostic=opts.Diag||require('./kit/diag').Diag;
  diag=new Diagnostic(opts.signals,opts.log||{info(){},warn(){}});
  diag.quiet=true;diag.busyLog=false;
  await diag.init();
  if(!diag.p)throw Error('tasu-proxy-unavailable');
  const accept=u=>Array.isArray(u)&&((u[0]===0x62&&u[1]===0xd0&&u[2]===0x74)||(u[0]===0x7f&&u[1]===0x22));
  record.trace.push({at:new Date(at()).toISOString(),request:'22 D0 74'});
  const reply=await diag.physical(0x40,0x22,[0xd0,0x74],1500,accept,
   {maxRetries:0,callTimeoutMs:2000,hardTimeoutMs:3500});
  record.trace.push({at:new Date(at()).toISOString(),response:Array.isArray(reply)?reply.slice(0,32):null});
  if(!reply)throw Error('timeout');
  if(reply[0]===0x7f)throw Error('NRC-'+(reply[2]===undefined?'unknown':reply[2]));
  record.wheel=parseWheel(reply);
  if(!record.wheel||record.wheel.on===null||record.wheel.fitted!==true)throw Error('wheel-state-invalid');
  record.ok=true;record.stage='readback-only';
 }catch(e){record.error=String(e&&e.message||e).slice(0,110);record.stage='read-failed';}
 finally{if(diag&&diag.p&&diag.p.shutdown)try{await Promise.resolve(diag.p.shutdown());}catch(_){}}
 return record;
}
async function gearCapture(kind,request,options){
 const opts=options||{},at=opts.now||Date.now;
 const record={kind,at:new Date(at()).toISOString(),ok:false,stage:'no-live-sample',
  expected:kind==='gearP'?'P':'D',gear:null,source:null,freshnessMs:null,
  audit:null,error:null};
 if(!['gearP','gearD'].includes(kind))return record;
 try{
  const answer=await request({op:'ccNativeSnapshot'},{timeoutMs:21000});
  if(answer&&answer.ok===true&&typeof answer.sampledAt==='string'){
   const age=at()-Date.parse(answer.sampledAt),row=answer.fields&&answer.fields.gear;
   record.freshnessMs=Number.isFinite(age)?age:null;
   if(age>=0&&age<=5000&&row&&row.valid===true&&['P','R','N','D'].includes(row.value)){
    record.gear=row.value;record.source='oap-native-provider';record.ok=row.value===record.expected;
    record.stage=record.ok?'verified-stage':'observed-mismatch';
   }else record.stage='source-not-verified';
  }else record.stage=String(answer&&answer.stage||'provider-unavailable').slice(0,60);
 }catch(e){record.error=String(e&&e.message||e).slice(0,100);record.stage='source-error';}
 // Existing static Tool catalog and ACL probes: independent of any gear motion.
 try{
  const report=await (opts.gearAudit||gearAudit)(request,null);
  record.audit={stage:report.stage,catalogStatus:report.catalogStatus,exactStatus:report.exactStatus,
   instance1:report.instance1===true,aclRegistered:report.aclRegistered===true,
   aclStaged:report.aclStaged===true,vehicleRequests:0};
 }catch(e){record.audit={stage:'audit-error'};}
 return record;
}
module.exports={FIELDS,parseWheel,compare,wheelCapture,gearCapture};
