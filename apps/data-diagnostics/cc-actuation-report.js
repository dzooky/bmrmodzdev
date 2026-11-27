'use strict';
// Private bounded report, no VIN, UID, vehicle identity or free-form UDS.
const fs=require('fs'),path=require('path');
const IDS=['wheelHeat'];
const FILE='cc-wheel-test-092.json';
function safe(record){
 if(!record||IDS.indexOf(record.id)<0)return null;
 return {id:record.id,source:'diagnostics-oap-native',
  toolActuationVerified:false,startedAt:String(record.startedAt||'').slice(0,30),
  finishedAt:String(record.finishedAt||'').slice(0,30),
  status:['PASS','FAIL','SKIP'].includes(record.status)?record.status:'FAIL',
  stage:String(record.stage||'').slice(0,60),
  before:record.before===null||Number.isInteger(record.before)||typeof record.before==='object'?record.before:null,
  after:record.after===null||Number.isInteger(record.after)||typeof record.after==='object'?record.after:null,
  physicalFeedback:['heat-felt','no-heat','not-checked'].includes(record.physicalFeedback)?record.physicalFeedback:'not-checked',
  gearObservation:record.gearSourceVerified===true&&['P','R','N','D'].includes(record.gearObservation)?record.gearObservation:null,
  gearSourceVerified:record.gearSourceVerified===true&&['P','R','N','D'].includes(record.gearObservation),
  checks:Array.isArray(record.checks)?record.checks.slice(0,4).map(c=>({seconds:c.seconds,on:c.on===true,fitted:c.fitted===true})):[],
  error:String(record.error||'').slice(0,120),
  steps:(record.steps||[]).slice(-48).map(x=>({
   at:String(x.at||'').slice(0,30),stage:String(x.stage||'').slice(0,70),
   ecu:Number.isInteger(x.ecu)?x.ecu:null,sid:Number.isInteger(x.sid)?x.sid:null,
   request:String(x.request||'').slice(0,60),response:String(x.response||'').slice(0,80),
   error:String(x.error||'').slice(0,120),level:Number.isInteger(x.level)?x.level:null,
   on:x.on===true,fitted:x.fitted===true,ok:x.ok===true
  }))};
}
function create(file,io){
 const f=file||path.join(__dirname,'../../data',FILE),disk=io||fs;
 let cases={};
 try{const x=JSON.parse(disk.readFileSync(f,'utf8'));if(x&&x.version==='0.1.92'&&Array.isArray(x.cases))
  x.cases.forEach(v=>{const s=safe(v);if(s)cases[s.id]=s;});}catch(_){}
 function snapshot(){return {version:'0.1.92',toolActuationVerified:false,
  cases:IDS.filter(k=>cases[k]).map(k=>cases[k])};}
 function save(result){
  const v=safe(result);if(!v)throw Error('Invalid CC control report');
  cases[v.id]=v;
  const serialized=JSON.stringify(snapshot());
  if(Buffer.byteLength(serialized)>24576)throw Error('CC control log limit');
  const tmp=f+'.tmp';
  disk.writeFileSync(tmp,serialized,{mode:0o600});disk.renameSync(tmp,f);
  return snapshot();
 }
 function feedback(value){
  if(!['heat-felt','no-heat'].includes(value)||!cases.wheelHeat)throw Error('Missing wheel test');
  const current=Object.assign({},cases.wheelHeat,{physicalFeedback:value});
  return save(current);
 }
 function envelope(){
  return {schema:1,application:'bmrmodz-data-diagnostics',
   runMode:'cc-wheel-manual-0.1.92',results:[],
   notes:{ccActuatorTest:snapshot()}};
 }
 function lines(){
  const out=[];
  for(const s of snapshot().cases){
   out.push(s.id+' '+s.status+' / '+s.stage+' / '+s.error);
   out.push('before='+JSON.stringify(s.before)+' after='+JSON.stringify(s.after)+' touch='+s.physicalFeedback+' gear='+String(s.gearObservation||'unverified'));
   for(const c of s.checks)out.push('check-'+c.seconds+'s='+c.on);
   for(const step of s.steps)out.push(step.stage+' '+step.request+' > '+step.response+(step.error?' '+step.error:''));
  }
  return out.length?out:['No tests collected'];
 }
 return {save,feedback,snapshot,envelope,lines};
}
module.exports={create,safe,FILE,IDS};
