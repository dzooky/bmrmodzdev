'use strict';
// Data Tool Diagnostics: display-only client for the independent Data Tool.
// No TASU or vehicle signal declarations; only Unix-socket service requests.
const fs=require('fs'),path=require('path');
const mgu=require('./kit/mgu');
const G=require('./kit/gauges');
const client=require('./client');
const {createRunner,STEPS}=require('./test-runner');
const {t}=require('./translations');
const qrReport=require('./qr-report');
const uploader=require('./upload');
const cacheProbe=require('./cache-probe');
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
  let cacheBusy=false,cacheResult=null,cacheError='';
  let before=null,after=null;
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
   if(running||sending||generating||probing)return;
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
   if(probing||running||sending||generating)return;
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
   cacheBusy=true;cacheResult=null;cacheError='';
   try{cacheResult=await cacheProbe.run(client.request);}
   catch(_){cacheError=word('Cache test could not complete');}
   finally{cacheBusy=false;lastHealthPoll=0;}
  }
  async function generateCds(){
   if(generating||running||sending)return;
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
  function resultLine(cv,theme,item,x,y,width){
   const status=item&&item.status||'NOT_RUN';
   const color=status==='PASS'?theme.ok:status==='FAIL'?theme.crit:theme.dim;
   label(cv,item&&item.label||'',x,y,18,theme.text);
   label(cv,status==='NOT_RUN'?word('Not tested'):word(status),x+width,y,18,color,{align:'right',font:'bold'});
   if(item&&item.detail)label(cv,safeValue(item.detail),x,y+19,12,theme.dim);
  }
  function drawInfo(cv,theme){
   header(cv,theme,'BMRMODZ DATA TOOL','0.1.54 / '+word('Read-only'));
   G.panel(cv,theme,24,115,1552,380,null);
   label(cv,word("What's New")+' 0.1.54 — '+word('Restored manual process boundary survey'),800,155,16,theme.dim,{align:'center'});
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
   cv.roundRect(60,366,1480,25,6,theme.track);
   cv.roundRect(60,366,Math.max(0,Math.floor(1480*progress/100)),25,6,theme.accent2);
   label(cv,String(progress)+'%',800,441,26,theme.text,{align:'center',font:'num'});
   label(cv,tasuStatus||genStatus||word('Stay parked during the test'),60,474,17,theme.warn);
  }
  function drawCacheTest(cv,theme){
   header(cv,theme,word('Cache test'),word('Read-only'));
   G.panel(cv,theme,24,115,1552,380,null);
   label(cv,word('IHKA climate reference'),800,162,24,theme.text,{align:'center',font:'bold'});
   label(cv,word('Two parallel reads and one cached read'),800,203,19,theme.dim,{align:'center'});
   cv.roundRect(520,240,560,70,12,cacheBusy?theme.track:theme.accent2);
   label(cv,word(cacheBusy?'Cache test running':'Tap to run cache test'),800,285,24,cacheBusy?theme.dim:theme.text,{align:'center',font:'bold'});
   if(cacheResult){
    label(cv,word(cacheResult.ok?'Cache test PASS':'Cache test FAIL'),800,349,26,cacheResult.ok?theme.ok:theme.crit,{align:'center',font:'bold'});
    label(cv,word('Physical ECU reads')+': '+cacheResult.physicalReads+
     '   '+word('Coalesced')+': '+cacheResult.coalesced+
     '   '+word('Cache hits')+': '+cacheResult.cacheHits,800,393,22,theme.text,{align:'center'});
    label(cv,word('Valid responses')+': '+cacheResult.validResponses+'/3   '+
     word('Third reply from cache')+': '+word(cacheResult.thirdCached?'Yes':'No'),800,427,19,theme.text,{align:'center'});
    if(!cacheResult.ok)label(cv,word('Outcome')+': '+cacheResult.outcome,800,470,18,theme.warn,{align:'center'});
   }else if(cacheError){
    label(cv,cacheError,800,375,22,theme.warn,{align:'center'});
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
   const rows=STEPS.map(step=>report.results.find(r=>r.id===step.id)||{label:step.label});
   const cols=[rows.slice(0,14),rows.slice(14)];
   cols.forEach((column,c)=>{
    const x=c===0?24:809, w=767;
    G.panel(cv,theme,x,115,w,380,null);
    column.forEach((item,i)=>resultLine(cv,theme,item,x+24,145+i*27,w-48));
   });
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
