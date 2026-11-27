'use strict';
const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path');
const probe=require('./cc-source-probe-094'),{create}=require('./cc-source-probe-report-094');
assert.equal(probe.code(3,probe.LEVER).name,'D');
assert.equal(probe.code(0,probe.LEVER).name,'NA');
assert.equal(probe.code(0,probe.MODE).name,'D-program');
let tick=Date.parse('2026-11-27T13:00:00Z');
const watches=[],stopped=[];
const signals={async watch(iface,instance,handlers){
 assert.equal(instance,'1');watches.push(iface);
 if(iface===probe.BASIC){handlers.basicDataSet({operationGearSelectorSwitch:3});}
 if(iface===probe.MDRIVE){handlers.dataDisplayGearbox({displayProgramGearbox:0});}
 return {shutdown(){stopped.push(iface);}};
}};
(async()=>{
 const gear=await probe.captureGear('D',signals,{now:()=>tick,delay:async()=>{},durationMs:500});
 assert.deepStrictEqual(watches,[probe.BASIC,probe.MDRIVE]);
 assert.equal(stopped.length,2);
 assert.equal(gear.stage,'signals-observed');
 assert.equal(gear.leverDObserved,true);
 assert.equal(gear.liveStageVerified,false);
 assert.equal(gear.events.length,2);
 const empty=await probe.captureGear('P',{watch:async()=>({shutdown(){}})},
  {delay:async()=>{},durationMs:500});
 assert.equal(empty.stage,'no-live-sample');
 assert.equal(empty.liveStageVerified,false);
 class Diag{
  constructor(){this.p={shutdown(){}};}
  async init(){}
  async physical(ecu,sid,data,ms,accept){
   assert.equal(ecu,0x40);assert.equal(sid,0x22);
   assert.deepStrictEqual(data,[0xd0,0x74]);
   const u=[0x62,0xd0,0x74,tick>=Date.parse('2026-11-27T13:00:05Z')&&
    tick<Date.parse('2026-11-27T13:00:35Z')?1:0,0,0x40,2,1];
   assert(accept(u));return u;
  }
 }
 const wheel=await probe.captureWheel({}, {Diag,now:()=>tick,delay:async ms=>{tick+=ms;}});
 assert.equal(wheel.stage,'trace-collected');
 assert.equal(wheel.samples.length,10);
 assert.deepStrictEqual(probe.wheelTransitions(wheel.samples).map(x=>x.to),[5,35]);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cc94-'));
 try{
  const log=create(path.join(dir,'report.json'));
  log.save(gear);log.save(empty);log.save(wheel);
  assert.equal(log.snapshot().gearStageVerified,false);
  assert.equal(log.snapshot().captures.length,3);
  assert.equal(log.snapshot().captures[0].transitions.length,2);
  assert.equal(create(path.join(dir,'report.json')).snapshot().captures.length,3);
  assert.equal(log.envelope().runMode,'cc-guided-oem-wheel-gear-sources-0.1.95');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
 console.log('Read-only BasicDataSet/MDrive source + 45s wheel state timeline and bounded report PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});
