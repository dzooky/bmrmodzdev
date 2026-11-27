'use strict';
const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path');
const {run,CASES,decodeSeat,decodeWheel}=require('./cc-actuation');
const {create}=require('./cc-actuation-report');
const calls=[];
class FakeDiag{
 constructor(){this.p={shutdown:()=>{calls.push('shutdown');}};this.n=0;}
 async init(){}
 async physical(ecu,sid,data,ms,accept){
  calls.push([ecu,sid,data.slice()]);
  let reply;
  if(sid===0x22&&ecu===0x78){
   reply=Array(32).fill(0);reply[0]=0x62;reply[1]=0xd8;reply[2]=0xdb;
   reply[3+CASES.frontHeat.offset]=this.n;
   reply[3+CASES.frontVent.offset]=this.n;
   reply[3+CASES.rearHeat.offset]=this.n;
  }else if(sid===0x31){reply=[0x71].concat(data.slice(0,3));if(data[0]===1&&data[4]===1)this.n=1;}
  else if(sid===0x22){reply=[0x62,0xd0,0x74,Number(this.n===1),0,0,0,1];}
  else {reply=[0x6e,0xd0,0x74];this.n=1;}
  assert(accept(reply));return reply;
 }
}
(async()=>{
 assert.strictEqual(decodeSeat([0x62,0xd8,0xdb,1],19),null);
 assert.deepStrictEqual(decodeWheel([0x62,0xd0,0x74,1,0,0,0,1]),{on:true,fitted:true});
 assert.equal(decodeWheel([0x62,0xd0,0x74,2,0,0,0,1]),null);
 const rejected=await run('wheelHeat',{confirmed:false});
 assert.equal(rejected.status,'SKIP');
 for(const id of Object.keys(CASES)){
  calls.length=0;
  const r=await run(id,{confirmed:true,Diag:FakeDiag,signals:{},pause:async()=>{}});
  assert.equal(r.status,'PASS',id+' '+r.error);
  assert.equal(r.toolActuationVerified,false);
  assert(r.steps.some(x=>x.stage==='read-before-reply'));
  assert(calls.includes('shutdown'));
  if(id!=='wheelHeat'){
   assert(calls.some(x=>Array.isArray(x)&&x[1]===0x31&&x[2][4]===1));
   assert(calls.some(x=>Array.isArray(x)&&x[1]===0x31&&x[2][4]===0));
   assert(calls.some(x=>Array.isArray(x)&&x[1]===0x31&&x[2][0]===2));
  }
 }
 class FailedPress extends FakeDiag{
  async physical(ecu,sid,data,ms,accept){
   if(sid===0x31&&data[0]===1&&data[4]===1){calls.push('press-failure');throw Error('NRC 22');}
   return super.physical(ecu,sid,data,ms,accept);
  }
 }
 calls.length=0;
 const failure=await run('rearHeat',{confirmed:true,Diag:FailedPress,signals:{},pause:async()=>{}});
 assert.equal(failure.status,'FAIL');
 assert(calls.includes('press-failure'));
 assert(calls.some(x=>Array.isArray(x)&&x[1]===0x31&&x[2][4]===0));
 assert(calls.some(x=>Array.isArray(x)&&x[1]===0x31&&x[2][0]===2));
 const wheelRequests=calls.filter(x=>Array.isArray(x)&&x[1]===0x2e);
 // The final operation in the loop is a failed seat; validate the wheel
 // separately with a simulated monotonic clock and real checkpoints.
 let clock=0;calls.length=0;
 const sustained=await run('wheelHeat',{confirmed:true,Diag:FakeDiag,signals:{},
  now:()=>Date.parse('2026-11-27T11:00:00Z')+clock,
  pause:async ms=>{clock+=ms;}});
 assert.equal(sustained.status,'PASS');
 assert.deepStrictEqual(sustained.checks.map(x=>x.seconds),[5,15,30,45]);
 assert(sustained.checks.every(x=>x.on===true));
 assert(calls.some(x=>Array.isArray(x)&&x[1]===0x2e&&x[2][2]===60));
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cc-act-'));
 try{
  const log=create(path.join(dir,'report.json'));
  log.save(sustained);
  assert.equal(log.snapshot().cases.length,1);
  log.feedback('heat-felt');
  assert.equal(log.snapshot().cases[0].physicalFeedback,'heat-felt');
  assert.equal(log.envelope().results.length,0);
  assert.equal(log.envelope().notes.ccActuatorTest.toolActuationVerified,false);
  assert.equal(create(path.join(dir,'report.json')).snapshot().cases.length,1);
  assert(log.lines().some(x=>x.includes('wheelHeat PASS')));
  assert(log.lines().some(x=>x.includes('check-45s=true')));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
 console.log('CC manual wheel 60s/4 checkpoints, prior seat cleanup, physical feedback and log PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});
