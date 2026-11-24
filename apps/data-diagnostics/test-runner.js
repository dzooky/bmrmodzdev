'use strict';
// Explicit, sequential read-only MGU checks. No background activity, no writes.
// Results are deliberately sanitised: no VIN, FA/VO, raw UDS data or position.
const appIdentity=require('./identity-survey');
const dpfValues=require('./dpf-values');
const vehicleValues=require('./vehicle-values');
const STEPS=[
  {id:'service',label:'Service',request:{op:'status'},kind:'status'},
  {id:'ipcSecurity',label:'Secure IPC readiness',request:{op:'securityCheck'},kind:'security'},
  {id:'ipcServiceIdentity',label:'Tool process identity',request:{op:'identitySurvey'},kind:'serviceIdentity'},
  {id:'ipcLegacyPermissions',label:'Legacy IPC exposure',request:{op:'identitySurvey'},kind:'legacyPermissions'},
  {id:'ipcDac',label:'Experimental DAC socket',request:{op:'securityCheck'},kind:'dac'},
  {id:'ipcAppIdentity',label:'Diagnostics app identity',request:null,kind:'appIdentity'},
  {id:'ipcPeerAuth',label:'Authenticated IPC capability',request:{op:'identitySurvey'},kind:'peerAuth'},
  {id:'brokerGateway',label:'Broker and secure IPC test',request:{op:'brokerSelfTest'},kind:'brokerTest'},
  {id:'authBoundary',label:'Application authentication feasibility',request:{op:'authFeasibility'},kind:'authFeasibility'},
  {id:'nativePeer',label:'Native peer ABI feasibility',request:{op:'nativePeerFeasibility'},kind:'nativePeer'},
  {id:'nativeKernel',label:'Native kernel SO_PEERCRED experiment',request:{op:'nativePeerProbe'},kind:'nativeKernel'},
  {id:'processBoundary',label:'Native process isolation survey',request:{op:'processBoundaryProbe'},kind:'processBoundary'},
  {id:'someipEnvironment',label:'SOME/IP environment',request:{op:'signalEnvironment'},kind:'environment'},
  {id:'someipConfig',label:'SOME/IP config',request:{op:'configCheck'},kind:'config'},
  {id:'someipSetup',label:'SOME/IP setup',request:{op:'someipSetup'},kind:'setup'},
  {id:'someipGenerated',label:'CDS generator test',request:{op:'someipGenerated'},kind:'generated'},
  {id:'someipAudit',label:'CDS ACL audit',request:{op:'someipAudit'},kind:'audit'},
  {id:'someipLoad',label:'SOME/IP native',request:{op:'signalNative',mode:'load'},kind:'native'},
  // Prime the already-tested TASU physical read path with existing supported
  // ECU reads, before the intermittent DDE/EGS diagnostic checks. This adds
  // no requests and does not change the transport, ECU addresses or DIDs.
  {id:'ihka',label:'IHKA / climate',request:{op:'read',ecu:0x78,did:0xD8D7},kind:'uds'},
  {id:'bdc',label:'BDC / steering',request:{op:'read',ecu:0x40,did:0xD074},kind:'uds'},
  {id:'acsm',label:'ACSM / seatbelts',request:{op:'read',ecu:0x01,did:0x4053},kind:'uds'},
  {id:'dde',label:'DDE / DPF',request:{op:'readTrace',ecu:0x12,did:0x44BB},kind:'uds'},
  {id:'egs',label:'EGS / transmission',request:{op:'readTrace',ecu:0x18,did:0x6000},kind:'uds'},
  {id:'dpfValues',label:'DPF decoded values',request:null,kind:'dpf'},
  {id:'egsIdentity',label:'EGS variant identification',request:{op:'read',ecu:0x18,did:0xF150},kind:'egsIdentity'},
  {id:'cdsTemp',label:'CDS staged / temperatures',request:{op:'signalStaging',mode:'sample',field:'statusEngineTemperature'},kind:'signal'},
  {id:'cdsRpm',label:'CDS staged / engine speed',request:{op:'signalStaging',mode:'sample',field:'statusEngineSpeed2'},kind:'signal'},
  {id:'cdsStream',label:'CDS shared data engine',request:{op:'cdsDemand',consumer:'diagnostics'},kind:'engine'},
  {id:'cdsMulti',label:'CDS multi-consumer lifecycle',request:{op:'cdsDemand',consumer:'diagnostics-secondary'},kind:'multi'}
];
function cleanError(value){return String(value||'Unknown error').replace(/[\r\n]/g,' ').slice(0,140);}
function safeMetadata(value){
 const out={};
 for(const key of ["ancestor","appRoot","source","manifest","executable","peerCgroup","uidSet"]){
  const v=value&&value[key];out[key]=["unknown","root no-shared-write","root shared-write","peer no-shared-write","peer shared-write","other no-shared-write","other shared-write","mixed","symlink","wrong-type","unavailable","deleted","readable","match","different"].includes(v)?v:'unknown';
 }
 return out;
}
function safeOwnerEvidence(value){
 const out={};
 for(const key of ["ownerMatch","ownerAccount","ancestorGuard","peerWrite","entryPoint","mountNamespace","capabilities"]){
  const v=value&&value[key];out[key]=["unknown","match","different","root-account","peer-account","other-account","ambiguous","not-listed","mode-clear","mode-risk","mode-match","same","none","present","unavailable"].includes(v)?v:'unknown';
 }
 return out;
}
function safePackageSurvey(value){
  if(!value||value.observationOnly!==true||value.packageIdentityVerified!==false||
    value.productionAccessEnabled!==false||value.ok!==true||value.stage!=='observed')
    return {available:false};
  return {available:true,layout:value.layout===true,uidMatches:value.uidMatches===true,
    sourceProtected:value.sourceProtected===true,processStable:value.processStable===true,
    metadata:safeMetadata(value.metadata),
    evidence:safeOwnerEvidence(value.evidence),
    protectionReason:["protected","layout-unavailable","ancestor-stat","ancestor-symlink","ancestor-type","ancestor-owner","ancestor-write","app-root-stat","app-root-symlink","app-root-type","app-root-owner","app-root-write","source-stat","source-symlink","source-type","source-owner","source-write","manifest-stat","manifest-symlink","manifest-type","manifest-owner","manifest-write","manifest-size","open-flags","manifest-open","manifest-changed","manifest-read","manifest-invalid","unknown"].includes(value.protectionReason)?value.protectionReason:'unknown',
    candidate:['data-diagnostics','dpf-dev'].includes(value.candidate)&&value.sourceProtected===true?value.candidate:'unknown'};
}
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
  if(step.kind==='legacyPermissions'){
    const sock=reply.diagnosticSocket||{};
    const valid=reply.ok===true&&reply.mode==='passive-observation'&&sock.present===true&&
      typeof sock.mode==='string'&&reply.legacySocketProductionSafe===false&&
      typeof reply.legacySocketWorldAccessible==='boolean';
    return Object.assign(base,{status:!valid?'FAIL':reply.legacySocketWorldAccessible?'SKIP':'PASS',
      detail:!valid?'Socket exposure could not be assessed':reply.legacySocketWorldAccessible?
        'Legacy socket is accessible to other users; production access disabled':
        'Legacy socket not world-accessible; peer authentication still unverified'});
  }
  if(step.kind==='dac'){
    const sock=reply.secureSocket||{};
    const disabled=reply.ok===true&&reply.productionAccessEnabled===false&&reply.peerIdentityVerified===false;
    if(!disabled)return Object.assign(base,{status:'FAIL',detail:'Unexpected production or peer authentication state'});
    if(sock.present===false||sock.dacTargetUid==null)
      return Object.assign(base,{status:'SKIP',detail:'Optional UID-based DAC experiment not enabled; production disabled'});
    const self=appIdentity.inspect();
    const valid=sock.present===true&&sock.ownerOnly===true&&sock.mode==='0600'&&
      sock.dacOwnershipReady===true&&Number.isInteger(sock.dacTargetUid)&&
      Number.isInteger(self.uid)&&sock.ownerUid===sock.dacTargetUid&&self.uid===sock.dacTargetUid;
    return Object.assign(base,{status:valid?'PASS':'FAIL',detail:valid?
      'Socket UID ownership matches app; peer authentication NOT verified':
      'Socket ownership/target does not match app; production disabled'});
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
  if(step.kind==='brokerTest'){
    const b=reply.broker||{},ipc=reply.ipc||{};
    const safe=reply.productionAccessEnabled===false&&
      reply.applicationIdentityVerified===false&&b.productionAccessEnabled===false&&
      ipc.productionAccessEnabled===false&&ipc.productionDataGatewayEnabled===false&&
      ipc.applicationIdentityVerified===false&&ipc.legacySocketProductionSafe===false;
    const good=reply.ok===true&&reply.mode==='explicit-test-only'&&safe&&
      b.ok===true&&b.vehicleReads===0&&b.sharedUds===true&&b.sharedCds===true&&
      b.unauthorizedDenied===true&&b.gatewayFailClosed===true&&
      ipc.ok===true&&ipc.mode==='existing-diagnostic-connection'&&
      ipc.transportConfirmed===true;
    const detail=good?
      'Broker simulation PASS; existing IPC connected; peer API '+
      (ipc.kernelCredentialsAvailable?'available':'unavailable')+
      '; application identity unverified; production OFF':
      'Broker simulation or existing IPC check failed; production OFF';
    return Object.assign(base,{status:good?'PASS':'FAIL',detail});
  }
  if(step.kind==='authFeasibility'){
    const safe=reply.ok===true&&reply.mode==='passive-auth-feasibility'&&
      reply.nativePeerIdentityVerified===false&&reply.appIdentityVerified===false&&
      reply.productionAccessEnabled===false;
    const observed=typeof reply.nativePeerApiAvailable==='boolean'&&
      typeof reply.procStatusAccessible==='boolean'&&
      typeof reply.seccompActive==='boolean'&&
      typeof reply.cgroupReadable==='boolean';
    const detail=safe&&observed?'Read-only survey; native peer API '+
      (reply.nativePeerApiAvailable?'available':'unavailable')+
      ', seccomp '+(reply.seccompActive?'active':'not observed')+
      ', cgroup '+(reply.cgroupReadable?'readable':'unavailable')+
      '; app authentication NO-GO':
      'Identity isolation survey unavailable; production remains OFF';
    return Object.assign(base,{status:safe&&observed?'PASS':'FAIL',detail});
  }
  if(step.kind==='processBoundary'){
    const safe=reply.mode==='passive-process-boundary'&&
      reply.applicationIdentityVerified===false&&
      reply.installedPackageIdentityVerified===false&&
      reply.processInstanceVerified===false&&
      reply.productionAccessEnabled===false&&reply.observationOnly===true;
    const ok=safe&&reply.ok===true&&reply.stage==='kernel-peer-observed'&&
      reply.kernelPeerObserved===true;
    const detail=ok?
      'Kernel peer /proc: cgroup '+(reply.peerCgroupReadable?'readable':'unavailable')+
      ', separate '+(reply.peerCgroupDifferentFromService?'yes':'no')+
      ', same UID '+(reply.sameUidAsService?'yes':'no')+
      ', process stat '+(reply.peerProcStatReadable?'readable':'unavailable')+
      '; installed package NOT verified; production OFF':
      'Native process boundary unavailable: '+String(reply.stage||'unknown').replace(/[^a-z-]/g,'').slice(0,35)+
      '; package identity NOT verified; production OFF';
    return Object.assign(base,{status:ok?'PASS':safe?'SKIP':'FAIL',detail,packageSurvey:ok?safePackageSurvey(reply.packageSurvey):{available:false}});
  }
  if(step.kind==='nativeKernel'){
    const safe=reply&&reply.mode==='mgu-native-peer-probe'&&
      reply.productionAccessEnabled===false&&
      reply.applicationIdentityVerified===false&&
      reply.packageIdentityVerified===false;
    const success=safe&&reply.ok===true&&reply.stage==='kernel-peer-observed'&&
      reply.unixSocket===true&&reply.kernelPeerObserved===true;
    const reason=String(reply.stage||'unavailable').replace(/[^a-z-]/g,'').slice(0,32);
    return Object.assign(base,{status:success?'PASS':safe?'SKIP':'FAIL',
      detail:success?'Kernel SO_PEERCRED observed on MGU; package identity NOT verified; production OFF':
      safe?'Native test unavailable: '+reason+'; package identity NOT verified; production OFF':
      'Native test response invalid; production remains OFF'});
  }
  if(step.kind==='nativePeer'){
    const safe=reply.ok===true&&reply.mode==='passive-native-peer-feasibility'&&
      reply.mgubinaryInstalled===false&&reply.nativePeerAdapterLoaded===false&&
      reply.kernelPeerProvenOnMgu===false&&reply.packageIdentityVerified===false&&
      reply.productionAccessEnabled===false;
    const observed=typeof reply.linuxPlatform==='boolean'&&
      typeof reply.elfReadable==='boolean'&&
      (reply.processArch==='arm'||reply.processArch==='arm64'||
       reply.processArch==='x64'||reply.processArch==='ia32'||reply.processArch==='other');
    const detail=safe&&observed?'Native MGU ABI: '+
      reply.processArch+', ELF '+(reply.elfReadable?
      String(reply.elfClassBits||'?')+'b '+String(reply.elfMachine||'unknown'):'not readable')+
      ', Node '+String(reply.nodeMajor||'?')+
      ', N-API '+String(reply.nodeNapiVersion||'none')+
      '; Linux host proof only; app authentication NO-GO':
      'Native ABI survey unavailable; production remains OFF';
    return Object.assign(base,{status:safe&&observed?'PASS':'FAIL',detail});
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
  if(step.kind==='egsIdentity')return Object.assign(base,{status:reply.ok?'PASS':'SKIP',
    detail:reply.ok?'Verified OSA EGS profile '+reply.index:cleanError(reply.error)});
  if(step.kind==='dpf')return Object.assign(base,{status:reply.ok?'PASS':'FAIL',
    detail:reply.ok?dpfValues.summary(reply):cleanError(reply.error)});
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
// Diagnostic-only bounded retry. Never retry negative UDS, malformed data or
// transport errors; keep the tool's ECU allowlist and serialization unchanged.
const DRIVE_READ_ATTEMPTS=3, DRIVE_READ_GAP_MS=600;
function tasuStatusSummary(traces){
  const counts=Object.create(null);
  let absent=0,overflow=0;
  for(const trace of traces){
    if(!trace||typeof trace!=='object')continue;
    const codes=trace.shortStatusCodes;
    if(codes&&typeof codes==='object'&&!Array.isArray(codes)){
      for(const [key,value] of Object.entries(codes)){
        const code=Number(key);
        if(!/^\d{1,3}$/.test(key)||!Number.isInteger(code)||code<0||code>255||
          !Number.isSafeInteger(value)||value<1||value>99)continue;
        counts[code]=(counts[code]||0)+value;
      }
    }
    if(Number.isSafeInteger(trace.shortStatusAbsent)&&trace.shortStatusAbsent>=0)absent+=trace.shortStatusAbsent;
    if(Number.isSafeInteger(trace.shortStatusOverflow)&&trace.shortStatusOverflow>=0)overflow+=trace.shortStatusOverflow;
  }
  const codes=Object.entries(counts).sort((a,b)=>Number(a[0])-Number(b[0])).slice(0,8)
    .map(([code,count])=>'0x'+Number(code).toString(16).toUpperCase().padStart(2,'0')+' x'+count);
  return 'TASU status '+(codes.length?codes.join(','):'none')+
    (absent?', absent '+absent:'')+(overflow?', overflow '+overflow:'');
}
const SOMEIP_TIMED_STEPS={
  someipEnvironment:'environmentMs',someipConfig:'configMs',someipSetup:'setupMs',
  someipGenerated:'generationMs',someipAudit:'auditMs',someipLoad:'nativeLoadMs',
  cdsTemp:'cdsTempMs',cdsRpm:'cdsRpmMs',cdsStream:'cdsStreamMs',cdsMulti:'cdsMultiMs'
};
function someipTimings(results){
  const times={};
  for(const row of results){
    const key=SOMEIP_TIMED_STEPS[row.id];
    if(key&&row.status!=='SKIP'&&Number.isSafeInteger(row.durationMs)&&row.durationMs>=0)
      times[key]=row.durationMs;
  }
  return times;
}
function traceSummary(traces){
  const valid=traces.filter(t=>t&&typeof t.ackAccepted==='boolean');
  if(!valid.length)return 'trace unavailable';
  const count=key=>valid.reduce((n,t)=>n+(Number.isSafeInteger(t[key])&&t[key]>=0?Math.min(t[key],99):0),0);
  return 'ack '+valid.filter(t=>t.ackAccepted).length+'/'+traces.length+
    ', ecu '+count('matchedEcuEvents')+', other '+count('otherEcuEvents')+
    ', DID mismatch '+count('wrongDidEvents')+', NRC '+count('negativeEvents')+
    ', pending '+count('pendingEvents')+', malformed '+count('malformedEvents')+
    ' [short '+count('frameShortFrame')+', header '+count('frameShortHeader')+
    ', length '+count('frameLengthOverflow')+', hex '+count('frameNonHex')+
    ', odd '+count('frameOddLength')+', missing '+count('frameMissing')+']'+
    ', shortTASU reject '+count('shortRejectMarkers')+', unknown '+count('shortUnknownMarkers')+
    ', consistent '+count('shortLengthConsistent')+', truncated '+count('shortLengthTruncated')+
    ', len0-4 '+count('shortLength0to4')+', len5-8 '+count('shortLength5to8')+
    ', timeout '+valid.filter(t=>t.timedOut===true).length;
}
async function drivetrainRead(request,step){
  let reply,attempts=0;
  const traces=[];
  for(let i=1;i<=DRIVE_READ_ATTEMPTS;i++){
    attempts=i;
    reply=await request(step.request,{timeoutMs:15000});
    traces.push(reply&&reply.trace||null);
    if(!reply||reply.ok!==false||reply.error!=='No matching response'||i===DRIVE_READ_ATTEMPTS)break;
    await delay(DRIVE_READ_GAP_MS);
  }
  return {reply,attempts,traces};
}
async function testEngine(request){
  testEngine.lastValues=null;
  const consumer='diagnostics';
  let initial=null,second=null,third=null;
  try{
    const demand=await request({op:'cdsDemand',consumer},{timeoutMs:6000});
    if(!demand||!demand.ok||!demand.running)return {ok:false,error:'Shared CDS engine did not start'};
    await delay(1000);
    second=await request({op:'cdsSnapshot'},{timeoutMs:6000});
    await delay(900);
    third=await request({op:'cdsSnapshot'},{timeoutMs:6000});
    testEngine.lastValues=vehicleValues.engineCds(third);
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
  async function run(onProgress,phase){
    if(active)throw new Error('Diagnostics already running');
    active=true;
    const results=[],startedAt=new Date().toISOString();
    if(phase!==undefined&&phase!=='before'&&phase!=='after')throw new Error('Invalid snapshot phase');
    let dpfSnapshot=null,vehicleSnapshot={};
    let egsReply=null;
    let serviceAvailable=false,stagingReady=false,nativeReady=false;
    let previousUds=false;
    try{
      for(let i=0;i<STEPS.length;i++){
        const step=STEPS[i];
        const skip=step.id!=='service'&&!serviceAvailable?'Service unavailable'
          :step.kind==='dpf'&&(!results.some(r=>r.id==='dde'&&r.status==='PASS'))?'DDE response unavailable'
          :step.kind==='egsIdentity'&&(!results.some(r=>r.id==='egs'&&r.status==='PASS'))?'EGS response unavailable'
          :(step.kind==='signal'||step.kind==='engine'||step.kind==='multi')&&!stagingReady?'Staged CDS config unavailable'
          :(step.kind==='signal'||step.kind==='engine')&&!nativeReady?'Native SOME/IP unavailable'
          :null;
        if(skip){results.push(skipped(step,skip));if(onProgress)onProgress(i+1,STEPS.length,results[results.length-1]);continue;}
        // Explicit manual diagnostics only: space ECU checks to test whether
        // TASU/ECU settling is related to intermittent DDE and EGS timeouts.
        if((step.kind==='uds'||step.kind==='dpf'||step.kind==='egsIdentity')&&previousUds)await delay(1000);
        previousUds=step.kind==='uds'||step.kind==='dpf'||step.kind==='egsIdentity';
        const start=now();
        let result;
        try{
          const drivetrain=step.id==='dde'||step.id==='egs';
          if(step.kind==='dpf')dpfSnapshot=await dpfValues.snapshot(request);
          if(step.kind==='egsIdentity'){
            const identity=vehicleValues.identification(await request(step.request,{timeoutMs:15000}));
            const temp=vehicleValues.transmission(egsReply,identity);
            if(temp!==null)vehicleSnapshot.transmissionOil=temp;
            vehicleSnapshot.egsVariant=identity===vehicleValues.EGS_INDEX?'supported':'unsupported';
          }
          const readResult=drivetrain?await drivetrainRead(request,step):null;
          const reply=drivetrain?readResult.reply:step.kind==='dpf'?dpfSnapshot:
            step.kind==='egsIdentity'?{ok:vehicleSnapshot.egsVariant==='supported',
              index:vehicleSnapshot.egsVariant==='supported'?vehicleValues.EGS_INDEX:null,error:'EGS variant not verified'}:
            step.kind==='appIdentity'?appIdentity.inspect():step.kind==='engine'?await testEngine(request):step.kind==='multi'?await testMulti(request):await request(step.request,{timeoutMs:15000});
          if(step.id==='egs')egsReply=reply;
          if(step.id==='ihka'){
            const decoded=vehicleValues.footwell(reply);
            if(decoded)vehicleSnapshot.footwell=decoded;
          }
          if(step.kind==='engine'){
            reply.stopped=testEngine.lastRelease===true;
            if(testEngine.lastValues)vehicleSnapshot.engine=testEngine.lastValues;
          }
          if(step.kind==='multi')reply.stopped=testMulti.lastStopped===true;
          result=resultFor(step,reply,Math.max(0,now()-start));
          if(drivetrain){
            const traces=readResult.traces.filter(t=>t&&typeof t.ackAccepted==='boolean');
            const cnt=k=>traces.reduce((n,t)=>n+(Number.isSafeInteger(t[k])&&t[k]>=0?Math.min(t[k],99):0),0);
            const short='shortTASU reject '+cnt('shortRejectMarkers')+', unknown '+cnt('shortUnknownMarkers')+
              ', consistent '+cnt('shortLengthConsistent')+', truncated '+cnt('shortLengthTruncated')+
              ', len0-4 '+cnt('shortLength0to4')+', len5-8 '+cnt('shortLength5to8');
            result.detail=(result.detail+'; attempt '+readResult.attempts+'/'+DRIVE_READ_ATTEMPTS+'; '+
              tasuStatusSummary(readResult.traces)+'; '+short+'; '+traceSummary(readResult.traces)).slice(0,240);
          }
        }catch(e){result=failure(step,e,Math.max(0,now()-start));}
        results.push(result);
        if(step.id==='service')serviceAvailable=result.status==='PASS';
        if(step.id==='someipAudit')stagingReady=result.status==='PASS';
        if(step.id==='someipLoad')nativeReady=result.status==='PASS';
        if(onProgress)onProgress(i+1,STEPS.length,result);
      }
      const packageSurvey=(results.find(x=>x.id==='processBoundary')||{}).packageSurvey||{available:false};
      const packageNote=packageSurvey.available?'Package survey: layout '+packageSurvey.layout+', UID match '+packageSurvey.uidMatches+
        ', protected source '+packageSurvey.sourceProtected+', stable '+packageSurvey.processStable+
        ', candidate '+packageSurvey.candidate+', reason '+packageSurvey.protectionReason:'Package survey: unavailable';
      const totals={pass:results.filter(x=>x.status==='PASS').length,fail:results.filter(x=>x.status==='FAIL').length,
        skip:results.filter(x=>x.status==='SKIP').length};
      return {schema:1,application:'bmrmodz-data-diagnostics',runMode:'explicit-read-only',
        startedAt,finishedAt:new Date().toISOString(),totals,results,
        snapshotPhase:phase||null,dpfSnapshot:dpfSnapshot&&dpfSnapshot.ok?dpfSnapshot:null,
        vehicleSnapshot,
        someipTimings:someipTimings(results),
        controlsTested:false,signalPermissionsVerified:false,
        deviceVerified:false,
        notes:[phase==='before'?'Snapshot phase: before sleep':phase==='after'?'Snapshot phase: after wake':'Snapshot phase: unlabelled',
          'Positive ECU responses are not proof of correct decoded values.',
          'The report contains no raw UDS replies, VIN, vehicle order, position, or credentials.',
          'Authentication: '+String((results.find(x=>x.id==='authBoundary')||{}).detail||'not run').slice(0,125)+'.',
          'Native peer: '+String((results.find(x=>x.id==='nativePeer')||{}).detail||'not run').slice(0,125)+'.',
          'Kernel peer: '+String((results.find(x=>x.id==='nativeKernel')||{}).detail||'not run').slice(0,125)+'.',
          'Process boundary: '+String((results.find(x=>x.id==='processBoundary')||{}).detail||'not run').slice(0,125)+'.',
          packageNote,
          'Metadata: '+Object.entries(packageSurvey.metadata||{}).map(([k,v])=>k+'='+v).join('; '),
          'Owner evidence: '+Object.entries(packageSurvey.evidence||{}).map(([k,v])=>k+'='+v).join('; '),
          'Broker IPC: '+(results.find(x=>x.id==='brokerGateway')||{status:'SKIP'}).status+
            ' ('+String((results.find(x=>x.id==='brokerGateway')||{}).detail||'not run').slice(0,105)+').',
          'No UDS 0x31 or 0x2E was issued by this test application.',
          'Staged CDS sampling does not register ACLs or prove installed system permissions.',
          'Only the tester can confirm installation and results in a real car.']};
    }finally{active=false;}
  }
  return {run,isRunning:()=>active,steps:STEPS};
}
module.exports={createRunner,STEPS,resultFor,drivetrainRead,traceSummary,tasuStatusSummary,someipTimings};
