'use strict';
const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path');
const {run}=require('./cc-wheel-oem-098'),{create}=require('./cc-wheel-oem-report-098');
let clock=0,commands=0,reads=0,closed=0,wheel=false;
const origin=Date.parse('2026-11-27T18:00:00Z');
class Diag{
 constructor(){this.p={shutdown(){closed++;}};}
 async init(){}
 async physical(ecu,sid,data,ms,accept){
  assert.equal(ecu,0x40);assert.equal(ms,1500);
  let u;
  if(sid===0x2e){assert.deepStrictEqual(data,[0xd0,0x74,60]);commands++;wheel=true;u=[0x6e,0xd0,0x74];}
  else {assert.equal(sid,0x22);reads++;u=[0x62,0xd0,0x74,wheel?1:0,0,wheel?0x3f:0,wheel?2:1,1];}
  assert(accept(u));return u;
 }
}
const opts=()=>({confirmed:true,Diag,signals:{},now:()=>origin+clock,
 pause:async ms=>{clock+=ms;},ask:async phase=>{
  if(phase==='press1'){wheel=false;return 'pressed';}
  if(phase==='press2'){wheel=true;return 'pressed';}
  if(phase==='kombi1')return 'activated';
  if(phase==='kombi2')return 'activated';
 }});
(async()=>{
 const good=await run(opts());
 assert.equal(good.status,'CAPTURED',JSON.stringify(good.errors));
 assert.equal(good.commandAccepted,true);
 assert.equal(commands,1);assert(reads>=8);assert.equal(closed,1);
 assert.equal(good.press1.kombi,'activated');
 assert.equal(good.press2.kombi,'activated');
 assert(good.samples.some(s=>s.phase==='after-press1'&&s.on===false));
 assert(good.samples.some(s=>s.phase==='after-press2'&&s.on===true));
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cc-wheel-oem98-'));
 try{
  const log=create(path.join(dir,'report.json'));
  for(let i=0;i<5;i++)log.save(Object.assign({},good,{startedAt:new Date(origin+i*1000).toISOString()}));
  assert.equal(log.snapshot().attempts.length,4);
  assert.equal(log.snapshot().attempts[0].startedAt,new Date(origin+1000).toISOString());
  const partial={...good,status:'PARTIAL',stage:'first-press-incomplete',press1:null,press2:null};
  log.save(partial);assert.equal(log.snapshot().attempts.length,4);
  assert.equal(log.snapshot().attempts[3].status,'PARTIAL');
  assert.equal(create(path.join(dir,'report.json')).snapshot().attempts.length,4);
  assert.equal(log.envelope().runMode,'cc-wheel-oem-sequence-0.1.98');
  assert(!JSON.stringify(log.snapshot()).includes('VIN'));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
 clock=0;commands=0;reads=0;closed=0;wheel=false;
 const skipped=await run({...opts(),confirmed:false});
 assert.equal(skipped.status,'SKIP');assert.equal(commands,0);
 const failed=await run({...opts(),ask:async phase=>phase==='press1'?null:'none'});
 assert.equal(failed.stage,'first-press-incomplete');
 assert.equal(failed.commandAccepted,true);
 assert.equal(failed.press1,null);
 assert.equal(commands,1);
 clock=0;commands=0;reads=0;closed=0;wheel=true;
 const already=await run(opts());
 assert.equal(already.status,'SKIP');assert.equal(already.stage,'wheel-must-be-off');assert.equal(commands,0);
 console.log('OEM two-press guided trace, one command, fail-closed, and four-attempt report PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});
