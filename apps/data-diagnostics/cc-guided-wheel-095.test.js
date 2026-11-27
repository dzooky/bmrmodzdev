'use strict';
const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path');
const probe=require('./cc-source-probe-094');
const reportModule=require('./cc-source-probe-report-094');
async function run(){
 const start=Date.parse('2026-11-27T14:00:00Z');
 let clock=start;const stages=[],reads=[];
 class Diag{
  constructor(){this.p={shutdown(){}};}
  async init(){}
  async physical(address,service,data,timeout,accept){
   assert.equal(address,0x40);assert.equal(service,0x22);
   assert.deepStrictEqual(data,[0xd0,0x74]);
   const sec=(clock-start)/1000, on=sec>=4&&sec<70?1:0;
   const reply=[0x62,0xd0,0x74,on,0,on?0x40:0, on?2:1,1];
   assert(accept(reply));reads.push({sec,on});return reply;
  }
 }
 const wheel=await probe.captureGuidedWheel({},{
  Diag,now:()=>clock,delay:async ms=>{clock+=ms;},
  pollMs:2000,warmthMs:60000,onStage:(stage)=>stages.push(stage)
 });
 assert.equal(wheel.stage,'on-off-confirmed');
 assert.equal(wheel.onDetected,true);assert.equal(wheel.offDetected,true);
 assert.equal(wheel.ok,true);assert(reads.some(x=>x.on===0));assert(reads.some(x=>x.on===1));
 assert(stages.includes('turn-on'));assert(stages.includes('turn-off'));
 assert.deepStrictEqual(probe.wheelTransitions(wheel.samples).map(x=>x.offsets.includes(3)),[true,true]);
 assert(wheel.samples.every(s=>s.bytes[0]===0x62));
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cc-guided-'));
 try{
  const log=reportModule.create(path.join(dir,'source.json'));
  log.save(wheel);
  assert.equal(log.snapshot().captures[0].offDetected,true);
  assert.equal(log.envelope().runMode,'cc-guided-oem-wheel-gear-sources-0.1.95');
  assert.equal(reportModule.create(path.join(dir,'source.json')).snapshot().captures[0].mode,'guided-oem');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
 let noOnClock=start;
 class NeverOn{
  constructor(){this.p={shutdown(){}};}async init(){}
  async physical(){return [0x62,0xd0,0x74,0,0,0,1,1];}
 }
 const noOn=await probe.captureGuidedWheel({},{
  Diag:NeverOn,now:()=>noOnClock,delay:async ms=>{noOnClock+=ms;},
  onLimitMs:4000,pollMs:1000,warmthMs:0
 });
 assert.equal(noOn.stage,'on-timeout');assert.equal(noOn.ok,false);
 let earlyClock=start;
 class EarlyOff{
  constructor(){this.p={shutdown(){}};}async init(){}
  async physical(){const s=(earlyClock-start)/1000;
   return [0x62,0xd0,0x74,s>=2&&s<6?1:0,0,0,2,1];}
 }
 const early=await probe.captureGuidedWheel({},{
  Diag:EarlyOff,now:()=>earlyClock,delay:async ms=>{earlyClock+=ms;},
  pollMs:1000,warmthMs:15000
 });
 assert.equal(early.stage,'early-off');assert.equal(early.ok,false);
 console.log('Guided OEM wheel read-only ON/OFF prompts, save, timeout and early OFF PASS');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
