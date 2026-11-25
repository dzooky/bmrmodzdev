'use strict';
// Data Tool Diagnostics: display-only client for the independent Data Tool.
// No TASU or vehicle signal declarations; only Unix-socket service requests.
const fs=require('fs'),path=require('path');
const mgu=require('./kit/mgu');
const G=require('./kit/gauges');
const client=require('./client');
const {createRunner}=require('./test-runner');
const {drawFocusedResults}=require('./results-view');
const {t}=require('./translations');
const qrReport=require('./qr-report');
const uploader=require('./upload');
const cacheProbe=require('./cache-probe');
const apiProbe=require('./api-probe');
const cdsProbe=require('./cds-probe');
const enduranceProbe=require('./endurance-probe');
const W=1600,H=520;
const REPORT_NAME='data-tool-diagnostic-report.json';
const pages=['Info','Diagnostics','Results','DPF comparison','Vehicle comparison','Share','Cache test'];
const DEV_NOTICE=[
 'This application is still in development phase and not ready for public use.',
 'We still working on it and will be available soon.',
 'Thank you'
];
function safeValue(value){return String(value===undefined?'':value).slice(0,105);}
mgu.run({
 start(ctx){
  const {ui,log}=ctx;
  const runner=createRunner(client.request);
  let page=0,running=false,sending=false,generating=false,probing=false,tasuOpen=false,tasuStatus='',genStatus='',report=null,progress=0,exportState='',sendStatus='',lastResult=null,reportQr=null;
  let cdsResult=null;
  let cacheBusy=false,cacheResult=null,cacheError='',apiResult=null,enduranceResult=null,enduranceElapsed=0,enduranceRunning=false;
  let before=null,after=null;
  let bgHealth=null,bgBusy=false,lastBgPoll=0,bgCommandBusy=false,bgMessage='';
  let udsHealth=null,healthError=false,lastHealthPoll=0,healthBusy=false;
  let nextPhase='before';
  const currentLanguage=()=>ctx.settings.get('language')||'en';
  const word=key=>t(currentLanguage(),key);
  const reportFile=path.join(ctx.dataDir,REPORT_NAME);
  const phaseFile=phase=>path.join(ctx.dataDir,'data-tool-'+phase+'-sleep.json');
  for(const phase of ['before','after'])try{
   const old=JSON.parse(fs.readFileSync(phaseFile(phase),'utf8'));
   if(old&&old.schema===1&&old.snapshotPhase===phase&&Array.isArray(old.results)){
    if(phase==='before')before=old;else after=old;
   }
  }catch(_){}
  try{
   const previous=JSON.parse(fs.readFileSync(reportFile,'utf8'));
   if(previous&&previous.schema===1&&Array.isArray(previous.results))report=previous;
  }catch(_){}
  nextPhase=before&&!after?'after':'before';
  function refreshButtons(){
   for(const [button,key] of [['BTN_RUN',nextPhase==='after'?'Run after wake':'Run before sleep'],
     ['BTN_SEND','Send report']]){
    try{ui.text(button,word(key));}catch(_){}
   }
  }
  // The physical MGU button title is static in app.json, not a runtime ui.text update.
  refreshButtons();
  ctx.settings.onChange(key=>{if(key==='language')refreshButtons();});
  async function toggleBackgroundTest(){
   if(bgCommandBusy||running||cacheBusy||tasuOpen)return;
   bgCommandBusy=true;
   try{const reply=await client.request({api:1,op:bgHealth&&bgHealth.testActive?'testStop':'testStart'},{socket:'/run/bmrmodz-background-tool/ctl.sock',timeoutMs:2500});bgMessage=word(reply&&reply.ok?'PASS':'FAIL');}catch(_){bgMessage=word('FAIL');}finally{bgCommandBusy=false;lastBgPoll=0;}
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
  async function runTest(phase){
   if(tasuOpen){tasuStatus=word('Close TASU before running diagnostics');page=1;return;}
   if(cacheBusy||running||sending||generating||probing)return;
   page=1;refreshButtons();running=true;progress=0;report=null;reportQr=null;exportState='';sendStatus='';lastResult=null;
   try{
    const output=await runner.run((completed,total,item)=>{
     progress=Math.floor(100*completed/total);lastResult=item;
    },phase);
    report=output;page=2;refreshButtons();
    if(phase==='before'){
     before=output;after=null;
     try{fs.unlinkSync(phaseFile('after'));}catch(error){if(error.code!=='ENOENT')log.warn('After snapshot cleanup: '+error.message);}
    }else after=output;
    nextPhase=phase==='before'?'after':'before';
    refreshButtons();
    try{
     fs.writeFileSync(phaseFile(phase),JSON.stringify(output,null,2)+'\n',{encoding:'utf8',mode:0o600});
     fs.writeFileSync(reportFile,JSON.stringify(output,null,2)+'\n',{encoding:'utf8',mode:0o600});
    }catch(error){exportState=word('Export failed')+': '+safeValue(error.message);}
   }catch(error){
    log.warn('Data Tool diagnostic run: '+error.message);
    exportState=word('Export failed')+': '+safeValue(error.message);
   }finally{running=false;}
  }
  async function toggleTasuIdle(){
   if(cacheBusy||probing||running||sending||generating)return;
   probing=true;page=1;refreshButtons();
   const mode=tasuOpen?'close':'open';
   tasuStatus=word('TASU probe running');
   try{
    const reply=await client.request({op:'tasuIdleProbe',mode},{timeoutMs:11000});
    if(reply&&reply.ok===true&&reply.vehicleReads===0&&reply.mode===mode){
     tasuOpen=mode==='open';
     tasuStatus=word(tasuOpen?'TASU connected without ECU reads':'TASU connection closed');
    }else{
     tasuStatus=word('TASU probe failed');
    }
   }catch(e){tasuStatus=word('TASU probe failed');}
   finally{probing=false;refreshButtons();}
  }
  async function runCacheProbe(){
   if(cacheBusy||running||sending||generating||probing)return;
   if(tasuOpen){cacheError=word('Close TASU before cache test');return;}
   cacheBusy=true;cdsResult=null;cacheResult=null;apiResult=null;enduranceResult=null;cacheError='';
   try{
     cacheResult=await cacheProbe.run(client.request);
     const live=await client.request({op:'schedulerLiveTest'},{timeoutMs:12000});
     cacheResult.scheduler=live&&live.mode==='internal-fixed-read-test'&&live.productionAccessEnabled===false&&live.ok===true;
     const profile=await client.request({op:'schedulerMixedProfileTest'},{timeoutMs:110000});
     if(profile&&profile.mode==='internal-mixed-profile-test'&&profile.productionAccessEnabled===false)cacheResult.profile=profile;
   }
   catch(_){cacheError=word('Cache test could not complete');}
   finally{cacheBusy=false;lastHealthPoll=0;}
  }
  async function runApiProbe(){
   if(cacheBusy||running||sending||generating||probing)return;
   if(tasuOpen){cacheError=word('Close TASU before cache test');return;}
   cacheBusy=true;cdsResult=null;cacheResult=null;apiResult=null;enduranceResult=null;cacheError='';
   try{apiResult=await apiProbe.run();}catch(_){cacheError=word('Cache test could not complete');}
   finally{cacheBusy=false;lastHealthPoll=0;}
  }
  async function runEndurance(){
   if(cacheBusy||running||sending||generating||probing)return;
   if(tasuOpen){cacheError=word('Close TASU before cache test');return;}
   cacheBusy=true;cdsResult=null;cacheResult=null;apiResult=null;enduranceResult=null;cacheError='';enduranceElapsed=0;enduranceRunning=true;
   try{enduranceResult=await enduranceProbe.run({progress:ms=>{enduranceElapsed=ms;}});}
   finally{cacheBusy=false;enduranceRunning=false;lastHealthPoll=0;}
  }
  async function runCdsProbe(){
   if(cacheBusy||running||sending||generating||probing||tasuOpen)return;
   cacheBusy=true;cdsResult=null;cacheResult=null;apiResult=null;enduranceResult=null;cacheError='';
   try{cdsResult=await cdsProbe.run(client.request);}catch(e){cacheError=String(e.message||e);}
   finally{cacheBusy=false;lastHealthPoll=0;}
  }
  async function generateCds(){
   if(cacheBusy||generating||running||sending)return;
   generating=true;page=1;genStatus=word('Generating CDS');
   try{
    const result=await client.request({op:'someipGenerate'},{timeoutMs:15000});
    genStatus=(result.ok?word('Generation succeeded'):word('Generation failed'))+': '+safeValue(result.stage||result.error);
    if(!result.ok&&result.error)genStatus=word('Generation failed')+': '+safeValue(result.error);
   }catch(e){genStatus=word('Generation failed')+': '+safeValue(e.message);}
   finally{generating=false;}
  }
  function exportReport(){
   page=2;
   if(!report){exportState=word('No report yet');return;}
   try{
    // Local export to OAP application data; HTTP sending is a separate manual action.
    fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n',{encoding:'utf8',mode:0o600});
    reportQr=qrReport.create(report);
    exportState=word('Exported to app data')+': '+REPORT_NAME;
    page=5;
   }catch(error){
    exportState=word('Export failed')+': '+safeValue(error.message);
    log.warn('Data Tool export: '+error.message);
   }
  }
  async function sendReport(){
   if(running||sending||!report)return;
   sending=true;page=2;sendStatus=word('Sending report');
   try{
    const received=await uploader.upload(report,ctx.dataDir);
    sendStatus=word('Report sent')+': '+received.id;
   }catch(error){
    sendStatus=word('Send failed')+': '+safeValue(error.message);
    log.warn('Data Tool report upload: '+error.message);
   }finally{sending=false;}
  }
  ui.onClick('BTN_GEN',()=>{toggleTasuIdle().catch(e=>log.warn('TASU probe: '+e));});
  ui.onClick('BTN_RUN',()=>{runTest(nextPhase).catch(error=>log.warn('Snapshot: '+error));});
  ui.onClick('BTN_SEND',()=>{sendReport().catch(error=>log.warn('Send: '+error));});
  ctx.onTab(i=>{if(i>=0&&i<pages.length){page=i;refreshButtons();}});
  // Tap-only action inside the Cache test page; existing physical bar remains untouched.
  ctx.onTap((x,y)=>{
   if(page===1&&x>=1050&&x<=1535&&y>=401&&y<=458)toggleBackgroundTest();
   if(page===6&&x>=1100&&x<=1540&&y>=145&&y<=215)runCdsProbe().catch(e=>log.warn('CDS: '+e.message));
   if(page===6&&x>=60&&x<=500&&y>=240&&y<=310)runEndurance().catch(e=>log.warn('Endurance: '+e.message));
   if(page===6&&x>=1100&&x<=1540&&y>=240&&y<=310)runApiProbe().catch(e=>log.warn('API probe: '+e.message));
   if(page===6&&x>=520&&x<=1080&&y>=240&&y<=310)
    runCacheProbe().catch(e=>log.warn('Cache probe: '+e.message));
  });
  function label(cv,text,x,y,size,color,opts){
   const val=safeValue(text);
   cv.text(val,x,y,size,color,Object.assign({literal:true},opts||{}));
  }
  function header(cv,theme,text,extra){
   label(cv,text,55,93,32,theme.text,{font:'bold'});
   if(extra)label(cv,extra,1540,93,18,theme.dim,{align:'right'});
  }
  function drawInfo(cv,theme){
   header(cv,theme,'BMRMODZ DATA TOOL','0.1.69 / '+word('Read-only'));
   G.panel(cv,theme,24,115,1552,380,null);
   label(cv,word("What's New")+' 0.1.69 — '+word('Public CDS signal test'),800,155,16,theme.dim,{align:'center'});
   // Exact required development notice on three lines.
   DEV_NOTICE.forEach((line,i)=>label(cv,line,800,190+i*40,i===0?22:23,theme.text,{align:'center'}));
   label(cv,word('Read-only diagnostic test'),800,365,27,theme.accent2,{align:'center',font:'bold'});
   label(cv,word('No vehicle controls will be activated'),800,412,20,theme.dim,{align:'center'});
   label(cv,word('Stay parked during the test'),800,461,21,theme.warn,{align:'center'});
  }
  function drawDiagnostics(cv,theme){
   const status=running?word('Running'):report?word('Completed'):word('Not tested');
   header(cv,theme,word('Diagnostics'),status+'   '+progress+'%');
   G.panel(cv,theme,24,115,1552,380,null);
   label(cv,word('Data Tool UDS only'),60,155,23,theme.accent2,{font:'bold'});
   label(cv,word('DPF and OSA reads not monitored'),60,181,17,theme.dim);
   const h=udsHealth;
   if(healthError){
    label(cv,word('Tool status unavailable'),60,230,23,theme.warn);
   }else if(!h){
    label(cv,word('Loading Tool status'),60,230,23,theme.dim);
   }else{
    const n=h.stats||{},fail=(n.error||0)+(n.timeout||0);
    label(cv,word('Successful reads')+': '+(n.ok||0)+'    '+word('Failed reads')+': '+fail+
      '    '+word('Cache hits')+': '+(n.cacheHits||0),60,221,23,theme.text);
    const last=h.lastSuccessAt?String(h.lastSuccessAt).replace('T',' ').slice(0,19):word('Never');
    label(cv,word('Last successful ECU read')+': '+last,60,259,21,theme.text);
    const age=Number.isFinite(h.sampleAgeMs)?Math.floor(h.sampleAgeMs/1000)+' s':word('Unknown');
    const fresh=h.freshness==='fresh'?word('Fresh'):h.freshness==='stale'?word('Stale'):word('Missing');
    const source=h.lastSource==='cache'?word('Cache'):h.lastSource==='ecu'?word('ECU'):word('Unknown');
    label(cv,word('Sample age')+': '+age+'    '+word('Sample status')+': '+fresh+
      '    '+word('Last source')+': '+source,60,297,20,h.freshness==='fresh'?theme.ok:theme.warn);
    label(cv,word('Last read error')+': '+(h.lastError||word('None')),60,335,20,theme.dim);
   }
   label(cv,word('Background Tool')+': '+(bgHealth?word('Running')+' / '+word('Rules')+': '+bgHealth.rules+' / '+word('Evaluation ticks')+': '+bgHealth.ticks:word('Unavailable')),60,358,17,bgHealth?theme.ok:theme.dim);
   cv.roundRect(60,366,1480,25,6,theme.track);
   cv.roundRect(60,366,Math.max(0,Math.floor(1480*progress/100)),25,6,theme.accent2);
   label(cv,String(progress)+'%',800,441,26,theme.text,{align:'center',font:'num'});
   cv.roundRect(1050,401,485,57,10,theme.track);
   label(cv,word(bgHealth&&bgHealth.testActive?'Stop BT test':'Start BT test')+' '+bgMessage,1292,437,20,theme.text,{align:'center'});
   if(bgHealth)label(cv,word('Test hits')+': '+bgHealth.testHits+' / '+word(bgHealth.connected?'ECU':'Unavailable'),60,437,20,theme.text);
   label(cv,tasuStatus||genStatus||word('Stay parked during the test'),60,474,17,theme.warn);
  }
  function drawCacheTest(cv,theme){
   header(cv,theme,word('Cache test'),word('Read-only'));
   G.panel(cv,theme,24,115,1552,380,null);
   if(!cacheResult||!cacheResult.profile){
    label(cv,word('IHKA climate reference'),800,162,24,theme.text,{align:'center',font:'bold'});
    label(cv,word('Two parallel reads and one cached read'),800,203,19,theme.dim,{align:'center'});
   }
   cv.roundRect(1100,145,440,70,12,cacheBusy?theme.track:theme.accent2);
   label(cv,word('Public CDS signal test'),1320,188,20,theme.text,{align:'center'});
   cv.roundRect(60,240,440,70,12,cacheBusy?theme.track:theme.accent2);
   label(cv,word('2 min background test'),280,285,22,theme.text,{align:'center',font:'bold'});
   cv.roundRect(520,240,560,70,12,cacheBusy?theme.track:theme.accent2);
   label(cv,word(cacheBusy?'Cache test running':'Tap to run cache test'),800,285,24,cacheBusy?theme.dim:theme.text,{align:'center',font:'bold'});
   cv.roundRect(1100,240,440,70,12,cacheBusy?theme.track:theme.accent2);
   label(cv,word('API background test'),1320,285,22,theme.text,{align:'center',font:'bold'});
   if(cdsResult){
    cdsResult.rows.forEach((r,i)=>label(cv,r.name+'  '+(r.valid?r.value+' / PASS':'FAIL'),80,335+i*29,19,r.valid?theme.ok:theme.crit));
    label(cv,'DPF: '+(cdsResult.reference?'PASS':'FAIL')+' / '+word('Demand released')+': '+(cdsResult.released?'PASS':'FAIL'),850,365,20,cdsResult.ok?theme.ok:theme.warn);
    if(cdsResult.error)label(cv,cdsResult.error,850,405,16,theme.warn);
   }else if(enduranceRunning){
    label(cv,word('Background test running')+' '+Math.floor(enduranceElapsed/1000)+'/120 s',800,370,26,theme.text,{align:'center'});
    label(cv,word('Leave Diagnostics and return after 2 min'),800,420,22,theme.dim,{align:'center'});
   }else if(enduranceResult){
    const r=enduranceResult;
    label(cv,word(r.ok?'API test PASS':'API test FAIL')+' / '+(r.engine||word('Unknown'))+' / '+Math.floor(r.elapsedMs/1000)+' s',800,335,24,r.ok?theme.ok:theme.crit,{align:'center'});
    r.fields.forEach((f,i)=>label(cv,word(f.name.toUpperCase())+'  '+(f.met?'PASS':'FAIL')+'  '+word('Sample')+': '+f.samples+'  '+word('Max interval')+': '+(f.maxGapMs/1000).toFixed(2)+' s  '+word('Stale')+': '+f.stale,800,375+i*35,22,f.met?theme.ok:theme.crit,{align:'center'}));
    label(cv,word('Demand released')+': '+word(r.released?'PASS':'FAIL')+(r.error?' / '+r.error:''),800,475,20,r.released?theme.dim:theme.warn,{align:'center'});
   }else if(apiResult){
    label(cv,word(apiResult.ok?'API test PASS':'API test FAIL')+' / '+(apiResult.engine||word('Unknown')),800,335,25,apiResult.ok?theme.ok:theme.crit,{align:'center'});
    const rows=[['API connection','connection'],['API limits','limits'],['Shared cache','shared'],['Automatic acquisition','automatic'],['Demand released','released']];
    rows.forEach(([name,key],i)=>{const x=i<3?80:850,y=375+(i%3)*35;label(cv,word(name),x,y,21,theme.text);label(cv,word(apiResult[key]===null?'SKIP':apiResult[key]?'PASS':'FAIL'),x+420,y,21,apiResult[key]===null?theme.dim:apiResult[key]?theme.ok:theme.crit);});
    label(cv,word('First valid sample')+': '+(apiResult.firstSampleMs===null?'—':(apiResult.firstSampleMs/1000).toFixed(2)+' s')+(apiResult.error?' / '+apiResult.error:''),800,489,17,apiResult.error?theme.warn:theme.text,{align:'center'});
   }else if(cacheResult&&cacheResult.profile){
    const p=cacheResult.profile,rows=Array.isArray(p.fields)?p.fields.slice(0,12):[];
    label(cv,word(cacheResult.ok?'Cache test PASS':'Cache test FAIL')+' / '+word(cacheResult.scheduler?'Scheduler test PASS':'Scheduler test FAIL'),800,162,22,cacheResult.ok&&cacheResult.scheduler?theme.ok:theme.crit,{align:'center'});
    label(cv,(p.engine||word('Unknown'))+' — '+word(p.ok?'DPF profile PASS':'DPF profile FAIL')+'  '+rows.filter(r=>r.met===true).length+'/'+rows.length+'  '+(p.elapsedMs/1000).toFixed(1)+' s',800,203,22,p.ok?theme.ok:theme.crit,{align:'center'});
    rows.forEach((r,i)=>{
     const x=i<6?80:850,y=335+(i%6)*29;
     const name=word(String(r.name).toUpperCase().replace(/_/g,' '));
     label(cv,name,x,y,20,theme.text);
     label(cv,(r.met?'PASS':'FAIL')+'  '+(r.samples>=2?(r.maxIntervalMs/1000).toFixed(2):'—')+'/'+(r.targetMs/1000)+' s',x+430,y,20,r.met?theme.ok:theme.warn);
    });
   }else if(cacheError){
    label(cv,cacheError,800,375,22,theme.warn,{align:'center'});
   }else if(cacheResult){
    label(cv,word(cacheResult.ok?'Cache test PASS':'Cache test FAIL'),800,349,26,cacheResult.ok?theme.ok:theme.crit,{align:'center',font:'bold'});
    label(cv,word('Physical ECU reads')+': '+cacheResult.physicalReads+
     '   '+word('Coalesced')+': '+cacheResult.coalesced+
     '   '+word('Cache hits')+': '+cacheResult.cacheHits,800,393,22,theme.text,{align:'center'});
    label(cv,word('Valid responses')+': '+cacheResult.validResponses+'/3   '+
     word('Third reply from cache')+': '+word(cacheResult.thirdCached?'Yes':'No'),800,427,19,theme.text,{align:'center'});
    label(cv,word(cacheResult.scheduler===true?'Scheduler test PASS':'Scheduler test FAIL'),800,470,22,cacheResult.scheduler===true?theme.ok:theme.crit,{align:'center'});
   }else{
    label(cv,word('No automatic ECU polling'),800,374,19,theme.dim,{align:'center'});
   }
  }
  function drawResults(cv,theme){
   const totals=report&&report.totals;
   const totalsText=totals?word('PASS')+': '+totals.pass+'   '+word('FAIL')+': '+totals.fail+'   '+word('SKIP')+': '+totals.skip:word('No report yet');
   header(cv,theme,word('Results'),totalsText);
   if(!report){
    G.panel(cv,theme,24,115,1552,380,null);
    label(cv,running?word('Running'):word('No report yet'),800,282,34,theme.dim,{align:'center'});
    return;
   }
   drawFocusedResults(cv,theme,report,label,word,G.panel);
   // Dedicated footer line outside both results panels (panels end at y=495).
   // Show one message at a time; never paint over the final result row.
   const footer=sendStatus||exportState;
   if(footer)label(cv,footer,800,506,16,sendStatus?theme.text:theme.warn,{align:'center'});
  }
  function drawComparison(cv,theme){
   header(cv,theme,word('DPF comparison'),word('Read-only'));
   G.panel(cv,theme,24,115,1552,380,null);
   const a=before&&before.dpfSnapshot,b=after&&after.dpfSnapshot;
   label(cv,word('Before sleep'),550,157,22,theme.accent2,{align:'right',font:'bold'});
   label(cv,word('After wake'),1090,157,22,theme.accent2,{align:'right',font:'bold'});
   const readable=(d,k)=>d&&d.ok&&d.values&&Number.isFinite(d.values[k])?
      String(d.values[k]):'--';
   const lines=[['Soot (g)','soot'],['Ash (g)','ash'],['Distance since regen (km)','since'],
     ['Average regen distance (km)','average']];
   lines.forEach(([name,key],i)=>{
    const y=212+i*56;
    label(cv,name,70,y,22,theme.text);
    label(cv,readable(a,key),550,y,26,theme.text,{align:'right',font:'num'});
    label(cv,readable(b,key),1090,y,26,theme.text,{align:'right',font:'num'});
    if(a&&b&&a.ok&&b.ok&&a.engine===b.engine){
     const av=a.values[key],bv=b.values[key];
     if(Number.isFinite(av)&&Number.isFinite(bv))
      label(cv,(bv-av>=0?'+':'')+(Math.round((bv-av)*100)/100),1510,y,23,theme.dim,{align:'right',font:'num'});
    }
   });
   const start=before?before.startedAt:'--',end=after?after.startedAt:'--';
   const engine=a&&a.engine||b&&b.engine||'--';
   label(cv,engine+' | '+word('Before sleep')+': '+start+' | '+word('After wake')+': '+end,
    800,475,16,theme.dim,{align:'center'});
  }
  function drawVehicleComparison(cv,theme){
   header(cv,theme,word('Vehicle comparison'),word('Read-only'));
   G.panel(cv,theme,24,115,1552,380,null);
   label(cv,word('Before sleep'),600,157,21,theme.accent2,{align:'right',font:'bold'});
   label(cv,word('After wake'),1090,157,21,theme.accent2,{align:'right',font:'bold'});
   const a=before&&before.vehicleSnapshot||{},b=after&&after.vehicleSnapshot||{};
   const get=(v,key)=>key.indexOf('.')<0?v[key]:(v[key.split('.')[0]]||{})[key.split('.')[1]];
   const entries=[
    ['Transmission oil (C)','transmissionOil'],
    ['Engine oil (C)','engine.oil'],
    ['Coolant (C)','engine.coolant'],
    ['Engine speed (RPM)','engine.rpm'],
    ['Footwell front left (C)','footwell.frontLeft'],
    ['Footwell front right (C)','footwell.frontRight'],
    ['Footwell rear left (C)','footwell.rearLeft'],
    ['Footwell rear right (C)','footwell.rearRight']
   ];
   entries.forEach(([name,key],i)=>{
    const y=190+i*34;
    const beforeValue=get(a,key),afterValue=get(b,key);
    label(cv,name,62,y,18,theme.text);
    label(cv,Number.isFinite(beforeValue)?String(beforeValue):'--',600,y,20,theme.text,{align:'right',font:'num'});
    label(cv,Number.isFinite(afterValue)?String(afterValue):'--',1090,y,20,theme.text,{align:'right',font:'num'});
    if(Number.isFinite(beforeValue)&&Number.isFinite(afterValue)){
     const delta=Math.round((afterValue-beforeValue)*100)/100;
     label(cv,(delta>=0?'+':'')+delta,1505,y,19,theme.dim,{align:'right',font:'num'});
    }
   });
   label(cv,word('Measurements are independent snapshots'),800,474,16,theme.dim,{align:'center'});
  }
  function drawShare(cv,theme){
   header(cv,theme,word('Share'),word('Read-only'));
   G.panel(cv,theme,24,115,1552,380,null);
   if(!reportQr){label(cv,word('No report yet'),800,265,30,theme.dim,{align:'center'});return;}
   const count=reportQr.getModuleCount(),size=Math.min(5,Math.floor(350/(count+8)));
   const grid=(count+8)*size,x=Math.floor((W-grid)/2),y=126;
   cv.fillRect(x,y,grid,grid,'#ffffff');
   for(let row=0;row<count;row++)for(let col=0;col<count;col++){
    if(reportQr.isDark(row,col))cv.fillRect(x+(col+4)*size,y+(row+4)*size,size,size,'#000000');
   }
   label(cv,word('Exported to app data'),800,490,17,theme.dim,{align:'center'});
  }
  async function render(){
   const theme=ctx.theme(),cv=ctx.canvas(W,H).clear(theme.bg);
   // Avoid retained Recorder instance overrides across frames.
   delete cv.text;
   if(page===0)drawInfo(cv,theme);
   if(page===1){
    if(Date.now()-lastHealthPoll>=2000){lastHealthPoll=Date.now();pollReadHealth().catch(e=>log.warn('Read health: '+e.message));}
    if(Date.now()-lastBgPoll>=2000){lastBgPoll=Date.now();pollBackground();}
    drawDiagnostics(cv,theme);
   }
   if(page===2)drawResults(cv,theme);
   if(page===3)drawComparison(cv,theme);
   if(page===4)drawVehicleComparison(cv,theme);
   if(page===5)drawShare(cv,theme);
   if(page===6)drawCacheTest(cv,theme);
   G.frame(cv,theme,pages.map(word),page,[]);
   return ui.image('MAIN_GFX',cv);
  }
  ctx.loop('MAIN',3,render);
  render().catch(e=>log.warn('Data Diagnostics render: '+e.message));
 }
});
