'use strict';
const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path');
const gear=require('./cc-vehicle-gear-096'),{create}=require('./cc-source-probe-report-094');
assert.equal(gear.stage(4),'D');assert.equal(gear.stage(2),'R');assert.equal(gear.stage('P'),'P');
assert.equal(gear.stage('INITIALISIERUNG'),null);
assert.deepStrictEqual(gear.selection(3),{stage:'P',gear:0});
assert.deepStrictEqual(gear.selection(2),{stage:'R',gear:-1});
assert.deepStrictEqual(gear.selection('_1'),{stage:'D',gear:1});
assert.deepStrictEqual(gear.selection(4),{stage:null,gear:0});
assert.equal(gear.selection('INITIALISIERUNG'),null);
(async()=>{
 const subscriptions=[],shutdown=[];
 const signals={async watch(iface,instance,handlers){
  assert.equal(iface,gear.IFACE);assert.equal(instance,'1');
  subscriptions.push(Object.keys(handlers));
  handlers.statusGearboxDrive({statusActualStageDrive:4});
  handlers.DataPowerTrain2({statusGearSelectionDrive:'_1'});
  return {shutdown(){shutdown.push('closed');}};
 }};
 const result=await gear.capture('D',signals,{durationMs:500,delay:async()=>{}});
 assert.equal(result.kind,'gearD');
 assert.equal(result.matchingObservation,true);
 assert.equal(result.liveStageVerified,false);
 assert.equal(result.conflictingObservation,false);
 assert.equal(result.sources.statusGearboxDrive,'sample');
 assert.equal(result.sources.DataPowerTrain2,'sample');
 assert.equal(subscriptions.length,1);assert.equal(shutdown.length,1);
 assert.equal(result.events.length,2);
 const p=await gear.capture('P',{watch:async(_i,_n,h)=>{
  h.statusGearboxDrive({statusActualStageDrive:'P'});
  h.DataPowerTrain2({statusGearSelectionDrive:'NP'});
  return {shutdown(){}};
 }},{durationMs:500,delay:async()=>{}});
 assert.equal(p.matchingObservation,true);assert.equal(p.conflictingObservation,false);
 assert.equal(p.liveStageVerified,false);
 const reverse=await gear.capture('R',{watch:async(_i,_n,h)=>{
  h.DataPowerTrain2({statusGearSelectionDrive:'R'});
  return {shutdown(){}};
 }},{durationMs:500,delay:async()=>{}});
 assert.equal(reverse.kind,'gearR');assert.equal(reverse.matchingObservation,true);
 assert.equal(reverse.liveStageVerified,false);
 const contradiction=await gear.capture('P',{watch:async(_i,_n,h)=>{
  h.statusGearboxDrive({statusActualStageDrive:'D'});
  return {shutdown(){}};
 }},{durationMs:500,delay:async()=>{}});
 assert.equal(contradiction.conflictingObservation,true);assert.equal(contradiction.matchingObservation,false);
 const none=await gear.capture('D',{watch:async()=>({shutdown(){}})},
  {durationMs:500,delay:async()=>{}});
 assert.equal(none.stage,'no-live-sample');
 assert.equal(none.liveStageVerified,false);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cc96-'));
 try{
  const log=create(path.join(dir,'source.json'));
  log.save(p);log.save(reverse);log.save(result);
  assert.equal(log.snapshot().gearStageVerified,false);
  assert.equal(log.snapshot().captures.length,3);
  assert.equal(log.snapshot().captures[2].sources.statusGearboxDrive,'sample');
  assert.equal(log.snapshot().captures[2].events[0].decoded,'D');
  assert.equal(log.envelope().runMode,'cc-wheel-vehicleinformation-reverse-0.1.97');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
 console.log('VehicleInformation P/D decoding, subscription, cleanup, no-sample and report PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});
