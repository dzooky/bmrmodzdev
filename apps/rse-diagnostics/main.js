'use strict';
const mgu=require('./kit/mgu'),G=require('./kit/gauges'),path=require('path');
const {load}=require('./report'),{upload}=require('./upload'),{t}=require('./translations'),{create,steps}=require('./guided');
const pages=['Info','Capture','Export'];
const notice=['This application is still in development phase and not ready for public use.','We still working on it and will be available soon.','Thank you'];
mgu.run({start(ctx){
 const {ui,log}=ctx;let page=0,busy=false,status='',id='';
 const old=load(path.join(ctx.dataDir,'rse-report.json')),session=create(path.join(ctx.dataDir,'rse-guided-012.json'));
 function capture(){if(page===1&&!busy)session.press();}
 async function send(){if(page!==2||busy||session.state!=='Complete'||id)return;busy=true;status=t('Sending');try{const r=await upload(session.report,ctx.dataDir);id=r.id;status=t('Sent');}catch(e){status=t('Failed')+': '+String(e.message).slice(0,65);}finally{busy=false;}}
 ui.onClick('BTN_CAPTURE',capture);ui.onClick('BTN_EXPORT',()=>send());
 ctx.onTab(i=>{if(i>=0&&i<pages.length)page=i;});
 ctx.onTap((x,y)=>{if(x>=520&&x<=1080&&y>=390&&y<=460){if(page===1)capture();if(page===2)send();}});
 function render(){
 session.tick();const theme=ctx.theme(),cv=ctx.canvas(1600,520).clear(theme.bg);delete cv.text;
 const label=(s,x,y,size=25,align='left')=>cv.text(String(s).slice(0,115),x,y,size,theme.text,{literal:true,align});
 const button=s=>{cv.roundRect(520,390,560,70,10,theme.accent2);label(s,800,435,24,'center');};
 G.panel(cv,theme,24,115,1552,380,null);label(t(pages[page]),55,93,32);label('0.1.2',1540,93,22,'right');
 const count=session.report.events.length,st=session.state;
 if(page===0){notice.forEach((s,i)=>label(s,800,185+i*42,24,'center'));label(t('Parked'),800,335,24,'center');label(t('Old')+': '+(old.report?old.report.events.length+'/10':t(old.state)),800,385,22,'center');}
 if(page===1){label(count+' / '+steps.length,800,155,28,'center');label(steps[count]||t('Complete'),800,205,30,'center');label(t(st),800,270,28,'center');if(st==='Ready')button(t('Ready'));if(st==='Baseline')label(Math.max(0,Math.ceil((5000-Date.now()+session.phaseAt)/1000))+' s',800,330,30,'center');if(st==='Action'){label(t('Wait'),800,325,23,'center');if(Date.now()-session.phaseAt>=5000)button(t('Confirm'));}}
 if(page===2){label(t('New')+': '+count+' / '+steps.length,800,175,28,'center');label(status,800,260,24,'center');if(id)label(id,800,320,32,'center');if(st==='Complete'&&!id&&!busy)button(t('Export'));}
 G.frame(cv,theme,pages.map(t),page,[]);return ui.image('MAIN_GFX',cv);
 }
 ctx.loop('MAIN',3,render);render().catch(e=>log.warn(String(e)));
}});
