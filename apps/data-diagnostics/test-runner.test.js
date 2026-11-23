'use strict';
const assert=require('assert');
const {createRunner,STEPS,drivetrainRead,resultFor,traceSummary,tasuStatusSummary,someipTimings}=require('./test-runner');
async function run(){
  let commands=[];
  const sender=async req=>{
    commands.push(req);
    if(req.op==='status')return {ok:true,version:'0.1.5'};
    if(req.op==='securityCheck')return {ok:true,secureSocket:{present:true,mode:'0600',ownerOnly:true},peerIdentityVerified:false,productionAccessEnabled:false};
    if(req.op==='identitySurvey')return {ok:true,mode:'passive-observation',identity:{uid:0,gid:0},diagnosticSocket:{present:true,mode:'0666',uid:0,gid:0},legacySocketWorldAccessible:true,legacySocketProductionSafe:false,peerIdentityVerified:false,productionAccessEnabled:false,nativePeerCredentialMethod:false};
    if(req.op==='signalEnvironment')return {ok:true,catalog:{present:true},nativeModule:{resolved:false}};
    if(req.op==='configCheck')return {ok:false,error:'Missing CDS config'};
    if(req.op==='someipSetup')return {ok:true,mode:'passive-only',checks:{catalogPresent:true,firmwareAppManagementPresent:true,toolManifestPresent:true,generatedCdsPresent:false},identity:{uid:0},registration:'not verified'};
    if(req.op==='someipGenerated')return {ok:false,mode:'staging-only',error:'Staging unavailable'};
    if(req.op==='someipAudit')return {ok:true,mode:'passive-only',aclRegistered:false,aclCounts:{offers:0,requests:2},identity:{uid:0}};
    if(req.op==='signalNative')return {ok:false,stage:'module-load',error:'Native binding missing'};
    if(req.op==='read'||req.op==='readTrace')return {ok:true,uds:[0x62,req.did>>8,req.did&255,1]};
    throw Error('Unexpected operation');
  };
  let updates=0;
  const result=await createRunner(sender).run(()=>updates++);
  assert.strictEqual(result.schema,1);
  assert.strictEqual(result.results.length,STEPS.length);
  assert.ok(result.someipTimings&&Number.isSafeInteger(result.someipTimings.environmentMs));
  assert.strictEqual(result.someipTimings.ddeMs,undefined);
  assert.deepStrictEqual(someipTimings([{id:'someipLoad',status:'PASS',durationMs:236},
    {id:'someipConfig',status:'SKIP',durationMs:0}]),{nativeLoadMs:236});
  assert.strictEqual(tasuStatusSummary([{shortStatusCodes:{49:2,16:1},
    shortStatusAbsent:1,shortStatusOverflow:0}]),'TASU status 0x10 x1,0x31 x2, absent 1');

  assert.strictEqual(updates,STEPS.length);
  assert.strictEqual(result.results.find(r=>r.id==='dde').status,'PASS');
  assert.strictEqual(result.results.find(r=>r.id==='ipcDac').status,'SKIP');
  assert.strictEqual(result.results.find(r=>r.id==='cdsTemp').status,'SKIP');
  assert.strictEqual(result.signalPermissionsVerified,false);
  assert.strictEqual(result.results.find(r=>r.id==='someipSetup').status,'PASS');
  assert.strictEqual(result.results.find(r=>r.id==='someipGenerated').status,'FAIL');
  assert.strictEqual(result.results.find(r=>r.id==='someipAudit').status,'PASS');
  assert.ok(result.results.find(r=>r.id==='someipAudit').detail.includes('NOT registered'));
  assert.strictEqual(result.controlsTested,false);
  assert.strictEqual(result.deviceVerified,false);
  assert.strictEqual(JSON.stringify(result).includes('"uds"'),false);
  assert.ok(commands.every(x=>x.op==='read'||x.op==='readTrace'||['status','securityCheck','identitySurvey','signalEnvironment','configCheck','someipSetup','someipGenerated','someipAudit','signalNative','signalStaging','cdsDemand','cdsSnapshot','cdsRelease'].includes(x.op)));
  assert.ok(commands.filter(x=>x.op==='read'||x.op==='readTrace').every(x=>x.ecu>=0&&Number.isInteger(x.did)));
  assert.strictEqual(result.results.length,22);
  // At least four 1-second gaps across five sequential ECU checks are deliberate.
  assert.ok(result.results.some(x=>x.id==='egs'));
  const traceClassified=require('./test-runner').traceSummary([
    {ackAccepted:true,matchedEcuEvents:0,otherEcuEvents:0,wrongDidEvents:0,
      pendingEvents:0,negativeEvents:0,malformedEvents:3,
      frameShortFrame:1,frameShortHeader:1,frameLengthOverflow:1,
      frameNonHex:0,frameOddLength:0,frameMissing:0,timedOut:true}
  ]);
  assert.ok(traceClassified.includes('malformed 3 [short 1, header 1, length 1'));
  assert.ok(traceSummary([{ackAccepted:true,shortRejectMarkers:2,shortUnknownMarkers:1,
    shortLengthConsistent:2,shortLengthTruncated:1,shortLength0to4:0,shortLength5to8:3}]).includes('shortTASU reject 2, unknown 1'));


  assert.ok(commands.filter(x=>x.op==='readTrace').length===2);
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
    if(req.op==='identitySurvey')return {ok:true,mode:'passive-observation',identity:{uid:0,gid:0},diagnosticSocket:{present:true,mode:'0666',uid:0,gid:0},legacySocketWorldAccessible:true,legacySocketProductionSafe:false,peerIdentityVerified:false,productionAccessEnabled:false,nativePeerCredentialMethod:false};
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
    if(req.op==='read'||req.op==='readTrace')return {ok:true,uds:[0x62,req.did>>8,req.did&255]};
    return {ok:false,error:'ENOENT: inactive config missing'};
  }).run();
  assert.strictEqual(staged.results.find(x=>x.id==='cdsTemp').status,'PASS');
  assert.strictEqual(staged.results.find(x=>x.id==='cdsRpm').status,'PASS');
  assert.strictEqual(staged.signalPermissionsVerified,false);
  assert.strictEqual(staged.results.find(x=>x.id==='someipConfig').status,'SKIP');
  assert.strictEqual(staged.results.find(x=>x.id==='ipcSecurity').status,'SKIP');
  assert.strictEqual(staged.results.find(x=>x.id==='ipcDac').status,'SKIP');
  assert.strictEqual(staged.results.find(x=>x.id==='ipcLegacyPermissions').status,'SKIP');
  assert.strictEqual(staged.results.find(x=>x.id==='ipcServiceIdentity').status,'PASS');
  assert.strictEqual(staged.results.find(x=>x.id==='ipcAppIdentity').status,'PASS');
  assert.strictEqual(staged.results.find(x=>x.id==='ipcPeerAuth').status,'SKIP');
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
    if(req.op==='read'||req.op==='readTrace')return {ok:true,uds:[0x62,req.did>>8,req.did&255]};
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
  const dacStep=STEPS.find(x=>x.id==='ipcDac');
  const ownIdentity=require('./identity-survey').inspect();
  if(Number.isInteger(ownIdentity.uid)){
    const ready=require('./test-runner').resultFor(dacStep,{ok:true,productionAccessEnabled:false,
      peerIdentityVerified:false,secureSocket:{present:true,mode:'0600',ownerOnly:true,
        dacTargetUid:ownIdentity.uid,ownerUid:ownIdentity.uid,dacOwnershipReady:true}},0);
    assert.strictEqual(ready.status,'PASS');
    const mismatch=require('./test-runner').resultFor(dacStep,{ok:true,productionAccessEnabled:false,
      peerIdentityVerified:false,secureSocket:{present:true,mode:'0600',ownerOnly:true,
        dacTargetUid:ownIdentity.uid+1,ownerUid:ownIdentity.uid+1,dacOwnershipReady:true}},0);
    assert.strictEqual(mismatch.status,'FAIL');
  }
  // DDE/EGS retries are diagnostic-only, bounded and timeout-specific.
  const ddeStep=STEPS.find(x=>x.id==='dde');
  let retryCount=0;
  const recovered=await drivetrainRead(async req=>{
    assert.deepStrictEqual(req,ddeStep.request);
    return ++retryCount<3?{ok:false,error:'No matching response'}:
      {ok:true,uds:[0x62,req.did>>8,req.did&255]};
  },ddeStep);
  assert.strictEqual(recovered.attempts,3);
  assert.strictEqual(recovered.traces.length,3);
  assert.ok(traceSummary([null]).includes('unavailable'));
  assert.strictEqual(traceSummary([{ackAccepted:true,matchedEcuEvents:0,otherEcuEvents:1,wrongDidEvents:0,negativeEvents:0,pendingEvents:0,malformedEvents:0,timedOut:true}]).includes('other 1'),true);
  assert.strictEqual(retryCount,3);
  assert.strictEqual(resultFor(ddeStep,recovered.reply,0).status,'PASS');
  let exhaustedCount=0;
  const exhausted=await drivetrainRead(async()=>{exhaustedCount++;return {ok:false,error:'No matching response'};},ddeStep);
  assert.strictEqual(exhausted.attempts,3);
  assert.strictEqual(exhaustedCount,3);
  assert.strictEqual(resultFor(ddeStep,exhausted.reply,0).status,'FAIL');
  for(const unexpectedReply of [{ok:false,error:'TASU rejected request'},
    {ok:false,error:'UDS negative response',nrc:0x31},
    {ok:false,error:'Unexpected response'}, {ok:true,uds:[0x62,0,0]}]){
    let count=0;
    const noRetry=await drivetrainRead(async()=>{count++;return unexpectedReply;},ddeStep);
    assert.strictEqual(noRetry.attempts,1);
    assert.strictEqual(count,1);
  }
  let transportCalls=0;
  await assert.rejects(drivetrainRead(async()=>{transportCalls++;throw Error('Socket unavailable');},ddeStep),/Socket unavailable/);
  assert.strictEqual(transportCalls,1);
  assert.ok(staged.results.find(x=>x.id==='dde').detail.includes('attempt 1/3'));
  const unavailable=await createRunner(async()=>{throw Error('Socket unavailable');}).run();
  assert.strictEqual(unavailable.results[0].status,'FAIL');
  assert.strictEqual(unavailable.results.slice(1).every(r=>r.status==='SKIP'),true);
  const unexpected=await createRunner(async req=>req.op==='status'?{ok:true}:{ok:true,uds:[0x62,0xff,0xff]}).run();
  assert.strictEqual(unexpected.results.find(r=>r.id==='dde').status,'FAIL');
  console.log('Data Diagnostics: safe staged runner, UDS echo, skipped signals, no control, sanitized report passed');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
