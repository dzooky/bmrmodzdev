'use strict';
// Explicit, sequential read-only MGU checks. No background activity, no writes.
// Results are deliberately sanitised: no VIN, FA/VO, raw UDS data or position.
const appIdentity=require('./identity-survey');
const STEPS=[
  {id:'service',label:'Service',request:{op:'status'},kind:'status'},
  {id:'ipcSecurity',label:'Secure IPC readiness',request:{op:'securityCheck'},kind:'security'},
  {id:'ipcServiceIdentity',label:'Tool process identity',request:{op:'identitySurvey'},kind:'serviceIdentity'},
  {id:'ipcAppIdentity',label:'Diagnostics app identity',request:null,kind:'appIdentity'},
  {id:'ipcPeerAuth',label:'Authenticated IPC capability',request:{op:'identitySurvey'},kind:'peerAuth'},
  {id:'someipEnvironment',label:'SOME/IP environment',request:{op:'signalEnvironment'},kind:'environment'},
  {id:'someipConfig',label:'SOME/IP config',request:{op:'configCheck'},kind:'config'},
  {id:'someipSetup',label:'SOME/IP setup',request:{op:'someipSetup'},kind:'setup'},
  {id:'someipGenerated',label:'CDS generator test',request:{op:'someipGenerated'},kind:'generated'},
  {id:'someipAudit',label:'CDS ACL audit',request:{op:'someipAudit'},kind:'audit'},
  {id:'someipLoad',label:'SOME/IP native',request:{op:'signalNative',mode:'load'},kind:'native'},
  {id:'dde',label:'DDE / DPF',request:{op:'read',ecu:0x12,did:0x44BB},kind:'uds'},
  {id:'egs',label:'EGS / transmission',request:{op:'read',ecu:0x18,did:0x6000},kind:'uds'},
  {id:'ihka',label:'IHKA / climate',request:{op:'read',ecu:0x78,did:0xD8D7},kind:'uds'},
  {id:'bdc',label:'BDC / steering',request:{op:'read',ecu:0x40,did:0xD074},kind:'uds'},
  {id:'acsm',label:'ACSM / seatbelts',request:{op:'read',ecu:0x01,did:0x4053},kind:'uds'},
  {id:'cdsTemp',label:'CDS staged / temperatures',request:{op:'signalStaging',mode:'sample',field:'statusEngineTemperature'},kind:'signal'},
  {id:'cdsRpm',label:'CDS staged / engine speed',request:{op:'signalStaging',mode:'sample',field:'statusEngineSpeed2'},kind:'signal'},
  {id:'cdsStream',label:'CDS shared data engine',request:{op:'cdsDemand',consumer:'diagnostics'},kind:'engine'},
  {id:'cdsMulti',label:'CDS multi-consumer lifecycle',request:{op:'cdsDemand',consumer:'diagnostics-secondary'},kind:'multi'}
];
function cleanError(value){return String(value||'Unknown error').replace(/[\r\n]/g,' ').slice(0,140);}
function resultFor(step,reply,duration){
  const base={id:step.id,label:step.label,status:'FAIL',durationMs:duration};
  if(!reply||typeof reply!=='object')return Object.assign(base,{detail:'Missing response'});
  if(step.kind==='status')return Object.assign(base,{status:reply.ok===true?'PASS':'FAIL',detail:reply.ok?'Service available':cleanError(reply.error)});
  if(step.kind==='serviceIdentity'){
    const user=reply.identity||{},socket=reply.diagnosticSocket||{};
    const ok=reply.ok===true&&reply.mode==='passive-observation'&&
      Number.isInteger(user.uid)&&Number.isInteger(user.gid)&&socket.present===true&&
      Number.isInteger(socket.uid)&&Number.isInteger(socket.gid);
    return Object.assign(base,{status:ok?'PASS':'FAIL',detail:ok?
      'Tool UID '+user.uid+', GID '+user.gid+'; socket UID '+socket.uid+', GID '+socket.gid+', mode '+socket.mode:
      cleanError(reply.error||'Tool process identity unavailable')});
  }
  if(step.kind==='appIdentity'){
    const ok=reply.ok===true&&reply.mode==='self-observation'&&
      Number.isInteger(reply.uid)&&Number.isInteger(reply.gid);
    return Object.assign(base,{status:ok?'PASS':'SKIP',
      detail:ok?'App UID '+reply.uid+', GID '+reply.gid+'; peer authentication NOT verified':
        'App process UID/GID unavailable'});
  }
  if(step.kind==='peerAuth'){
    const unverified=reply.ok===true&&reply.peerIdentityVerified===false&&
      reply.productionAccessEnabled===false;
    return Object.assign(base,{status:unverified?'SKIP':'FAIL',
      detail:unverified?'Peer credentials unverified; production access disabled; Node native API '+
        (reply.nativePeerCredentialMethod===true?'present':'unavailable'):
        cleanError(reply.error||'Unexpected peer authentication state')});
  }
  if(step.kind==='security'){
    const sock=reply.secureSocket||{};
    const restricted=reply.ok===true&&sock.present===true&&sock.mode==='0600'&&sock.ownerOnly===true;
    const pending=reply.ok===true&&reply.peerIdentityVerified===false&&reply.productionAccessEnabled===false;
    const safelyDisabled=pending&&sock.present===false;
    return Object.assign(base,{status:(restricted&&pending)||safelyDisabled?'SKIP':'FAIL',
      detail:safelyDisabled?'Secure IPC disabled for startup compatibility; production access disabled':
        restricted&&pending?'Owner-only test socket; app identity unverified, production disabled':
        cleanError(reply.error||'Secure socket permission check failed')});
  }
  if(step.kind==='environment'){
    const catalog=reply.catalog&&reply.catalog.present;
    const module=reply.nativeModule&&reply.nativeModule.resolved;
    const ok=!!catalog&&!!module;
    return Object.assign(base,{status:ok?'PASS':'FAIL',detail:'Catalog '+(catalog?'yes':'no')+', native module '+(module?'resolved':'not resolved')});
  }
  if(step.kind==='config'){
    const missing=reply.ok===false&&/ENOENT|no such file/i.test(String(reply.error||''));
    return Object.assign(base,{status:reply.ok?'PASS':missing?'SKIP':'FAIL',
      detail:reply.ok?'Active CDS config present':missing?
        'Active config absent; staged CDS mode used':cleanError(reply.error||'Active config invalid')});
  }
  if(step.kind==='setup'){
    const c=reply.checks||{};
    const uid=reply.identity&&reply.identity.uid;
    const valid=reply.ok===true&&reply.mode==='passive-only';
    const detail='Catalog '+(c.catalogPresent?'yes':'no')+', generator '+(c.firmwareAppManagementPresent?'yes':'no')+', manifest '+(c.toolManifestPresent?'yes':'no')+', CDS '+(c.generatedCdsPresent?'yes':'no')+', UID '+(Number.isInteger(uid)?uid:'?')+', ACL unverified';
    return Object.assign(base,{status:valid?'PASS':'FAIL',detail:valid?detail:cleanError(reply.error)});
  }
  if(step.kind==='generated'){
    const good=reply.ok===true&&reply.mode==='staging-only'&&reply.configGenerated===true&&reply.aclFileGenerated===true&&reply.aclRegistered===false;
    return Object.assign(base,{status:good?'PASS':'FAIL',detail:good?'Staged CDS and ACL generated; NOT registered':cleanError(reply.error||reply.note||'No staged generator output')});
  }
  if(step.kind==='audit'){
    const verified=reply.ok===true&&reply.mode==='passive-only'&&reply.aclRegistered===false;
    const c=reply.aclCounts||{},id=reply.identity||{};
    const detail=verified?'Staged fields yes, ACL requests '+(Number.isInteger(c.requests)?c.requests:'?')+
      ', offers '+(Number.isInteger(c.offers)?c.offers:'?')+', UID '+(Number.isInteger(id.uid)?id.uid:'?')+
      '; ACL NOT registered':cleanError(reply.error||reply.note||'CDS ACL audit unavailable');
    return Object.assign(base,{status:verified?'PASS':'FAIL',detail});
  }
  if(step.kind==='multi'){
    const valid=reply.ok===true&&reply.shared===true&&reply.filtered===true&&reply.survived===true&&reply.expired===true&&reply.restarted===true&&reply.stopped===true;
    return Object.assign(base,{status:valid?'PASS':'FAIL',detail:valid?'Two leases shared one stream; isolation, expiry and restart verified':cleanError(reply.error||'Multi-consumer lifecycle incomplete')});
  }
  if(step.kind==='engine'){
    const ok=reply.ok===true&&reply.stopped===true&&reply.updated===true&&reply.fresh===true;
    return Object.assign(base,{status:ok?'PASS':'FAIL',
      detail:ok?'Shared CDS refreshed, cache fresh, lease stopped':
        cleanError(reply.error||'CDS shared stream did not refresh or stop')});
  }
  if(step.kind==='native')return Object.assign(base,{status:reply.ok?'PASS':'FAIL',detail:reply.ok?'Native module loaded in isolated worker':cleanError(reply.error||reply.stage)});
  if(step.kind==='uds'){
    const valid=reply.ok===true&&Array.isArray(reply.uds)&&reply.uds.length>=3&&reply.uds[0]===0x62&&reply.uds[1]===(step.request.did>>8)&&reply.uds[2]===(step.request.did&255);
    // Do not persist raw ECU bytes or identifying values.
    return Object.assign(base,{status:valid?'PASS':'FAIL',detail:valid?'Matching UDS response received':cleanError(reply.error||'Invalid or missing UDS response')});
  }
  if(step.kind==='signal'){
    const flags=reply.validFields||{};
    const names=step.id==='cdsTemp'?['oil','coolant']:['rpm'];
    const valid=reply.ok===true&&reply.stage==='sample'&&reply.received===true&&
      reply.validated===true&&names.every(name=>flags[name]===true);
    const detail=valid?'Native CDS numeric fields validated':
      reply.received===true&&reply.stage==='value-invalid'?
        'CDS numeric validation failed: '+names.filter(name=>flags[name]!==true).join(', '):
        cleanError(reply.error||reply.stage);
    // Report contains only field validity, never the received values.
    return Object.assign(base,{status:valid?'PASS':'FAIL',detail});
  }
  return base;
}
function failure(step,err,duration){return {id:step.id,label:step.label,status:'FAIL',durationMs:duration,detail:cleanError(err&&err.message||err)};}
function skipped(step,reason){return {id:step.id,label:step.label,status:'SKIP',durationMs:0,detail:reason};}
function delay(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
async function testEngine(request){
  const consumer='diagnostics';
  let initial=null,second=null,third=null;
  try{
    const demand=await request({op:'cdsDemand',consumer},{timeoutMs:6000});
    if(!demand||!demand.ok||!demand.running)return {ok:false,error:'Shared CDS engine did not start'};
    await delay(1000);
    second=await request({op:'cdsSnapshot'},{timeoutMs:6000});
    await delay(900);
    third=await request({op:'cdsSnapshot'},{timeoutMs:6000});
    const fields=third&&third.fields||{};
    const fresh=['oil','coolant','rpm'].every(k=>fields[k]&&fields[k].valid===true);
    const updated=!!(second&&third&&second.stats&&third.stats&&
      third.stats.samples>second.stats.samples);
    return {ok:true,fresh,updated};
  }catch(e){return {ok:false,error:String(e&&e.message||e).slice(0,140)};}
  finally{
    try{const release=await request({op:'cdsRelease',consumer},{timeoutMs:6000});
      // read in caller via wrapper response to avoid leaked values
      testEngine.lastRelease=!!(release&&release.ok&&release.running===false&&release.consumers===0);
    }catch(_){testEngine.lastRelease=false;}
  }
}
async function testMulti(request){
  const first='diagnostics',second='diagnostics-secondary';
  let result={ok:false,error:'Multi-consumer lifecycle incomplete'};
  try{
    const before=await request({op:'cdsSnapshot',consumer:first},{timeoutMs:6000});
    const baseline=before&&before.stats&&before.stats.starts;
    const a=await request({op:'cdsDemand',consumer:first},{timeoutMs:6000});
    const b=await request({op:'cdsDemand',consumer:second},{timeoutMs:6000});
    if(!a.ok||!b.ok)return {ok:false,error:'Consumer demand rejected'};
    const shared=a.running===true&&b.running===true&&a.consumers===1&&b.consumers===2&&
      Number.isInteger(baseline)&&b.stats.starts===baseline+1;
    await delay(950);
    const snap=await request({op:'cdsSnapshot',consumer:second},{timeoutMs:6000});
    const keys=snap&&snap.fields||{};
    const filtered=snap.ok===true&&keys.rpm&&keys.rpm.valid===true&&
      keys.coolant&&keys.coolant.valid===true&&!Object.prototype.hasOwnProperty.call(keys,'oil')&&
      !Object.prototype.hasOwnProperty.call(snap.values||{},'oil');
    const releaseA=await request({op:'cdsRelease',consumer:first},{timeoutMs:6000});
    const survived=releaseA.ok===true&&releaseA.running===true&&releaseA.consumers===1;
    // No renewal for the second test consumer: its lease must expire.
    await delay(3500);
    const expiredState=await request({op:'cdsSnapshot',consumer:second},{timeoutMs:6000});
    const expired=expiredState.ok===true&&expiredState.running===false&&expiredState.consumers===0;
    const restart=await request({op:'cdsDemand',consumer:second},{timeoutMs:6000});
    const restarted=restart.ok===true&&restart.running===true&&
      restart.stats.starts===b.stats.starts+1;
    result={ok:true,shared,filtered,survived,expired,restarted};
    return result;
  }catch(e){return {ok:false,error:String(e&&e.message||e).slice(0,140)};}
  finally{
    try{
      const a=await request({op:'cdsRelease',consumer:first},{timeoutMs:6000});
      const b=await request({op:'cdsRelease',consumer:second},{timeoutMs:6000});
      result.stopped=!!(a&&b&&b.ok===true&&b.running===false&&b.consumers===0);
      testMulti.lastStopped=result.stopped;
    }catch(_){testMulti.lastStopped=false;}
  }
}
function createRunner(send,clock){
  const request=send,now=clock||Date.now;
  let active=false;
  async function run(onProgress){
    if(active)throw new Error('Diagnostics already running');
    active=true;
    const results=[],startedAt=new Date().toISOString();
    let serviceAvailable=false,stagingReady=false,nativeReady=false;
    try{
      for(let i=0;i<STEPS.length;i++){
        const step=STEPS[i];
        const skip=step.id!=='service'&&!serviceAvailable?'Service unavailable'
          :(step.kind==='signal'||step.kind==='engine'||step.kind==='multi')&&!stagingReady?'Staged CDS config unavailable'
          :(step.kind==='signal'||step.kind==='engine')&&!nativeReady?'Native SOME/IP unavailable'
          :null;
        if(skip){results.push(skipped(step,skip));if(onProgress)onProgress(i+1,STEPS.length,results[results.length-1]);continue;}
        const start=now();
        let result;
        try{
          const reply=step.kind==='appIdentity'?appIdentity.inspect():step.kind==='engine'?await testEngine(request):step.kind==='multi'?await testMulti(request):await request(step.request,{timeoutMs:15000});
          if(step.kind==='engine')reply.stopped=testEngine.lastRelease===true;
          if(step.kind==='multi')reply.stopped=testMulti.lastStopped===true;
          result=resultFor(step,reply,Math.max(0,now()-start));
        }catch(e){result=failure(step,e,Math.max(0,now()-start));}
        results.push(result);
        if(step.id==='service')serviceAvailable=result.status==='PASS';
        if(step.id==='someipAudit')stagingReady=result.status==='PASS';
        if(step.id==='someipLoad')nativeReady=result.status==='PASS';
        if(onProgress)onProgress(i+1,STEPS.length,result);
      }
      const totals={pass:results.filter(x=>x.status==='PASS').length,fail:results.filter(x=>x.status==='FAIL').length,
        skip:results.filter(x=>x.status==='SKIP').length};
      return {schema:1,application:'bmrmodz-data-diagnostics',runMode:'explicit-read-only',
        startedAt,finishedAt:new Date().toISOString(),totals,results,
        controlsTested:false,signalPermissionsVerified:false,
        deviceVerified:false,
        notes:['Positive ECU responses are not proof of correct decoded values.',
          'The report contains no raw UDS replies, VIN, vehicle order, position, or credentials.',
          'No UDS 0x31 or 0x2E was issued by this test application.',
          'Staged CDS sampling does not register ACLs or prove installed system permissions.',
          'Only the tester can confirm installation and results in a real car.']};
    }finally{active=false;}
  }
  return {run,isRunning:()=>active,steps:STEPS};
}
module.exports={createRunner,STEPS,resultFor};
