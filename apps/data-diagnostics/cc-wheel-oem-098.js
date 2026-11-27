'use strict';
// Manual, foreground-only BDC wheel heat versus OEM switch sequence.
// One established 60-second command (2E D074 3C); no unverified ECU commands,
// no automatic vehicle control, no assumptions about KOMBI display.
// Operator button acknowledgements approximate press timing; they are not OEM telemetry.
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const hex=a=>Array.isArray(a)?a.map(v=>v.toString(16).padStart(2,'0').toUpperCase()).join(' '):'';
const err=e=>String(e&&e.message||e).replace(/[\r\n\t]/g,' ').slice(0,90);
async function run(options){
 const opts=options||{},now=opts.now||Date.now,sleep=opts.pause||pause;
 const report={kind:'wheelOemSequence',mode:'app-on-oem-buttons',startedAt:new Date(now()).toISOString(),
  finishedAt:null,status:'FAIL',stage:'unstarted',commandAccepted:false,commandAt:null,
  press1:null,press2:null,samples:[],errors:[],notes:'Human press times are acknowledgements; KOMBI messages are operator observations; command expiry is NOT measured.'};
 const begin=now(),log=opts.log||{info(){},warn(){}};
 const mark=(phase,detail)=>{report.stage=phase;if(opts.onStage)try{opts.onStage(phase,detail||'');}catch(_){}};
 const elapsed=()=>Math.round((now()-begin)/100)/10;
 const record=(phase,u,error)=>{
  if(report.samples.length>=70)return;
  report.samples.push({elapsedSec:elapsed(),phase,at:new Date(now()).toISOString(),
   bytes:Array.isArray(u)?u.slice(0,16):null,
   on:Array.isArray(u)&&u[3]===1?true:Array.isArray(u)&&u[3]===0?false:null,
   fitted:Array.isArray(u)&&u[7]===1?true:Array.isArray(u)&&u[7]===0?false:null,
   error:error||''});
 };
 let diag=null;
 try{
  if(opts.confirmed!==true||typeof opts.ask!=='function'){
   report.status='SKIP';mark('not-confirmed');return report;
  }
  const Diag=opts.Diag||require('./kit/diag').Diag;
  diag=new Diag(opts.signals,log);diag.quiet=true;diag.busyLog=false;
  await diag.init();if(!diag.p)throw Error('native-proxy-unavailable');
  const read=async phase=>{
   const accept=u=>Array.isArray(u)&&((u[0]===0x62&&u[1]===0xd0&&u[2]===0x74)||(u[0]===0x7f&&u[1]===0x22));
   try{
    const u=await diag.physical(0x40,0x22,[0xd0,0x74],1500,accept,
     {maxRetries:0,callTimeoutMs:2000,hardTimeoutMs:3500});
    if(!u||u[0]===0x7f||u.length<8||!accept(u)||(u[3]!==0&&u[3]!==1)||(u[7]!==0&&u[7]!==1))
     throw Error('D074:invalid-or-negative');
    record(phase,u,'');return {on:u[3]===1,fitted:u[7]===1};
   }catch(e){record(phase,null,err(e));return null;}
  };
  mark('baseline','Wheel must be OFF');
  const baseline=await read('baseline');
  if(!baseline){mark('baseline-unavailable');return report;}
  if(!baseline.fitted){report.status='SKIP';mark('not-fitted');return report;}
  if(baseline.on){report.status='SKIP';mark('wheel-must-be-off');return report;}
  mark('app-on','Applying established 60-second request');
  // Existing verified diagnostic command only; no retry or cancellation command.
  report.commandAt=new Date(now()).toISOString();
  const command=await diag.physical(0x40,0x2e,[0xd0,0x74,60],1500,
   u=>Array.isArray(u)&&((u[0]===0x6e&&u[1]===0xd0&&u[2]===0x74)||(u[0]===0x7f&&u[1]===0x2e)),
   {maxRetries:0,callTimeoutMs:2000,hardTimeoutMs:3500});
  if(!command||command[0]!==0x6e||command[1]!==0xd0||command[2]!==0x74)throw Error('wheel-command-not-accepted');
  report.commandAccepted=true;
  await sleep(1000);
  const started=await read('after-app-on');
  if(!started||!started.on)throw Error('app-on-not-confirmed');
  const press=async n=>{
   const key=n===1?'press1':'press2';
   // If the operator stalls we do not misattribute automatic 60s expiry to OEM.
   if(now()-Date.parse(report.commandAt)>45000){
    report.errors.push(key+':not-enough-time-before-expiry');return false;
   }
   await read('before-'+key);
   mark('await-'+key,'Press physical BMW button, THEN tap confirmation');
   const reply=Promise.resolve().then(()=>opts.ask(key,12000));
   let ack=null;
   const until=now()+12000;
   let done=false;
   reply.then(x=>{ack=x;done=true;}).catch(e=>{ack='error';done=true;report.errors.push(key+':'+err(e));});
   while(!done&&now()<until){
    await sleep(Math.min(1000,Math.max(1,until-now())));
    await read('await-'+key);
   }
   // Allows an externally supplied deterministic ask without busy polling race.
   if(!done)ack=await Promise.race([reply,Promise.resolve(null)]);
   if(ack!=='pressed'){report.errors.push(key+':no-operator-confirmation');return false;}
   const at=elapsed(),t=new Date(now()).toISOString();
   for(let i=0;i<3;i++){await sleep(1000);await read('after-'+key);}
   mark('kombi-'+key,'Select KOMBI message after this press');
   const feedback=await opts.ask('kombi'+n,7000);
   const valid=['activated','deactivated','none'].includes(feedback)?feedback:'unknown';
   report[key]={acknowledgedAt:t,elapsedSec:at,kombi:valid};
   if(valid==='unknown')report.errors.push(key+':kombi-unreported');
   await read('after-kombi-'+key);
   return true;
  };
  if(!await press(1)){mark('first-press-incomplete');return report;}
  if(!await press(2)){mark('second-press-incomplete');return report;}
  report.status=report.errors.length?'PARTIAL':'CAPTURED';
  mark('sequence-captured','Compare BDC and operator KOMBI observations');
 }catch(e){report.errors.push(err(e));mark('failed');}
 finally{
  if(diag&&diag.p&&diag.p.shutdown)try{await Promise.resolve(diag.p.shutdown());}
   catch(e){report.errors.push('shutdown:'+err(e));}
  report.finishedAt=new Date(now()).toISOString();
  if(report.status==='FAIL'&&report.commandAccepted&&report.press1)report.status='PARTIAL';
 }
 return report;
}
module.exports={run,hex};
