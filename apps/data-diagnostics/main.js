'use strict';
const mgu=require('./kit/mgu'),G=require('./kit/gauges'),client=require('./client');
const {t}=require('./translations');
const cdsProbe=require('./cds-probe');
const ccTest=require('./cc-test');
const beltRetest=require('./cc-belt-retest');
const gearRetest=require('./cc-gear-retest');
const rpmRetest=require('./cc-rpm-retest');
const nativeFront=require('./cc-native-front');
const ccActuation=require('./cc-actuation'),ccActuationGate=require('./cc-actuation-gate');
const ccActuationReport=require('./cc-actuation-report'),upload=require('./upload').upload;
const ccCompare=require('./cc-compare'),ccCompareReport=require('./cc-compare-report');
const sourceProbe=require('./cc-source-probe-094'),sourceProbeReport=require('./cc-source-probe-report-094');
const vehicleGear=require('./cc-vehicle-gear-096');
const W=1600,H=520;
const pages=['Info','Data Tool','Background Tool','Notification Tool','CC Test','CC Controls','CC Compare','CC Sources'];
const DEV_NOTICE=[
 'This application is still in development phase and not ready for public use.',
 'We still working on it and will be available soon.',
 'Thank you'
];
mgu.run({start(ctx){
 const {ui,log}=ctx;
 let page=0,ntBusy=false,ntMessage='',ntError='',ntCooldown=0,ntHealth=null,ntPoll=false,lastNtPoll=0;
 let bgHealth=null,bgBusy=false,lastBgPoll=0,bgCommandBusy=false,bgMessage='',bgDeadline=0;
 let cdsBusy=false,cdsResult=null,ccBusy=false,ccResult=null,ccDetailPage=0;
 let udsHealth=null,healthError=false,lastHealthPoll=0,healthBusy=false;
 const actuatorReport=ccActuationReport.create(require('path').join(ctx.dataDir,'cc-wheel-test-092.json'));
 const comparison=ccCompareReport.create(require('path').join(ctx.dataDir,'cc-compare-093.json'));
 let compareBusy=false,compareUploadBusy=false,compareMessage='',compareDetails=0;
 const sourceReport=sourceProbeReport.create(require('path').join(ctx.dataDir,'cc-probe-097.json'));
 let sourceBusy=false,sourceUploadBusy=false,sourceMessage='',sourceDetails=0,sourceProgress='',sourceStage='';
 let actuatorBusy=false,actuatorArmed=null,actuatorArmUntil=0,actuatorDetails=0,actuatorStage='';
 let actuatorUploadBusy=false,actuatorUploadMessage='';
 const word=key=>t(ctx.settings.get('language')||'en',key);
  async function testNotification(){
   if(ntBusy||Date.now()<ntCooldown)return;
   page=3;ntCooldown=Date.now()+15000;
   ntBusy=true;ntError='';ntMessage=word('Sending');
   try{
    const id='test-'+Date.now();
    const opts={socket:'/run/bmrmodz-notification/ctl.sock',timeoutMs:2500};
    const a=await client.request({api:1,op:'showText',target:'kombi',app:'diagnostics',id:id+'-1',durationMs:6000,ttlMs:20000,segments:[{text:word('Notification test')+': ',color:'#FFFFFF',blinkMs:0},{text:word('Slow'),color:'#FF3030',blinkMs:1000}]},opts);
    if(!a||!a.ok)throw Error('1: '+(a&&(a.code?a.code+': ':'')+(a.error||'Rejected')||'No reply'));
    const b=await client.request({api:1,op:'showText',target:'kombi',app:'diagnostics',id:id+'-2',durationMs:6000,ttlMs:20000,segments:[{text:word('Notification test')+': ',color:'#FFFFFF',blinkMs:0},{text:word('Fast'),color:'#00FF00',blinkMs:250}]},opts);
    if(!b||!b.ok)throw Error('2: '+(b&&(b.code?b.code+': ':'')+(b.error||'Rejected')||'No reply'));
    ntMessage=word('Queued');
   }catch(e){ntMessage=word('FAIL');ntError=String(e.message||e);log.warn('Notification test: '+ntError);}finally{ntBusy=false;lastNtPoll=0;}
  }
  async function toggleBackgroundTest(){
   if(bgCommandBusy)return;
   page=2;
   bgCommandBusy=true;
   try{const reply=await client.request({api:1,op:bgHealth&&bgHealth.testActive?'testStop':'testStart'},{socket:'/run/bmrmodz-background-tool/ctl.sock',timeoutMs:2500});bgMessage=word(reply&&reply.ok?'PASS':'FAIL');if(reply&&reply.ok)bgDeadline=bgHealth&&bgHealth.testActive?0:Date.now()+120000;}catch(_){bgMessage=word('FAIL');}finally{bgCommandBusy=false;lastBgPoll=0;}
  }
  async function pollBackground(){
   if(bgBusy)return;bgBusy=true;
   try{const h=await client.request({api:1,op:'status'},{socket:'/run/bmrmodz-background-tool/ctl.sock',timeoutMs:1500});bgHealth=h&&h.ok&&h.api===1?h:null;}catch(_){bgHealth=null;}finally{bgBusy=false;}
  }
  async function pollReadHealth(){
   if(healthBusy)return;
   healthBusy=true;
   try{
    const data=await client.request({op:'status'},{timeoutMs:2500});
    if(data&&data.ok&&data.readHealth&&data.readHealth.scope==='data-tool-uds-only'){
     udsHealth=data.readHealth;healthError=false;
    }else{udsHealth=null;healthError=true;}
   }catch(_){udsHealth=null;healthError=true;}
   finally{healthBusy=false;}
  }

 async function testCds(){
  if(cdsBusy)return;cdsBusy=true;cdsResult=null;
  try{cdsResult=await cdsProbe.run(client.request);}catch(e){cdsResult={rows:[],error:String(e.message||e)};}finally{cdsBusy=false;}
 }
 async function testCC(){
  if(ccBusy)return;ccBusy=true;ccResult=null;ccDetailPage=0;
  try{
   ccResult=await ccTest.run(client.request);
   ccResult.nativeFront=await nativeFront.run(ctx.signals,ctx.log);
   ccResult.nativeGear={ok:false,stage:'unsupported-manifest-removed',observations:{}};
  }
  catch(e){ccResult={gear:{ok:false,stage:'error'},belts:{},errors:[String(e.message||e)]};}
  finally{ccBusy=false;}
 }
 async function testBeltTransition(){
  if(ccBusy||!ccResult||!ccResult.sharedNative)return;
  ccBusy=true;
  try{
   const belt=await beltRetest.run(client.request,ccResult.sharedNative);
   ccResult.beltRetest=belt;
   ccResult.gearRetest=await gearRetest.run(client.request,belt.sample||null);
   ccResult.rpmRetest=await rpmRetest.run(client.request);
  }
  catch(e){ccResult.beltRetest={ok:false,stage:'unexpected',error:String(e.message||e).slice(0,70)};}
  finally{ccBusy=false;ccDetailPage=0;}
 }
 async function runCcActuator(id){
  if(actuatorBusy||actuatorUploadBusy||id!=='wheelHeat')return;
  const now=Date.now();
  if(actuatorArmed!==id||now>=actuatorArmUntil){
   actuatorArmed=id;actuatorArmUntil=now+12000;return;
  }
  actuatorArmed=null;actuatorArmUntil=0;actuatorBusy=true;actuatorStage='belt-gate';
  const startedAt=new Date().toISOString();
  let record;
  try{
   const gate=await ccActuationGate.check(id,client.request);
   if(!gate.ok){
    record={id,source:'diagnostics-oap-native',toolActuationVerified:false,
     startedAt,finishedAt:new Date().toISOString(),status:'SKIP',stage:'belt-gate-'+gate.stage,
     before:null,after:null,error:gate.error||null,steps:[{at:new Date().toISOString(),stage:'belt-gate',error:gate.stage}]};
   }else{
    record=await ccActuation.run(id,{confirmed:true,signals:ctx.signals,log:ctx.log,onStep:stage=>{actuatorStage=stage;}});
    record.gearObservation=gate.gearObservation||null;
    record.gearSourceVerified=gate.gearSourceVerified===true;
    record.steps.unshift({at:startedAt,stage:'belt-gate-'+gate.stage});
   }
  }catch(e){record={id,startedAt,finishedAt:new Date().toISOString(),status:'FAIL',
   stage:'test-exception',error:String(e.message||e).slice(0,120),steps:[]};}
  finally{
   if(record)try{actuatorReport.save(record);}
    catch(e){ctx.log.warn('CC actuator log persistence: '+String(e.message||e));}
   actuatorBusy=false;actuatorDetails=0;actuatorUploadMessage='';actuatorStage='';
  }
 }
 async function uploadCcActuators(){
  if(actuatorBusy||actuatorUploadBusy||!actuatorReport.snapshot().cases.length)return;
  actuatorUploadBusy=true;actuatorUploadMessage=word('Sending');
  try{const r=await upload(actuatorReport.envelope(),ctx.dataDir);
   actuatorUploadMessage=word('Report sent')+': '+r.id;
  }catch(e){actuatorUploadMessage=word('Send failed')+': '+String(e.message||e).slice(0,55);}
  finally{actuatorUploadBusy=false;}
 }
 async function captureSources(kind){
  if(sourceBusy||sourceUploadBusy||!['wheelTrace','gearP','gearR','gearD'].includes(kind))return;
  sourceBusy=true;sourceMessage=word('Capturing');sourceProgress=kind;sourceStage='';
  try{
   const r=kind==='wheelTrace'?
    await sourceProbe.captureGuidedWheel(ctx.signals,{log:ctx.log,onStage:(stage,detail)=>{sourceStage=stage;sourceProgress=detail;}}):
    await vehicleGear.capture(kind==='gearD'?'D':kind==='gearR'?'R':'P',ctx.signals,{log:ctx.log});
   sourceReport.save(r);sourceMessage=kind+': '+r.stage;
   sourceDetails=0;
  }catch(e){sourceMessage=word('FAIL')+': '+String(e.message||e).slice(0,65);}
  finally{sourceBusy=false;sourceProgress='';sourceStage='';}
 }
 async function uploadSources(){
  if(sourceBusy||sourceUploadBusy||!sourceReport.snapshot().captures.length)return;
  sourceUploadBusy=true;sourceMessage=word('Sending');
  try{const r=await upload(sourceReport.envelope(),ctx.dataDir);
   sourceMessage=word('Report sent')+': '+r.id;
  }catch(e){sourceMessage=word('Send failed')+': '+String(e.message||e).slice(0,55);}
  finally{sourceUploadBusy=false;}
 }
 async function captureComparison(kind){
  if(compareBusy||compareUploadBusy||!ccCompare.FIELDS.includes(kind))return;
  compareBusy=true;compareMessage=word('Capturing');
  try{
   const result=kind.startsWith('wheel')?
    await ccCompare.wheelCapture(kind,{signals:ctx.signals,log:ctx.log}):
    await ccCompare.gearCapture(kind,client.request);
   comparison.save(result);
   compareMessage=kind+': '+result.stage;
   compareDetails=0;
  }catch(e){compareMessage=word('FAIL')+': '+String(e.message||e).slice(0,60);}
  finally{compareBusy=false;}
 }
 async function uploadComparison(){
  if(compareBusy||compareUploadBusy||!comparison.snapshot().captures.length)return;
  compareUploadBusy=true;compareMessage=word('Sending');
  try{const r=await upload(comparison.envelope(),ctx.dataDir);
   compareMessage=word('Report sent')+': '+r.id;
  }catch(e){compareMessage=word('Send failed')+': '+String(e.message||e).slice(0,55);}
  finally{compareUploadBusy=false;}
 }
 async function pollNotification(){
  if(ntPoll)return;ntPoll=true;
  try{const h=await client.request({op:'status'},{socket:'/run/bmrmodz-notification/ctl.sock',timeoutMs:1500});ntHealth=h&&h.ok?h:null;}catch(_){ntHealth=null;}finally{ntPoll=false;}
 }
 ui.onClick('BTN_BT',()=>{toggleBackgroundTest().catch(e=>log.warn(String(e)));});
 ui.onClick('BTN_NT',()=>{testNotification().catch(e=>log.warn(String(e)));});
 ctx.onTab(i=>{if(i>=0&&i<pages.length)page=i;});
 ctx.onTap((x,y)=>{
  if(page===7){
   if(x>=1100&&x<=1510&&y>=55&&y<=110){
    sourceDetails=(sourceDetails+1)%(Math.ceil(sourceReport.lines().length/6)+1);return;
   }
   if(sourceBusy||sourceUploadBusy)return;
   if(y>=150&&y<=242){
    if(x>=90&&x<=740){captureSources('wheelTrace').catch(e=>log.warn(String(e)));return;}
    if(x>=850&&x<=1500){captureSources('gearP').catch(e=>log.warn(String(e)));return;}
   }
   if(y>=260&&y<=340){
    if(x>=90&&x<=740){captureSources('gearR').catch(e=>log.warn(String(e)));return;}
    if(x>=850&&x<=1500){captureSources('gearD').catch(e=>log.warn(String(e)));return;}
   }
   if(x>=520&&x<=1080&&y>=390&&y<=455){
    uploadSources().catch(e=>log.warn(String(e)));return;
   }
   return;
  }
  if(page===6){
   if(x>=1100&&x<=1510&&y>=55&&y<=110){
    compareDetails=(compareDetails+1)%(Math.ceil(comparison.lines().length/6)+1);return;
   }
   if(compareBusy||compareUploadBusy)return;
   if(y>=148&&y<=223){
    if(x>=90&&x<=750){captureComparison('wheelOff').catch(e=>log.warn(String(e)));return;}
    if(x>=840&&x<=1500){captureComparison('wheelOn').catch(e=>log.warn(String(e)));return;}
   }
   if(y>=252&&y<=327){
    if(x>=90&&x<=750){captureComparison('gearP').catch(e=>log.warn(String(e)));return;}
    if(x>=840&&x<=1500){captureComparison('gearD').catch(e=>log.warn(String(e)));return;}
   }
   if(x>=520&&x<=1080&&y>=390&&y<=455){
    uploadComparison().catch(e=>log.warn(String(e)));return;
   }
   return;
  }
  if(page===5&&x>=1100&&x<=1510&&y>=55&&y<=110){
   actuatorDetails=(actuatorDetails+1)%(Math.ceil(actuatorReport.lines().length/6)+1);return;
  }
  if(page===5&&!actuatorBusy&&!actuatorUploadBusy){
   if(x>=830&&x<=1500&&y>=195&&y<=266){
    runCcActuator('wheelHeat').catch(e=>ctx.log.warn(String(e)));return;
   }
   if(actuatorReport.snapshot().cases.length&&y>=390&&y<=434){
    const v=x>=150&&x<=520?'message-seen':x>=560&&x<=940?'no-message':null;
    if(v){try{actuatorReport.kombi(v);}catch(e){log.warn(String(e));}return;}
   }
   if(actuatorReport.snapshot().cases.length&&y>=330&&y<=388){
    try{
     if(x>=150&&x<=520){actuatorReport.feedback('heat-felt');actuatorUploadMessage='';return;}
     if(x>=560&&x<=940){actuatorReport.feedback('no-heat');actuatorUploadMessage='';return;}
    }catch(e){ctx.log.warn('CC physical feedback: '+String(e));}
   }
   if(x>=520&&x<=1080&&y>=440&&y<=495){
    uploadCcActuators().catch(e=>ctx.log.warn(String(e)));return;
   }
  }
  if(page===4&&ccResult&&!ccBusy&&x>=1080&&x<=1510&&y>=55&&y<=110){ccDetailPage=(ccDetailPage+1)%(Math.ceil(ccTest.detailLines(ccResult).length/6)+1);return;}
  if(page===4&&ccResult&&!ccBusy&&x>=90&&x<=465&&y>=390&&y<=455){
   testBeltTransition().catch(e=>log.warn('Combined CC retest: '+e));return;
  }
  if(x>=520&&x<=1080&&y>=390&&y<=455){
   if(page===1)testCds();
   if(page===2)toggleBackgroundTest();
   if(page===3)testNotification();
   if(page===4)testCC();
  }
 });
 function label(cv,text,x,y,size,color,opts){cv.text(String(text==null?'':text).slice(0,105),x,y,size,color,Object.assign({literal:true},opts||{}));}
 function header(cv,theme,title,status){label(cv,word(title),55,93,32,theme.text,{font:'bold'});label(cv,status,1540,93,21,theme.dim,{align:'right'});G.panel(cv,theme,24,115,1552,380,null);}
 function row(cv,theme,key,value,y){label(cv,word(key),85,y,24,theme.dim);label(cv,value,1510,y,25,theme.text,{align:'right'});}
 function button(cv,theme,text,disabled){cv.roundRect(520,390,560,65,10,disabled?theme.track:theme.accent2);label(cv,text,800,430,24,theme.text,{align:'center',font:'bold'});}
 function drawInfo(cv,theme){
  header(cv,theme,'Info','0.1.97');
  DEV_NOTICE.forEach((line,i)=>label(cv,line,800,190+i*42,24,theme.text,{align:'center'}));
  label(cv,word('Stay parked during the test'),800,350,24,theme.warn,{align:'center'});
  label(cv,word('Notification Tool test'),800,410,22,theme.dim,{align:'center'});
 }
 function drawData(cv,theme){
  const h=udsHealth;header(cv,theme,'Data Tool',word(h?'Running':healthError?'Unavailable':'Loading Tool status'));
  const n=h&&h.stats||{};
  row(cv,theme,'Successful reads',h?n.ok||0:'—',155);
  row(cv,theme,'Failed reads',h?(n.error||0)+(n.timeout||0):'—',185);
  row(cv,theme,'Cache hits',h?n.cacheHits||0:'—',215);
  if(cdsResult){
   cdsResult.rows.forEach((r,i)=>label(cv,r.name+'  '+(r.valid?r.value+' / '+word('PASS'):word('FAIL')),85,245+i*25,18,r.valid?theme.ok:theme.crit));
   label(cv,'DPF: '+word(cdsResult.reference?'PASS':'FAIL')+' / '+word('Demand released')+': '+word(cdsResult.released?'PASS':'FAIL'),1500,245,18,theme.text,{align:'right'});
   label(cv,word('CDS configuration')+': '+word(cdsResult.config?'PASS':'FAIL')+' / '+word('Motor-only test')+': '+(cdsResult.isolated||0)+'/3',1500,270,18,theme.text,{align:'right'});
   const errors=[cdsResult.isolatedError,cdsResult.mixedError,cdsResult.error].filter(Boolean);
   errors.forEach((err,i)=>label(cv,err,1500,295+i*23,16,theme.warn,{align:'right'}));
  }
  button(cv,theme,word(cdsBusy?'Running':'Public CDS signal test'),cdsBusy);
  label(cv,word('Stay parked during the test'),800,480,18,theme.warn,{align:'center'});
 }
 function drawBackground(cv,theme){
  const h=bgHealth;header(cv,theme,'Background Tool',word(h?'Running':'Unavailable')+(h?' / '+(h.version||word('Unknown')):''));
  if(h){
   row(cv,theme,'Rules / Evaluation ticks',h.rules+' / '+h.ticks,150);
   row(cv,theme,'Test hits',h.testHits,190);
   row(cv,theme,'Notification accepted',h.notificationAccepted==null?'—':h.notificationAccepted,230);
   row(cv,theme,'Remaining time',h.testActive?(Number.isFinite(h.testRemainingMs)?Math.ceil(h.testRemainingMs/1000)+' s':word('Unknown')):'—',270);
   row(cv,theme,'Arming delay',h.armRemainingMs>0?Math.ceil(h.armRemainingMs/1000)+' s':'—',310);
   if(h.notificationError)label(cv,h.notificationError,800,365,20,theme.warn,{align:'center'});
  }
  button(cv,theme,word(h&&h.testActive?'Stop BT test':'Start BT test')+' '+bgMessage,bgCommandBusy);
 }
 function beltRetestButton(cv,theme){
  if(!ccResult)return;
  cv.roundRect(90,390,375,65,10,ccBusy?theme.track:theme.accent2);
  label(cv,word('Retest belts + gear + RPM'),277,430,21,theme.text,{align:'center',font:'bold'});
 }
 function drawCC(cv,theme){
  header(cv,theme,'CC Test',word(ccBusy?'Running':ccResult?'Completed':'Not tested'));
  if(ccResult){
   cv.roundRect(1100,58,265,50,8,theme.track);
   label(cv,'Details '+ccDetailPage+'/'+Math.ceil(ccTest.detailLines(ccResult).length/6),1230,91,19,theme.text,{align:'center'});
  }
  if(ccResult&&ccDetailPage){
   const lines=ccTest.detailLines(ccResult);
   const start=(ccDetailPage-1)*6;
   lines.slice(start,start+6).forEach((line,i)=>label(cv,line,68,153+i*37,16,theme.text));
   button(cv,theme,word(ccBusy?'Running':'Run CC diagnostics'),ccBusy);
   beltRetestButton(cv,theme);
   label(cv,word('Stay parked during the test'),800,480,18,theme.warn,{align:'center'});
   return;
  }
  const x=ccResult||{},g=x.gear||{},belts=x.belts||{};
  const native=x.nativeGear||{},shared=x.sharedNative&&x.sharedNative.fields||{};
  const sharedGear=shared.gear&&shared.gear.valid===true?shared.gear.value:null;
  const gearText=!ccResult?'—':sharedGear?'Tool OAP: '+sharedGear+' / Tool Gen: '+(g.ok?g.selector:'unavailable'):native.ok?'Native: '+native.selector+' / Tool: '+(g.ok?g.selector:'unavailable'):
    g.ok?'Tool: '+g.selector+' / Native: '+(native.stage||'unknown'):
    'Tool: '+(g.stage||'unknown')+' / Native: '+(native.stage||'not-tested');
  row(cv,theme,'Gear selector',gearText,150);
  ['frontLeft','frontRight','rearLeft','rearRight'].forEach((k,i)=>{
   const v=belts[k],sharedValue=shared[k]&&shared[k].valid===true?shared[k].value:null;
   const tool=sharedValue|| (v==='latched'||v==='unlatched'?v:word('Unknown'));
   const n=x.nativeFront&&x.nativeFront[k];
   const value=i<2?word('Tool')+': '+tool+' / '+word('Native')+': '+(n?(n.state==='unknown'?n.detail:n.state):word('Not tested')):tool;
   row(cv,theme,k,value,190+i*35);
  });
  const service=x.toolNative||{};
  const reads=service.readings||{};
  const serviceValue=service.ok?
   [reads.frontLeft&&reads.frontLeft.state,reads.frontRight&&reads.frontRight.state].join(' / '):
   String(service.stage||'not-tested')+(service.error?' / '+String(service.error).slice(0,45):'');
  label(cv,word('Service TASU')+': '+serviceValue,800,316,16,service.ok?theme.ok:theme.warn,{align:'center'});
  // Surface both independent failure reasons instead of masking the
  // gearbox generator's actual stage and the right front contact status.
  const details=[];
  if(x.sourceAudit&&x.sourceAudit.bundle){
   const b=x.sourceAudit.bundle;
   details.push(word('BMW bundle')+': '+b.status+(b.line?' @'+b.line:''));
  }
  if(ccResult&&g.ok!==true&&g.error)details.push('Gear: '+String(g.error).slice(0,90));
  (x.errors||[]).forEach(e=>{if(details.length<3)details.push(String(e).slice(0,90));});
  details.slice(0,3).forEach((message,i)=>label(cv,message,800,335+i*19,15,theme.warn,{align:'center'}));
  button(cv,theme,word(ccBusy?'Running':'Run CC diagnostics'),ccBusy);
  beltRetestButton(cv,theme);
  if(x.beltRetest)label(cv,word('Belt retest')+': '+x.beltRetest.stage,330,355,16,theme.dim);
  if(x.gearRetest)label(cv,word('Gear test')+': '+x.gearRetest.stage,330,374,16,theme.dim);
  if(x.rpmRetest)label(cv,word('RPM test')+': '+x.rpmRetest.stage+(x.rpmRetest.rpm===null?'':' / '+x.rpmRetest.rpm+' rpm'),850,375,16,theme.dim);
  label(cv,word('Stay parked during the test'),800,480,18,theme.warn,{align:'center'});
 }
 function drawNotification(cv,theme){
  const h=ntHealth;header(cv,theme,'Notification Tool',word(h?'Running':'Unavailable')+(h?' / '+(h.version||word('Unknown')):''));
  if(h){
   const s=h.stats||{};
   row(cv,theme,'Queue',h.queued==null?'—':h.queued,150);
   row(cv,theme,'Accepted / Submitted',(s.accepted==null?'—':s.accepted)+' / '+(s.submitted==null?'—':s.submitted),190);
   row(cv,theme,'Rejected / Failed / Expired',[s.rejected,s.failed,s.expired].map(v=>v==null?'—':v).join(' / '),230);
   row(cv,theme,'Renderer self-test',h.rendererCheck?word(h.rendererCheck.ok?'PASS':'FAIL'):word('Unknown'),270);
   const files=h.rendererCheck&&h.rendererCheck.files;
   row(cv,theme,'Renderer files',files?Object.keys(files).filter(k=>files[k]).length+' / '+Object.keys(files).length:'—',310);
   const err=ntError||h.lastError||(h.rendererCheck&&h.rendererCheck.error)||'';
   if(err)label(cv,err,800,365,20,theme.warn,{align:'center'});
  }else if(ntError){label(cv,ntError,800,365,20,theme.warn,{align:'center'});
  }
  button(cv,theme,word('Test notification')+' '+ntMessage,ntBusy||Date.now()<ntCooldown);
  label(cv,word('Stay parked during the test'),800,480,18,theme.warn,{align:'center'});
 }
 function drawCcControls(cv,theme){
  const report=actuatorReport.snapshot(),test=report.cases.find(x=>x.id==='wheelHeat');
  header(cv,theme,'CC Controls',word(actuatorBusy?'Running':actuatorUploadBusy?'Sending':'Manual test only'));
  cv.roundRect(1100,58,265,50,8,theme.track);
  label(cv,'Details '+actuatorDetails+'/'+Math.ceil(actuatorReport.lines().length/6),1230,91,19,theme.text,{align:'center'});
  if(actuatorDetails){
   const lines=actuatorReport.lines(),start=(actuatorDetails-1)*6;
   lines.slice(start,start+6).forEach((line,i)=>label(cv,line,68,153+i*37,16,theme.text));
  }else{
   label(cv,word('Confirm parked, engine running, belt latched'),90,158,20,theme.warn);
   label(cv,word('Steering wheel heating')+' (60 s)',90,240,26,theme.text);
   cv.roundRect(830,195,670,71,9,actuatorBusy||actuatorUploadBusy?theme.track:theme.accent2);
   const armed=actuatorArmed==='wheelHeat'&&Date.now()<actuatorArmUntil;
   const caption=actuatorBusy?(actuatorStage||word('Running')):armed?word('Confirm action'):
    test?test.status+' / '+String(test.stage||'').slice(0,35):word('Arm test');
   label(cv,caption,1165,239,21,theme.text,{align:'center'});
   label(cv,word('Feel the wheel during the test, then record result'),90,305,19,theme.dim);
   cv.roundRect(150,330,370,58,8,actuatorBusy||!test?theme.track:theme.accent2);
   label(cv,word('Wheel is warm'),335,368,21,theme.text,{align:'center'});
   cv.roundRect(560,330,380,58,8,actuatorBusy||!test?theme.track:theme.accent2);
   label(cv,word('No heating felt'),750,368,21,theme.text,{align:'center'});
   if(test)label(cv,word('Physical feedback')+': '+word(test.physicalFeedback||'not-checked'),1030,368,18,theme.dim);
   label(cv,word('D signal')+': '+(test&&test.gearSourceVerified?test.gearObservation:word('not verified; not a test gate')),90,291,16,theme.warn);
   cv.roundRect(150,390,370,41,8,actuatorBusy||!test?theme.track:theme.accent2);
   label(cv,word('KOMBI message seen'),335,418,18,theme.text,{align:'center'});
   cv.roundRect(560,390,380,41,8,actuatorBusy||!test?theme.track:theme.accent2);
   label(cv,word('No KOMBI message'),750,418,18,theme.text,{align:'center'});
   if(test)label(cv,word('KOMBI')+': '+word(test.kombiFeedback||'not-checked'),1030,420,17,theme.dim);
  }
  cv.roundRect(520,440,560,55,9,actuatorBusy||actuatorUploadBusy?theme.track:theme.accent2);
  label(cv,word('Send detailed report'),800,475,20,theme.text,{align:'center',font:'bold'});
  if(actuatorUploadMessage)label(cv,actuatorUploadMessage,1150,480,15,theme.dim,{align:'center'});
 }
 function drawCcCompare(cv,theme){
  const summary=comparison.snapshot(),busy=compareBusy||compareUploadBusy;
  header(cv,theme,'CC Compare',word(busy?'Running':'Manual captures'));
  cv.roundRect(1100,58,265,50,8,theme.track);
  label(cv,'Details '+compareDetails+'/'+Math.ceil(comparison.lines().length/6),1230,91,19,theme.text,{align:'center'});
  if(compareDetails){
   const lines=comparison.lines(),start=(compareDetails-1)*6;
   lines.slice(start,start+6).forEach((line,i)=>label(cv,line,68,153+i*38,17,theme.text));
  }else{
   const items=[['wheelOff','Wheel OFF: capture'],['wheelOn','OEM wheel ON: capture'],
    ['gearP','Gear P: capture'],['gearD','Gear D: capture']];
   items.forEach((item,i)=>{
    const x=i%2===0?90:840,y=i<2?148:252,w=660;
    cv.roundRect(x,y,w,75,10,busy?theme.track:theme.accent2);
    const r=summary.captures.find(v=>v.kind===item[0]);
    label(cv,word(item[1]),x+w/2,y+31,21,theme.text,{align:'center',font:'bold'});
    label(cv,r?r.stage:word('Not captured'),x+w/2,y+59,15,theme.text,{align:'center'});
   });
   label(cv,word('Wheel: use original BMW switch; no ECU write'),800,345,17,theme.warn,{align:'center'});
   label(cv,word('Gear: only when safely stationary; do not force D'),800,372,16,theme.warn,{align:'center'});
  }
  cv.roundRect(520,390,560,65,10,busy?theme.track:theme.accent2);
  label(cv,word('Send comparison report'),800,430,23,theme.text,{align:'center',font:'bold'});
  if(compareMessage)label(cv,compareMessage,800,483,17,theme.dim,{align:'center'});
 }
 function drawCcSources(cv,theme){
  const summary=sourceReport.snapshot(),busy=sourceBusy||sourceUploadBusy;
  header(cv,theme,'CC Sources',word(busy?'Running':'Read-only source tests'));
  cv.roundRect(1100,58,265,50,8,theme.track);
  label(cv,'Details '+sourceDetails+'/'+Math.ceil(sourceReport.lines().length/6),1230,91,19,theme.text,{align:'center'});
  if(sourceDetails){
   const lines=sourceReport.lines(),start=(sourceDetails-1)*6;
   lines.slice(start,start+6).forEach((line,i)=>label(cv,line,68,153+i*38,16,theme.text));
  }else{
   const items=[['wheelTrace','Guided OEM wheel ON/OFF',90,150,650],
    ['gearP','VehicleInfo gear P',850,150,650],['gearR','VehicleInfo gear R',90,260,650],
    ['gearD','VehicleInfo gear D',850,260,650]];
   items.forEach(item=>{
    const r=summary.captures.find(v=>v.kind===item[0]);
    cv.roundRect(item[2],item[3],item[4],80,10,busy?theme.track:theme.accent2);
    label(cv,word(item[1]),item[2]+item[4]/2,item[3]+30,21,theme.text,{align:'center',font:'bold'});
    label(cv,r?r.stage:word('Not captured'),item[2]+item[4]/2,item[3]+58,15,theme.text,{align:'center'});
   });
   label(cv,word('Start with wheel OFF; follow the live prompts'),418,247,16,theme.warn,{align:'center'});
   label(cv,word('Gear: stationary, brake held; test P / R / D'),800,366,16,theme.warn,{align:'center'});
   label(cv,word('No ECU writes or automatic gear actuation'),800,382,14,theme.dim,{align:'center'});
  }
  cv.roundRect(520,390,560,65,10,busy?theme.track:theme.accent2);
  label(cv,word('Send source report'),800,430,23,theme.text,{align:'center',font:'bold'});
  if(sourceBusy&&sourceStage)label(cv,sourceStage.toUpperCase()+': '+sourceProgress,800,465,18,theme.warn,{align:'center'});
  if(sourceMessage)label(cv,sourceMessage,800,497,16,theme.dim,{align:'center'});
 }
 async function render(){
  const theme=ctx.theme(),cv=ctx.canvas(W,H).clear(theme.bg),now=Date.now();delete cv.text;
  if(page===0)drawInfo(cv,theme);
  if(page===1){if(now-lastHealthPoll>=2000){lastHealthPoll=now;pollReadHealth();}drawData(cv,theme);}
  if(page===2){if(now-lastBgPoll>=2000){lastBgPoll=now;pollBackground();}drawBackground(cv,theme);}
  if(page===3){if(now-lastNtPoll>=2000){lastNtPoll=now;pollNotification();}drawNotification(cv,theme);}
  if(page===4)drawCC(cv,theme);
  if(page===5)drawCcControls(cv,theme);
  if(page===6)drawCcCompare(cv,theme);
  if(page===7)drawCcSources(cv,theme);
  G.frame(cv,theme,pages.map(word),page,[]);
  return ui.image('MAIN_GFX',cv);
 }
 ctx.loop('MAIN',3,render);render().catch(e=>log.warn(String(e)));
}}); 
