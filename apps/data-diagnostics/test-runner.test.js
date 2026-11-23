'use strict';
const assert=require('assert');
const {createRunner,STEPS}=require('./test-runner');
async function run(){
  let commands=[];
  const sender=async req=>{
    commands.push(req);
    if(req.op==='status')return {ok:true,version:'0.1.5'};
    if(req.op==='securityCheck')return {ok:true,secureSocket:{present:true,mode:'0600',ownerOnly:true},peerIdentityVerified:false,productionAccessEnabled:false};
    if(req.op==='signalEnvironment')return {ok:true,catalog:{present:true},nativeModule:{resolved:false}};
    if(req.op==='configCheck')return {ok:false,error:'Missing CDS config'};
    if(req.op==='someipSetup')return {ok:true,mode:'passive-only',checks:{catalogPresent:true,firmwareAppManagementPresent:true,toolManifestPresent:true,generatedCdsPresent:false},identity:{uid:0},registration:'not verified'};
    if(req.op==='someipGenerated')return {ok:false,mode:'staging-only',error:'Staging unavailable'};
    if(req.op==='someipAudit')return {ok:true,mode:'passive-only',aclRegistered:false,aclCounts:{offers:0,requests:2},identity:{uid:0}};
    if(req.op==='signalNative')return {ok:false,stage:'module-load',error:'Native binding missing'};
    if(req.op==='read')return {ok:true,uds:[0x62,req.did>>8,req.did&255,1]};
    throw Error('Unexpected operation');
  };
  let updates=0;
  const result=await createRunner(sender).run(()=>updates++);
  assert.strictEqual(result.schema,1);
  assert.strictEqual(result.results.length,STEPS.length);
  assert.strictEqual(updates,STEPS.length);
  assert.strictEqual(result.results.find(r=>r.id==='dde').status,'PASS');
  assert.strictEqual(result.results.find(r=>r.id==='cdsTemp').status,'SKIP');
  assert.strictEqual(result.signalPermissionsVerified,false);
  assert.strictEqual(result.results.find(r=>r.id==='someipSetup').status,'PASS');
  assert.strictEqual(result.results.find(r=>r.id==='someipGenerated').status,'FAIL');
  assert.strictEqual(result.results.find(r=>r.id==='someipAudit').status,'PASS');
  assert.ok(result.results.find(r=>r.id==='someipAudit').detail.includes('NOT registered'));
  assert.strictEqual(result.controlsTested,false);
  assert.strictEqual(result.deviceVerified,false);
  assert.strictEqual(JSON.stringify(result).includes('"uds"'),false);
  assert.ok(commands.every(x=>x.op==='read'||['status','securityCheck','signalEnvironment','configCheck','someipSetup','someipGenerated','someipAudit','signalNative','signalStaging','cdsDemand','cdsSnapshot','cdsRelease'].includes(x.op)));
  assert.ok(commands.filter(x=>x.op==='read').every(x=>x.ecu>=0&&Number.isInteger(x.did)));
  assert.strictEqual(result.results.length,17);
  assert.ok(!result.results.some(r=>r.id.startsWith('network')));
  const liveCommands=[];
  let snapshots=0,mockStarts=0;
  const leaseTimes=new Map();
  function mockState(consumer){
    const t=Date.now();
    for(const [id,end] of leaseTimes)if(end<=t)leaseTimes.delete(id);
    const active=leaseTimes.size,fields={};
    for(const field of (consumer==='diagnostics-secondary'?['coolant','rpm']:['oil','coolant','rpm']))
      fields[field]={valid:active>0&&leaseTimes.has(consumer),ageMs:0};
    return {ok:true,consumers:active,running:active>0,fields,
      values:active>0?{coolant:90,rpm:0,...(consumer==='diagnostics-secondary'?{}:{oil:95})}:{},
      stats:{starts:mockStarts,samples:++snapshots}};
  }
  const staged=await createRunner(async req=>{
    liveCommands.push(req);
    if(req.op==='status')return {ok:true};
    if(req.op==='securityCheck')return {ok:true,secureSocket:{present:true,mode:'0600',ownerOnly:true},peerIdentityVerified:false,productionAccessEnabled:false};
    if(req.op==='signalEnvironment')return {ok:true,catalog:{present:true},nativeModule:{resolved:true}};
    if(req.op==='someipAudit')return {ok:true,mode:'passive-only',aclRegistered:false,aclCounts:{offers:0,requests:1},identity:{uid:0}};
    if(req.op==='signalNative')return {ok:true,stage:'module-load'};
    if(req.op==='signalStaging')return {ok:true,stage:'sample',received:true,validated:true,validFields:req.field==='statusEngineTemperature'?{oil:true,coolant:true}:{rpm:true}};
    if(req.op==='cdsDemand'){
      mockState(req.consumer);
      if(leaseTimes.size===0)mockStarts++;
      leaseTimes.set(req.consumer,Date.now()+3000);
      return mockState(req.consumer);
    }
    if(req.op==='cdsSnapshot')return mockState(req.consumer||'diagnostics');
    if(req.op==='cdsRelease'){
      leaseTimes.delete(req.consumer);
      return mockState(req.consumer);
    }
    if(req.op==='read')return {ok:true,uds:[0x62,req.did>>8,req.did&255]};
    return {ok:false,error:'ENOENT: inactive config missing'};
  }).run();
  assert.strictEqual(staged.results.find(x=>x.id==='cdsTemp').status,'PASS');
  assert.strictEqual(staged.results.find(x=>x.id==='cdsRpm').status,'PASS');
  assert.strictEqual(staged.signalPermissionsVerified,false);
  assert.strictEqual(staged.results.find(x=>x.id==='someipConfig').status,'SKIP');
  assert.strictEqual(staged.results.find(x=>x.id==='ipcSecurity').status,'SKIP');
  assert.strictEqual(staged.results.find(x=>x.id==='cdsStream').status,'PASS');
  assert.strictEqual(staged.results.find(x=>x.id==='cdsMulti').status,'PASS');
  assert.strictEqual(liveCommands.filter(x=>x.op==='cdsDemand').length,4);
  assert.strictEqual(liveCommands.filter(x=>x.op==='cdsRelease').length,4);
  assert.ok(staged.results.find(x=>x.id==='cdsTemp').detail.includes('numeric fields validated'));
  const invalid=await createRunner(async req=>{
    if(req.op==='status')return {ok:true};
    if(req.op==='signalEnvironment')return {ok:true,catalog:{present:true},nativeModule:{resolved:true}};
    if(req.op==='someipAudit')return {ok:true,mode:'passive-only',aclRegistered:false,aclCounts:{offers:0,requests:1},identity:{uid:0}};
    if(req.op==='signalNative')return {ok:true,stage:'module-load'};
    if(req.op==='signalStaging')return {ok:false,stage:'value-invalid',received:true,validated:false,
      validFields:req.field==='statusEngineTemperature'?{oil:false,coolant:true}:{rpm:false},
      error:'CDS sample missing numeric field'};
    if(req.op==='read')return {ok:true,uds:[0x62,req.did>>8,req.did&255]};
    return {ok:false,error:'ENOENT: inactive config missing'};
  }).run();
  assert.strictEqual(invalid.results.find(x=>x.id==='cdsTemp').status,'FAIL');
  assert.ok(invalid.results.find(x=>x.id==='cdsTemp').detail.includes('oil'));
  assert.strictEqual(invalid.results.find(x=>x.id==='cdsRpm').status,'FAIL');
  assert.ok(invalid.results.find(x=>x.id==='cdsRpm').detail.includes('rpm'));
  assert.strictEqual(JSON.stringify(invalid).includes('"value"'),false);
  assert.strictEqual(invalid.signalPermissionsVerified,false);
  assert.strictEqual(invalid.results.find(x=>x.id==='cdsStream').status,'FAIL');
  assert.strictEqual(invalid.results.find(x=>x.id==='cdsMulti').status,'FAIL');
  assert.strictEqual(liveCommands.filter(x=>x.op==='signalStaging').length,2);
  const unavailable=await createRunner(async()=>{throw Error('Socket unavailable');}).run();
  assert.strictEqual(unavailable.results[0].status,'FAIL');
  assert.strictEqual(unavailable.results.slice(1).every(r=>r.status==='SKIP'),true);
  const unexpected=await createRunner(async req=>req.op==='status'?{ok:true}:{ok:true,uds:[0x62,0xff,0xff]}).run();
  assert.strictEqual(unexpected.results.find(r=>r.id==='dde').status,'FAIL');
  console.log('Data Diagnostics: safe staged runner, UDS echo, skipped signals, no control, sanitized report passed');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
