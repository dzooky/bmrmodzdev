'use strict';
// Explicit, sequential read-only MGU checks. No background activity, no writes.
// Results are deliberately sanitised: no VIN, FA/VO, raw UDS data or position.
const STEPS=[
  {id:'service',label:'Service',request:{op:'status'},kind:'status'},
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
  {id:'cdsRpm',label:'CDS staged / engine speed',request:{op:'signalStaging',mode:'sample',field:'statusEngineSpeed2'},kind:'signal'}
];
function cleanError(value){return String(value||'Unknown error').replace(/[\r\n]/g,' ').slice(0,140);}
function resultFor(step,reply,duration){
  const base={id:step.id,label:step.label,status:'FAIL',durationMs:duration};
  if(!reply||typeof reply!=='object')return Object.assign(base,{detail:'Missing response'});
  if(step.kind==='status')return Object.assign(base,{status:reply.ok===true?'PASS':'FAIL',detail:reply.ok?'Service available':cleanError(reply.error)});
  if(step.kind==='environment'){
    const catalog=reply.catalog&&reply.catalog.present;
    const module=reply.nativeModule&&reply.nativeModule.resolved;
    const ok=!!catalog&&!!module;
    return Object.assign(base,{status:ok?'PASS':'FAIL',detail:'Catalog '+(catalog?'yes':'no')+', native module '+(module?'resolved':'not resolved')});
  }
  if(step.kind==='config')return Object.assign(base,{status:reply.ok?'PASS':'FAIL',detail:reply.ok?'Tool-owned CDS config present':cleanError(reply.error||'CDS config missing or incomplete')});
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
          :step.kind==='signal'&&!stagingReady?'Staged CDS config unavailable'
          :step.kind==='signal'&&!nativeReady?'Native SOME/IP unavailable'
          :null;
        if(skip){results.push(skipped(step,skip));if(onProgress)onProgress(i+1,STEPS.length,results[results.length-1]);continue;}
        const start=now();
        let result;
        try{
          const reply=await request(step.request,{timeoutMs:15000});
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
