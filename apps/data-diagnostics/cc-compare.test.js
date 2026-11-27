'use strict';
const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path');
const cmp=require('./cc-compare'),{create}=require('./cc-compare-report');
const off=[0x62,0xd0,0x74,0,0,0,1,1],on=[0x62,0xd0,0x74,1,0,0x40,2,1];
assert.equal(cmp.parseWheel([0x62,0xd0,0x74]),null);
assert.deepStrictEqual(cmp.parseWheel(off),{bytes:off,on:false,fitted:true});
assert.deepStrictEqual(cmp.compare({wheel:cmp.parseWheel(off)},{wheel:cmp.parseWheel(on)}).differences.map(x=>x.offset),[3,5,6]);
class Diag{
 constructor(){this.p={shutdown(){}};}
 async init(){}
 async physical(ecu,sid,data,ms,accept){
  assert.equal(ecu,0x40);assert.equal(sid,0x22);
  assert.deepStrictEqual(data,[0xd0,0x74]);assert(accept(on));
  return on;
 }
}
(async()=>{
 const c=await cmp.wheelCapture('wheelOn',{Diag,signals:{}});
 assert(c.ok);assert.equal(c.stage,'readback-only');assert.equal(c.trace[1].response[3],1);
 const calls=[];
 const gear=await cmp.gearCapture('gearP',async request=>{
  calls.push(request.op);
  if(request.op==='ccNativeSnapshot')return {ok:true,sampledAt:new Date().toISOString(),
   fields:{gear:{valid:false,value:null},frontLeft:{valid:true,value:'latched'}}};
  if(request.op==='ccGearSourceAudit')return {catalog:{status:'readable',shape:{status:'incomplete-or-schema-unknown',instance1:false}}};
  return {registrationVerified:false,gear:{stagedAclValid:false}};
 });
 assert.deepStrictEqual(calls,['ccNativeSnapshot','ccGearSourceAudit','ccAccessAudit']);
 assert.equal(gear.ok,false);assert.equal(gear.gear,null);
 assert.equal(gear.audit.stage,'instance-or-schema-unverified');
 const now=Date.parse('2026-11-27T12:00:00Z');
 const live=await cmp.gearCapture('gearD',async r=>r.op==='ccNativeSnapshot'?
  {ok:true,sampledAt:new Date(now-200).toISOString(),fields:{gear:{valid:true,value:'D'}}}:
  r.op==='ccGearSourceAudit'?{catalog:{status:'readable',shape:{status:'incomplete-or-schema-unknown'}}}:
  {registrationVerified:false},{now:()=>now});
 assert.equal(live.ok,true);assert.equal(live.gear,'D');
 const stale=await cmp.gearCapture('gearD',async r=>r.op==='ccNativeSnapshot'?
  {ok:true,sampledAt:new Date(now-99999).toISOString(),fields:{gear:{valid:true,value:'D'}}}:null,
  {now:()=>now});
 assert.equal(stale.ok,false);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cc-comp-'));
 try{
  const log=create(path.join(dir,'report.json'));
  log.save({kind:'wheelOff',at:new Date().toISOString(),ok:true,stage:'readback-only',wheel:cmp.parseWheel(off)});
  log.save(c);log.save(gear);log.save(live);
  const x=log.snapshot();
  assert.equal(x.captures.length,4);assert.equal(x.wheelComparison.differences.length,3);
  assert.equal(x.gearSourceVerified,false); // P not yet verified, despite D sample
  assert.equal(log.envelope().runMode,'cc-wheel-gear-comparison-0.1.93');
  assert.equal(create(path.join(dir,'report.json')).snapshot().captures.length,4);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
 console.log('OEM wheel byte diff + strict gear sample validity + bounded comparison report PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});
