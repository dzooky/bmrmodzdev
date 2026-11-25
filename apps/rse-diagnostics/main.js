'use strict';
const mgu=require('./kit/mgu'),G=require('./kit/gauges'),path=require('path');
const {load,compare}=require('./report'),{upload}=require('./upload'),{t}=require('./translations');
const pages=['Info','Results','Export'];
const notice=['This application is still in development phase and not ready for public use.','We still working on it and will be available soon.','Thank you'];
mgu.run({start(ctx){
 const {ui,log}=ctx;let page=0,index=0,busy=false,status='',id='';
 const saved=load(path.join(ctx.dataDir,'rse-report.json')),r=saved.report;
 async function send(){if(page!==2||busy||!r||id)return;busy=true;status=t('Sending');try{const reply=await upload(r,ctx.dataDir);id=reply.id;status=t('Sent');}catch(e){status=t('Failed')+': '+String(e.message).slice(0,65);}finally{busy=false;}}
 ui.onClick('BTN_EXPORT',()=>send());
 ctx.onTab(i=>{if(i>=0&&i<pages.length)page=i;});
 ctx.onTap((x,y)=>{if(y<390||y>460)return;if(page===2&&x>=520&&x<=1080)send();if(page===1&&r){if(x>=85&&x<=485)index=Math.max(0,index-1);if(x>=1115&&x<=1515)index=Math.min(r.events.length-1,index+1);}});
 const list=(a,b)=>a===null||b===null?t('Unavailable'):[...a.map(x=>'+'+x),...b.map(x=>'-'+x)].join(' ')||t('Same');
 function render(){
 const theme=ctx.theme(),cv=ctx.canvas(1600,520).clear(theme.bg);delete cv.text;
 const label=(s,x,y,size=25,align='left')=>cv.text(String(s).slice(0,115),x,y,size,theme.text,{literal:true,align});
 const button=(x,w,s)=>{cv.roundRect(x,390,w,70,10,theme.accent2);label(s,x+w/2,435,24,'center');};
 G.panel(cv,theme,24,115,1552,380,null);label(t(pages[page]),55,93,32);label('0.1.1',1540,93,22,'right');
 if(page===0){notice.forEach((s,i)=>label(s,800,190+i*42,24,'center'));label(t(saved.state)+(r?' '+r.events.length+' / 10':''),800,365,26,'center');}
 if(page===1){if(!r)label(t(saved.state),800,250,26,'center');else{const d=compare(r,index);label((index+1)+' / '+r.events.length+' — '+r.events[index].event,85,160,28);label(t('Baseline'),85,200,20);label(t('Processes')+': '+list(d.processAdded,d.processRemoved),85,250,24);label(t('Interfaces')+': '+list(d.interfaceAdded,d.interfaceRemoved),85,300,24);label(t('Sockets')+': '+Object.entries(d.sockets).filter(([k,v])=>v!==0).map(([k,v])=>k+'='+(v===null?'?':v>0?'+'+v:v)).join(' ').replace(/^$/ ,t('Same')),85,350,24);button(85,400,t('Previous'));button(1115,400,t('Next'));}}
 if(page===2){label(t(saved.state)+(r?' '+r.events.length+' / 10':''),800,175,28,'center');label(status,800,260,24,'center');if(id)label(id,800,320,32,'center');if(r&&!id&&!busy)button(520,560,t('Export'));}
 G.frame(cv,theme,pages.map(t),page,[]);return ui.image('MAIN_GFX',cv);
 }
 ctx.loop('MAIN',3,render);render().catch(e=>log.warn(String(e)));
}});
