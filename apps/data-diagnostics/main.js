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
const W=1600,H=520;
const REPORT_NAME='data-tool-diagnostic-report.json';
const pages=['Info','Diagnostics','Results','DPF comparison','Vehicle comparison','Share'];
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
  let page=0,running=false,sending=false,generating=false,genStatus='',report=null,progress=0,exportState='',sendStatus='',lastResult=null,reportQr=null;
  let before=null,after=null;
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
     ['BTN_GEN','Generate CDS test'],['BTN_SEND','Send report']]){
    try{ui.text(button,word(key));}catch(_){}
   }
  }
  refreshButtons();
  ctx.settings.onChange(key=>{if(key==='language')refreshButtons();});
  async function runTest(phase){
   if(running||sending||generating)return;
   page=1;running=true;progress=0;report=null;reportQr=null;exportState='';sendStatus='';lastResult=null;
   try{
    const output=await runner.run((completed,total,item)=>{
     progress=Math.floor(100*completed/total);lastResult=item;
    },phase);
    report=output;page=2;
    if(phase==='before'){before=output;after=null;}else after=output;
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
  ui.onClick('BTN_GEN',()=>{generateCds().catch(e=>log.warn('Generate: '+e));});
  ui.onClick('BTN_RUN',()=>{runTest(nextPhase).catch(error=>log.warn('Snapshot: '+error));});
  ui.onClick('BTN_SEND',()=>{sendReport().catch(error=>log.warn('Send: '+error));});
  ctx.onTab(i=>{if(i>=0&&i<pages.length)page=i;});
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
   label(cv,item&&item.label||'',x,y,21,theme.text);
   label(cv,status==='NOT_RUN'?word('Not tested'):word(status),x+width,y,20,color,{align:'right',font:'bold'});
   if(item&&item.detail)label(cv,safeValue(item.detail),x,y+24,14,theme.dim);
  }
  function drawInfo(cv,theme){
   header(cv,theme,'BMRMODZ DATA TOOL','0.1.31 / '+word('Read-only'));
   G.panel(cv,theme,24,115,1552,380,null);
   label(cv,word("What's New")+' 0.1.31 — '+word('Visible report upload action'),800,155,16,theme.dim,{align:'center'});
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
   const latest=lastResult&&lastResult.label||word('Open Diagnostics and press Run');
   label(cv,word('Read-only diagnostic test'),60,165,25,theme.text,{font:'bold'});
   label(cv,word('No vehicle controls will be activated'),60,207,19,theme.dim);
   label(cv,word('Status')+': '+status,60,277,26,running?theme.warn:theme.text);
   label(cv,latest,60,323,22,theme.dim);
   cv.roundRect(60,366,1480,25,6,theme.track);
   cv.roundRect(60,366,Math.max(0,Math.floor(1480*progress/100)),25,6,theme.accent2);
   label(cv,String(progress)+'%',800,441,26,theme.text,{align:'center',font:'num'});
   label(cv,genStatus||word('Stay parked during the test'),60,474,17,theme.warn);
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
   const cols=[rows.slice(0,12),rows.slice(12)];
   cols.forEach((column,c)=>{
    const x=c===0?24:809, w=767;
    G.panel(cv,theme,x,115,w,380,null);
    column.forEach((item,i)=>resultLine(cv,theme,item,x+24,145+i*29,w-48));
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
   if(page===1)drawDiagnostics(cv,theme);
   if(page===2)drawResults(cv,theme);
   if(page===3)drawComparison(cv,theme);
   if(page===4)drawVehicleComparison(cv,theme);
   if(page===5)drawShare(cv,theme);
   G.frame(cv,theme,pages.map(word),page,[]);
   return ui.image('MAIN_GFX',cv);
  }
  ctx.loop('MAIN',3,render);
  render().catch(e=>log.warn('Data Diagnostics render: '+e.message));
 }
});
