'use strict';
const assert=require('assert'),gear=require('./cc-native-gear');
(async()=>{
 assert.equal(gear.decode('statusGearboxDrive',{statusActualStageDrive:'P'}),'P');
 assert.equal(gear.decode('DataPowerTrain2',{statusGearSelectionDrive:3}),'P');
 assert.equal(gear.decode('DataPowerTrain2',{statusGearSelectionDrive:5}),'D');
 assert.equal(gear.decode('DataPowerTrain2',{statusGearSelectionDrive:'NP'}),null);
 assert.equal(gear.decode('DataPowerTrain2',{statusGearSelectionDrive:4}),null);
 let closed=0,watched=0;
 const signals={watch(iface,instance,handlers){
  watched++;assert.equal(iface,'de.bmw.infrastructure.VehicleInformation');assert.equal(instance,'1');
  handlers.statusGearboxDrive({statusActualStageDrive:'P'});
  handlers.DataPowerTrain2({statusGearSelectionDrive:'P'});
  return Promise.resolve({shutdown(){closed++;}});
 }};
 const a=await gear.run(signals,null,{timeoutMs:5});
 assert.equal(a.selector,'P');assert.equal(a.ok,true);assert.equal(closed,1);assert.equal(watched,1);
 const conflict=await gear.run({watch(i,n,h){h.statusGearboxDrive({statusActualStageDrive:'P'});h.DataPowerTrain2({statusGearSelectionDrive:'R'});return Promise.resolve({shutdown(){}});}},null,{timeoutMs:5});
 assert.equal(conflict.ok,false);assert.equal(conflict.stage,'invalid-or-conflict');
 const blocked=await gear.run({watch(){return Promise.resolve({error:'not permitted',shutdown(){}});}},null,{timeoutMs:5});
 assert.equal(blocked.ok,false);assert.equal(blocked.stage,'subscription-error');
 const no=await gear.run({watch(){return Promise.resolve({shutdown(){}});}},null,{timeoutMs:5});
 assert.equal(no.ok,false);assert.equal(no.stage,'no-sample');
 const missing=await gear.run(null);assert.equal(missing.stage,'signals-unavailable');
 console.log('CC native gear one-shot: P, conflict, unavailable, cleanup PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});
