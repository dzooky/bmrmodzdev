'use strict';
// Experimental read-only Data Tool. No vehicle requests at boot or from status.
// Every read requires a specifically allowed ECU/DID. Responses are not
// presented as verified until vehicle testing confirms them.
const fs=require('fs'), net=require('net'), path=require('path');
const {READS,getRead}=require('./profiles');
const signalEnvironment=require('./signal-environment');
const diagnosticReport=require('./diagnostic-report');
const configCheck=require('./config-check');
const {createGenerator}=require('./someip-generate');
const someipSetup=require('./someip-setup');
const someipAudit=require('./someip-audit');
const ccFeasibility=require('./cc-feasibility');
const {createRunner}=require('./signal-isolate');
const {createEngine}=require('./cds-engine');
const {createEndpoint}=require('./secure-ipc');
const identitySurvey=require('./identity-survey');
const SOCKET=process.env.BMRMODZ_DATA_SOCKET||'/run/bmrmodz-data-tool/ctl.sock';
const GAP_MS=200, CACHE_MS=500;
function serve(factory,socketPath,options){
  const socket=socketPath||SOCKET;
  let transport=null,queue=Promise.resolve(),lastRequest=0;
  const signalRunner=options&&options.signalRunner||createRunner();
  const generator=options&&options.generator||createGenerator();
  const cdsEngine=options&&options.cdsEngine||createEngine();
  // Experimental secure listener must never be a prerequisite for legacy tool health.
  // It is disabled by default until MGU socket lifecycle/peer identity are verified.
  let secureEndpoint={inspect:()=>({present:false,mode:null,ownerOnly:false}),close:()=>{}};
  if(options&&options.secureEndpoint)secureEndpoint=options.secureEndpoint;
  else if(process.env.BMRMODZ_SECURE_IPC_EXPERIMENT==='1'){
    try{
      const raw=process.env.BMRMODZ_SECURE_IPC_TARGET_UID;
      const uid=raw===undefined?undefined:/^[1-9][0-9]*$/.test(raw)?Number(raw):NaN;
      secureEndpoint=createEndpoint(options&&options.secureSocket||process.env.BMRMODZ_SECURE_IPC_SOCKET,
        {targetUid:uid});
    }
    catch(_){/* Fail closed: no secure data endpoint, retain legacy diagnostics. */}
  }
  const inflight=new Map(),cache=new Map();
  const stats={sent:0,ok:0,timeout:0,error:0,coalesced:0,cacheHits:0};
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  function read(ecu,did){
    const group=getRead(ecu,did);
    if(!group)return Promise.resolve({ok:false,error:'ECU/DID not allowlisted'});
    const key=ecu+':'+did;
    const cached=cache.get(key);
    if(cached&&Date.now()-cached.at<CACHE_MS){stats.cacheHits++;return Promise.resolve(Object.assign({cached:true},cached.reply));}
    if(inflight.has(key)){stats.coalesced++;return inflight.get(key);}
    const request=queue.then(async()=>{
      const remaining=lastRequest+GAP_MS-Date.now();
      if(remaining>0)await sleep(remaining);
      lastRequest=Date.now();
      stats.sent++;
      try {
        if(!transport)transport=factory();
        const reply=await transport.read(ecu,did);
        if(!reply){stats.timeout++;return {ok:false,error:'No matching response',ecu,did};}
        if(reply[0]===0x7f){stats.error++;return {ok:false,error:'UDS negative response',ecu,did,nrc:reply[2]};}
        if(reply[0]!==0x62||reply[1]!==did>>8||reply[2]!==(did&255)){stats.error++;return {ok:false,error:'Unexpected response',ecu,did};}
        stats.ok++;
        const result={ok:true,ecu,did,group,uds:reply,at:new Date().toISOString()};
        cache.set(key,{at:Date.now(),reply:result});
        return result;
      }catch(e){stats.error++;return {ok:false,ecu,did,error:String(e&&e.message||e)};}
    });
    queue=request.then(()=>{},()=>{});
    inflight.set(key,request);
    request.then(()=>inflight.delete(key),()=>inflight.delete(key));
    return request;
  }
  const capabilities=()=>({
    uds:{mode:'read-only-experimental',reads:READS,controls:'not implemented'},
    signals:{mode:'demand-driven-experimental',stagingOnly:true,aclRegistration:'unverified',fields:['oil','coolant','rpm']},
    background:{mode:'on-demand-only',reason:'No unattended ECU polling in feasibility build'}
  });
  try{fs.mkdirSync(path.dirname(socket),{recursive:true});}catch(e){if(e.code!=='EEXIST')throw e;}
  try{fs.unlinkSync(socket);}catch(e){if(e.code!=='ENOENT')throw e;}
  const server=net.createServer(client=>{
    client.setEncoding('utf8');let buffer='',lines=0;
    client.on('data',async chunk=>{
      buffer+=chunk;
      if(buffer.length>8192){client.destroy();return;}
      let n;while((n=buffer.indexOf('\n'))>=0){
        if(++lines>100){client.destroy();return;}
        const raw=buffer.slice(0,n);buffer=buffer.slice(n+1);let req,reply;
        try{
          req=JSON.parse(raw);
          if(!req||typeof req!=='object')throw new Error('Invalid request');
          if(req.op==='status')reply={ok:true,tool:'bmrmodz-data-tool',version:'0.1.19',transportReady:!!(transport&&transport.ready),stats,capabilities:capabilities()};
          else if(req.op==='capabilities')reply={ok:true,capabilities:capabilities()};
          else if(req.op==='identitySurvey')reply=identitySurvey.inspectService(socket);
          else if(req.op==='securityCheck')reply={ok:true,secureSocket:secureEndpoint.inspect(),
            peerIdentityVerified:false,productionAccessEnabled:false,
            legacyDiagnosticSocket:true};
          else if(req.op==='signalEnvironment')reply=signalEnvironment.inspect();
          else if(req.op==='configCheck')reply=configCheck.inspect();
          else if(req.op==='someipSetup')reply=someipSetup.inspect();
          else if(req.op==='someipAudit')reply=someipAudit.inspect();
          else if(req.op==='cdsDemand')reply=cdsEngine.demand(req.consumer);
          else if(req.op==='cdsSnapshot')reply=cdsEngine.snapshot(req.consumer);
          else if(req.op==='cdsRelease')reply=cdsEngine.release(req.consumer);
          else if(req.op==='someipGenerate')reply=await generator.run();
          else if(req.op==='someipGenerated')reply=generator.inspect();
          else if(req.op==='ccPlan')reply=ccFeasibility.plan();
          else if(req.op==='report')reply=diagnosticReport.create({version:'0.1.19',transportReady:!!(transport&&transport.ready),stats,capabilities:capabilities()});
          else if(req.op==='signalStaging' && req.mode==='sample')reply=await signalRunner.run('staging',req.field);
          else if(req.op==='signalNative' && req.mode==='load')reply=await signalRunner.run('load');
          else if(req.op==='signalNative' && req.mode==='sample')reply=await signalRunner.run('sample',req.field);
          else if(req.op==='read'&&Number.isInteger(req.ecu)&&Number.isInteger(req.did))reply=await read(req.ecu,req.did);
          else reply={ok:false,error:'Unsupported request'};
        }catch(e){reply={ok:false,error:String(e.message||e)};}
        if(!client.destroyed)client.write(JSON.stringify(reply)+'\n');
      }
    });
  });
  server.listen(socket,()=>fs.chmodSync(socket,0o666));
  function close(){secureEndpoint.close();cdsEngine.close();server.close();if(transport&&transport.close)transport.close();try{fs.unlinkSync(socket);}catch(_){}}
  return {server,read,close,stats};
}
if(require.main===module){
  const instance=serve(()=>require('./transport').createTransport());
  process.on('SIGTERM',()=>{instance.close();process.exit(0);});
  process.on('SIGINT',()=>{instance.close();process.exit(0);});
}
module.exports={serve};
