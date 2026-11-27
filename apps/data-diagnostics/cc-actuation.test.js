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
 const rejected=await run('frontHeat',{confirmed:false});
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
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cc-act-'));
 try{
  const log=create(path.join(dir,'report.json'));
  for(const id of Object.keys(CASES))log.save({id,startedAt:new Date().toISOString(),
   finishedAt:new Date().toISOString(),status:'PASS',stage:'verified-on',before:0,after:1,steps:[]});
  assert.equal(log.snapshot().cases.length,4);
  assert.equal(log.envelope().results.length,0);
  assert.equal(log.envelope().notes.ccActuatorTest.toolActuationVerified,false);
  assert.equal(create(path.join(dir,'report.json')).snapshot().cases.length,4);
  assert(log.lines().some(x=>x.includes('frontHeat PASS')));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
 console.log('CC manual seat/wheel controls: UDS echo, read-back, failure cleanup, bounded log PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});
