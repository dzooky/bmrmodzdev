'use strict';
const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path');
const trace=require('./cc-someip-trace-024');
const {create}=require('./cc-someip-trace-report-024');
(async()=>{
 let at=Date.parse('2026-11-27T18:00:00Z'),requests=0,shutdown=0,writes=0;
 const watchOnly={watch:async (name,instance,callbacks)=>{
  requests++;assert.strictEqual(name,trace.BODY);assert.strictEqual(instance,'1');
  callbacks.heatingState({heatingState:{functionalityCoded:true,availability:true,heating:false}});
  return {available:true,proxy:{getValue(){throw Error('must not read direct getter');}},
   shutdown(){shutdown++;}};
 },call(){writes++;throw Error('must not actuate');}};
 const opts={now:()=>at,pause:async ms=>{at+=ms;},durationMs:500,log:{info(){},warn(){}}};
 const good=await trace.capture(watchOnly,opts);
 assert.strictEqual(good.stage,'valid-notification');
 assert.strictEqual(good.watch.proxyPresent,true);
 assert.strictEqual(good.watch.shutdownAvailable,true);
 assert.strictEqual(good.notifications.total,1);
 assert.strictEqual(good.notifications.valid,1);
 assert.deepStrictEqual(good.notifications.last,{heating:false,available:true,coded:true});
 assert.strictEqual(good.shutdown.status,'ok');assert.strictEqual(writes,0);
 const absent=await trace.capture({watch:async()=>({available:false})},opts);
 assert.strictEqual(absent.stage,'service-unavailable');
 assert.strictEqual(absent.watch.status,'unavailable');
 const noField=await trace.capture({watch:async()=>({available:true,shutdown(){shutdown++;}})},opts);
 assert.strictEqual(noField.stage,'no-notification');
 assert.strictEqual(noField.notifications.valid,0);
 const exception=await trace.capture({watch:async()=>{throw Error('failed to bind');}},opts);
 assert.strictEqual(exception.stage,'watch-exception');
 assert.strictEqual(exception.watch.error,'failed to bind');
 const nullSub=await trace.capture({watch:async()=>null},opts);
 assert.strictEqual(nullSub.stage,'no-subscription');
 let later=null;
 const delayed=await trace.capture({watch:async (_n,_i,handlers)=>{
  later=handlers.heatingState;return {available:true,shutdown(){shutdown++;}};
 }},{...opts,pause:async ms=>{
  at+=ms;later({wrapper:{heating:true,availability:true,functionalityCoded:true}});
 }});
 assert.strictEqual(delayed.stage,'valid-notification');
 assert.strictEqual(delayed.notifications.last.heating,true);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cc-someip-'));
 try{
  const log=create(path.join(dir,'sample.json'));
  for(let i=0;i<5;i++)log.save({...good,at:new Date(at+i*1000).toISOString()});
  assert.strictEqual(log.snapshot().captures.length,4);
  assert.strictEqual(create(path.join(dir,'sample.json')).snapshot().captures.length,4);
  assert.strictEqual(log.envelope().runMode,'cc-someip-wheel-trace-0.2.4');
  assert.strictEqual(log.snapshot().writeCount,0);
  assert.strictEqual(JSON.stringify(log.snapshot()).includes('VIN'),false);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
 assert.strictEqual(writes,0);
 assert.strictEqual(requests,1);
 console.log('SOME/IP connection trace subscribed/unavailable/no-sample/errors, no writes, report cap PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});
