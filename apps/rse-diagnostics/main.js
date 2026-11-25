'use strict';
const mgu=require('./kit/mgu'),G=require('./kit/gauges'),fs=require('fs'),path=require('path');
const {snapshot,events}=require('./probe'),{t}=require('./translations');
const pages=['Info','Capture','Results'];
const notice=['This application is still in development phase and not ready for public use.','We still working on it and will be available soon.','Thank you'];
mgu.run({start(ctx){
 const {ui,log}=ctx;let page=0,rows=[],status='Pending',last=0;
 const report=path.join(ctx.dataDir,'rse-report.json');
 function capture(){
 if(page!==1||rows.length>=events.length||Date.now()-last<1000)return;
 last=Date.now();
 const next=rows.concat([{event:events[rows.length],at:new Date().toISOString(),observation:snapshot()}]);
 try{fs.writeFileSync(report+'.tmp',JSON.stringify({schema:1,version:'0.1.0',events:next},null,2),{mode:0o600});fs.renameSync(report+'.tmp',report);rows=next;status='Saved';}catch(e){status='Error';log.warn('RSE report save failed');}
 }
 ui.onClick('BTN_CAPTURE',capture);
 ctx.onTab(i=>{if(i>=0&&i<pages.length)page=i;});
 ctx.onTap((x,y)=>{if(page===1&&x>=520&&x<=1080&&y>=380&&y<=450)capture();});
 function render(){
 const theme=ctx.theme(),cv=ctx.canvas(1600,520).clear(theme.bg);delete cv.text;
 const label=(s,x,y,size=25,align='left')=>cv.text(String(s).slice(0,110),x,y,size,theme.text,{literal:true,align});
 G.panel(cv,theme,24,115,1552,380,null);
 label(t(pages[page]),55,93,32);label('0.1.0',1540,93,22,'right');
 if(page===0){notice.forEach((s,i)=>label(s,800,190+i*42,24,'center'));label(t('Parked'),800,365,24,'center');}
 if(page===1){label(rows.length+' / '+events.length,800,170,28,'center');label(events[rows.length]||t('Complete'),800,245,32,'center');label(t(status),800,320,24,'center');if(rows.length<events.length){cv.roundRect(520,380,560,70,10,theme.accent2);label(t('Next'),800,425,26,'center');}}
 if(page===2){const r=rows[rows.length-1];if(!r)label(t('Pending'),800,250,26,'center');else{const o=r.observation;label(r.event,85,165,28);label(t('Processes')+': '+(o.procReadable?o.processes.length:t('Unavailable')),85,215);label(o.processes.join(', ')||'—',85,255,20);label(t('Interfaces')+': '+(o.interfacesReadable?o.interfaces.join(', '):t('Unavailable')),85,305);label(t('Sockets')+': '+Object.entries(o.sockets).map(([k,v])=>k+'='+ (v===null?'?':v)).join(' '),85,355);label(t('Skipped')+': '+o.procSkipped,85,405);label(t(status),85,455);}}
 G.frame(cv,theme,pages.map(t),page,[]);return ui.image('MAIN_GFX',cv);
 }
 ctx.loop('MAIN',3,render);render().catch(e=>log.warn(String(e)));
}});
