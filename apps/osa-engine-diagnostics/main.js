'use strict';
const mgu=require('./kit/mgu'),G=require('./kit/gauges'),measure=require('./measure'),fs=require('fs'),path=require('path');
const W=1600,H=520;
const MSG={
 en:{tabs:['Info','Comparison','Report'],notice:['This application is still in development phase and not ready for public use.','We still working on it and will be available soon.','Thank you'],
 intro:'B47 / petrol / diesel - read-only Engine source comparison',hint:'Park safely, start the engine, then press Run test.',sequence:'Test order: native BMW CDS, then Data Tool CDS (not simultaneously).',
 run:'Run test',working:'Running',idle:'Not tested',saved:'Report saved locally',saveError:'Report write failed',native:'Native CDS',tool:'Data Tool CDS',oil:'Engine oil',coolant:'Coolant',rpm:'Engine RPM',status:'Status',result:'Result',file:'Local JSON report',details:'Source errors / event counts',notRun:'No measurements yet',disclaimer:'No ECU writes, no permanent background polling',notUpload:'To share: send report via vehicle logs or photograph this screen.'},
 sk:{tabs:['Info','Porovnanie','Report'],notice:['This application is still in development phase and not ready for public use.','We still working on it and will be available soon.','Thank you'],
 intro:'B47 / benzín / diesel – porovnanie zdrojov Engine',hint:'Bezpečne zaparkuj, naštartuj motor a spusti test.',sequence:'Poradie: natívne BMW CDS, potom Data Tool CDS (nie súčasne).',
 run:'Spustiť test',working:'Prebieha test',idle:'Bez testu',saved:'Report uložený lokálne',saveError:'Chyba uloženia reportu',native:'Natívne CDS',tool:'Data Tool CDS',oil:'Motorový olej',coolant:'Chladiaca kvapalina',rpm:'Otáčky motora',status:'Stav',result:'Výsledok',file:'Lokálny JSON report',details:'Chyby zdrojov / počet udalostí',notRun:'Zatiaľ bez meraní',disclaimer:'Bez zápisov do ECU, bez trvalého čítania na pozadí',notUpload:'Na odoslanie: logy vozidla alebo fotka tejto obrazovky.'}
};
const safe=v=>String(v||'').slice(0,155);
mgu.run({start(ctx){
 const {ui,log}=ctx,reportPath=path.join(ctx.dataDir,'osa-engine-diagnostics-report.json');
 let page=0,busy=false,state='',report=null;
 const lang=()=>ctx.settings.get('language')==='sk'?'sk':'en',t=()=>MSG[lang()];
 try{const x=JSON.parse(fs.readFileSync(reportPath,'utf8'));if(x.schema===1&&x.application==='osa-engine-diagnostics')report=x;}catch(_){}
 const tabs=()=>t().tabs;
 const change=i=>{page=(i+3)%3;};
 ctx.onTab(i=>{if(i>=0&&i<3)change(i);});
 ui.onClick('BTN_PAGE',()=>change(page+1));
 ui.onClick('BTN_TEST',()=>{if(!busy)run().catch(e=>{log.warn(safe(e));busy=false;state=safe(e);});});
 async function run(){
  busy=true;report=null;state=t().native;
  const startedAt=new Date().toISOString();
  const native=await measure.native(ctx.signals,log);
  state=t().tool;
  const tool=await measure.tool();
  report={schema:1,application:'osa-engine-diagnostics',version:ctx.spec.version,
   startedAt,finishedAt:new Date().toISOString(),readOnly:true,vehicleVerification:'tester-required',
   testOrder:['native','data-tool'],native,tool,comparison:measure.compare(native,tool)};
  try{
   const s=JSON.stringify(report,null,2);if(Buffer.byteLength(s)>16384)throw Error('report too large');
   fs.writeFileSync(reportPath+'.tmp',s,{mode:0o600});fs.renameSync(reportPath+'.tmp',reportPath);
   log.info('OSA_ENGINE_REPORT '+JSON.stringify({native:native.status,tool:tool.status,comparison:report.comparison}));
   state=t().saved;
  }catch(e){state=t().saveError+': '+safe(e);log.warn(state);}
  busy=false;page=1;
 }
 function line(cv,txt,x,y,size,c,opts){cv.text(safe(txt),x,y,size,c,opts||{});}
 function output(cv,theme){
  const words=t(),a=report&&report.native,b=report&&report.tool;
  line(cv,'ENGINE SOURCE COMPARISON',64,75,31,theme.text,{font:'bold'});
  if(!report){line(cv,busy?words.working+': '+state:words.notRun,65,180,28,theme.dim);return;}
  line(cv,words.native,480,135,23,theme.text,{font:'bold'});
  line(cv,words.tool,900,135,23,theme.text,{font:'bold'});
  line(cv,'DELTA',1330,135,22,theme.text,{font:'bold'});
  [['oil','°C'],['coolant','°C'],['rpm','rpm']].forEach(([key,unit],i)=>{
    const y=220+i*95,c=report.comparison[key];
    line(cv,words[key],65,y,25,theme.text);
    line(cv,c.native===null?'--':String(c.native)+' '+unit,480,y,27,c.native===null?theme.warn:theme.text);
    line(cv,c.tool===null?'--':String(c.tool)+' '+unit,900,y,27,c.tool===null?theme.warn:theme.text);
    line(cv,c.delta===null?c.state:String(c.delta)+' '+unit,1330,y,22,c.delta===null?theme.warn:theme.text);
  });
  line(cv,words.status+': '+a.status+' / '+b.status,65,495,18,theme.dim);
 }
 function details(cv,theme){
  const w=t();
  line(cv,'ENGINE DIAGNOSTIC REPORT',64,75,31,theme.text,{font:'bold'});
  if(!report){line(cv,w.notRun,64,160,26,theme.dim);return;}
  line(cv,w.file+': osa-engine-diagnostics-report.json',64,135,21,theme.text);
  line(cv,'Native: '+report.native.status+' | available='+report.native.available+' | subscribed='+report.native.subscribed,64,195,21,theme.text);
  line(cv,'Tool: '+report.tool.status+' | active='+report.tool.available+' | demand='+report.tool.subscribed,64,239,21,theme.text);
  line(cv,'Native errors: '+safe(report.native.errors.join('; ')||'none'),64,292,20,theme.warn);
  line(cv,'Tool errors: '+safe(report.tool.errors.join('; ')||'none'),64,338,20,theme.warn);
  line(cv,'Tool invalid: '+safe(report.tool.invalid.join(',')||'none'),64,384,20,theme.text);
  line(cv,w.notUpload,64,468,18,theme.dim);
 }
 function render(){
  const theme=ctx.theme(),cv=ctx.canvas(W,H).clear(theme.bg),w=t();
  if(page===0){
   line(cv,'OSA ENGINE DIAGNOSTICS',64,68,31,theme.text,{font:'bold'});
   w.notice.forEach((s,i)=>line(cv,s,75,130+i*48,20,theme.warn));
   line(cv,w.intro,64,315,24,theme.text);
   line(cv,w.hint,64,358,22,theme.text);
   line(cv,w.sequence,64,403,20,theme.dim);
   line(cv,w.disclaimer,64,465,18,theme.dim);
  }else if(page===1)output(cv,theme);else details(cv,theme);
  G.frame(cv,theme,tabs(),page,[]);
  return ui.image('MAIN_GFX',cv);
 }
 ctx.loop('MAIN',3,render);
 render().catch(e=>log.warn('OSA Engine render: '+safe(e)));
}});
