'use strict';
const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path');
const probe=require('./cc-oem-services-099'),{create}=require('./cc-oem-services-report-099');
const fields=[],closed=[];
let clock=Date.parse('2026-11-27T18:00:00Z'),calls=0,writes=0;
class Diag{
 constructor(){this.p={shutdown(){closed.push('bdc');}};}
 async init(){}
 async physical(ecu,sid,data){
  assert.equal(ecu,0x40);assert.equal(sid,0x22);
  assert.deepStrictEqual(data,[0xd0,0x74]);calls++;
  return [0x62,0xd0,0x74,1,0,63,2,1];
 }
}
(async()=>{
 const signals={async watch(iface,instance,handlers){
  assert.equal(instance,'1');fields.push(iface);
  if(iface===probe.CLIMATE){
   handlers.statusSteeringWheelHeating({data:{configuredIntensityLevel:0,actualIntensityLevel:0,saveLUM:false}});
   handlers.statusAvailableSteeringWheelHeating({steeringWheelHeatingAvailable:true,priorityClientID:1});
  }else if(iface===probe.BODY){
   handlers.heatingState({heatingState:{functionalityCoded:true,availability:true,heating:false}});
  }else throw Error('unexpected service');
  return {available:true,shutdown(){closed.push(iface);}};
 }};
 const result=await probe.capture(signals,{Diag,now:()=>clock,delay:async()=>{},pause:async()=>{},durationMs:500});
 assert.equal(result.kind,'oemServices');assert.equal(result.readOnly,true);
 assert.equal(result.stage,'oem-samples');
 assert.equal(result.services.climate.samples.statusSteeringWheelHeating.value.configured,0);
 assert.equal(result.services.body.samples.heatingState.value.heating,false);
 assert.equal(result.bdc.led,false);assert.equal(result.bdc.currentAmps,6.3);
 assert.equal(result.bdc.on,true);assert.equal(calls,1);assert.equal(writes,0);
 assert.equal(closed.length,3);assert.equal(fields.length,2);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cc99-'));
 try{
  const log=create(path.join(dir,'oem.json'));
  for(let i=0;i<5;i++)log.save(Object.assign({},result,{at:new Date(clock+i*1000).toISOString()}));
  assert.equal(log.snapshot().captures.length,4);
  assert.equal(log.snapshot().captures[0].at,new Date(clock+1000).toISOString());
  assert.equal(create(path.join(dir,'oem.json')).snapshot().captures.length,4);
  assert.equal(log.envelope().runMode,'cc-oem-services-read-only-0.1.99');
  assert.equal(log.snapshot().activationVerified,false);
  assert(!JSON.stringify(log.snapshot()).includes('VIN'));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
 const missing=await probe.capture({watch:async()=>({available:false})},{Diag:false,pause:async()=>{},durationMs:500});
 assert.equal(missing.stage,'no-oem-sample');
 assert.equal(missing.bdc.status,'not-read');
 assert.equal(missing.services.body.status,'unavailable');
 const noEngine=await probe.capture(signals,{Diag:false,engineOffProbe:true,now:()=>clock,
  pause:async()=>{},durationMs:500});
 assert.equal(noEngine.engineOffProbe,true);
 assert.equal(noEngine.bdc.status,'not-read');
 assert.equal(noEngine.services.body.status,'sample');
 assert.equal(noEngine.services.body.samples.heatingState.value.heating,false);
 const engineLog=create(path.join(os.tmpdir(),'cc-engine-off-'+process.pid+'.json'),{
  readFileSync(){throw Error('missing');},
  writeFileSync(_f,body){assert(JSON.parse(body).captures[0].engineOffProbe);},
  renameSync(){}
 });
 engineLog.save(noEngine);
 assert.equal(engineLog.snapshot().captures[0].engineOffProbe,true);
 console.log('OEM read-only service status, BDC reference, no writes and bounded report PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});
