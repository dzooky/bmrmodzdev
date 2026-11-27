'use strict';
const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path');
const {run,state,BODY}=require('./cc-oem-wheel-on-0200');
const {create}=require('./cc-oem-wheel-on-report-0200');
const origin=Date.parse('2026-11-27T18:00:00Z');
(async()=>{
 let t=origin,heating=false,commandCount=0,shutdownCount=0,btnCount=0;
 const sub={available:true,proxy:{async getValue(field){
  assert.equal(field,'heatingState');return {heatingState:{heating,functionalityCoded:true,availability:true}};
 }},shutdown(){shutdownCount++;}};
 const signals={
  async watch(iface,instance,handlers){
   assert.equal(iface,BODY);assert.equal(instance,'1');
   handlers.heatingState({heating:false,functionalityCoded:true,availability:true});return sub;
  },
  async call(proxy,name,args,timeout){
   assert.equal(proxy,sub.proxy);assert.equal(name,'requestHeating');
   assert.deepStrictEqual(args,{requestor:[0,0,0,0,0],heating:true});
   assert.equal(timeout,3000);commandCount++;heating=true;
  }
 };
 const options={confirmed:true,beltGate:true,signals,Diag:false,now:()=>t,
  delay:async ms=>{t+=ms;},
  ask:async phase=>{
   if(phase==='kombi-on')return 'activated';
   if(phase==='physical-heat')return 'warm';
   if(phase==='press-oem-button'){btnCount++;heating=false;return 'pressed';}
   if(phase==='kombi-after-button')return 'deactivated';
  }};
 const good=await run(options);
 assert.equal(good.status,'CAPTURED');assert.equal(good.before.heating,false);
 assert.equal(good.requestAttempted,true);assert.equal(good.requestAccepted,true);
 assert.equal(good.after.heating,true);assert.equal(good.afterButton.heating,false);
 assert.equal(good.physical,'warm');assert.equal(good.kombi,'activated');
 assert.equal(good.oemButton,'deactivated');assert.equal(commandCount,1);
 assert.equal(btnCount,1);assert.equal(shutdownCount,1);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cc200-'));
 try{
  const log=create(path.join(dir,'report.json'));
  for(let i=0;i<5;i++)log.save({...good,startedAt:new Date(origin+i*1000).toISOString()});
  assert.equal(log.snapshot().attempts.length,4);
  assert.equal(create(path.join(dir,'report.json')).snapshot().attempts.length,4);
  assert.equal(log.envelope().runMode,'cc-oem-wheel-on-manual-0.2.0');
  assert.equal(log.snapshot().oemSynchronizationVerified,false);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
 const noGate=await run({...options,beltGate:false});
 assert.equal(noGate.status,'SKIP');assert.equal(commandCount,1);
 heating=true;const already=await run(options);
 assert.equal(already.stage,'not-ready-off');assert.equal(already.requestAttempted,false);
 assert.equal(commandCount,1);
 heating=false;
 const noSample=await run({...options,signals:{
  watch:async()=>({available:true,proxy:{},shutdown(){}}),call:signals.call}});
 assert.equal(noSample.stage,'no-fresh-oem-state');assert.equal(commandCount,1);
 assert.deepStrictEqual(state({heatingState:{heating:false,functionalityCoded:true,availability:true}}),
  {heating:false,coded:true,available:true});
 console.log('OEM manual ON: single request, fresh OFF, gate, BMW button, safe skip and history PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});
