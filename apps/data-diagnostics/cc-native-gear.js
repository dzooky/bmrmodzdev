'use strict';
// Manual, read-only VehicleInformation reference using this app's own
// installer-declared SOME/IP signals. No Data Tool ACL borrowing or guessing.
const IFACE='de.bmw.infrastructure.VehicleInformation';
function decode(field,value){
 if(!value||typeof value!=='object')return null;
 const n=field==='statusGearboxDrive'?value.statusActualStageDrive:value.statusGearSelectionDrive;
 if(field==='statusGearboxDrive'){
  const stages={P:'P',R:'R',N:'N',D:'D',1:'P',2:'R',3:'N',4:'D'};
  const key=typeof n==='number'&&Number.isInteger(n)||typeof n==='string'?String(n):'';
  return Object.prototype.hasOwnProperty.call(stages,key)?stages[key]:null;
 }
 if(typeof n==='string'){
  if(n==='P'||n==='R'||n==='N')return n;
  if(/^_[1-9]$/.test(n))return 'D';
  return null;
 }
 if(!Number.isInteger(n))return null;
 if(n===1)return 'N';
 if(n===2)return 'R';
 if(n===3)return 'P';
 if(n>=5&&n<=13)return 'D';
 return null;
}
async function run(signals,log,options){
 const opts=options||{},limit=opts.timeoutMs||3500;
 const observations={},errors=[];
 if(!signals||typeof signals.watch!=='function')
  return {ok:false,stage:'signals-unavailable',observations,errors};
 let subscription=null,closed=false;
 const handlers={};
 ['statusGearboxDrive','DataPowerTrain2'].forEach(field=>{
  handlers[field]=value=>{
   if(closed)return;
   observations[field]={stage:decode(field,value),received:true};
  };
 });
 const observed=await new Promise(resolve=>{
  let done=false;
  const finish=()=>{if(done)return;done=true;closed=true;resolve();};
  const timer=setTimeout(finish,limit);
  Promise.resolve().then(()=>signals.watch(IFACE,'1',handlers,log)).then(s=>{
   subscription=s;
   if(s&&s.error){errors.push(String(s.error).slice(0,100));clearTimeout(timer);finish();}
  }).catch(e=>{errors.push(String(e&&e.message||e).slice(0,100));clearTimeout(timer);finish();});
 });
 if(subscription&&typeof subscription.shutdown==='function')
  try{await Promise.resolve(subscription.shutdown());}catch(e){errors.push('shutdown: '+String(e&&e.message||e).slice(0,80));}
 const names=Object.keys(observations);
 const stages=names.map(field=>observations[field].stage);
 const valid=stages.length>0&&stages.every(Boolean)&&stages.every(v=>v===stages[0]);
 return {ok:valid,stage:valid?'sample':errors.length?'subscription-error':names.length?'invalid-or-conflict':'no-sample',
  selector:valid?stages[0]:null,source:valid?names.join('+'):'none',observations,errors};
}
module.exports={run,decode};
