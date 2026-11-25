'use strict';
const mgu=require('./kit/mgu'),G=require('./kit/gauges'),client=require('./client');
const {t}=require('./translations');
const W=1600,H=520;
const pages=['Info','Data Tool','Background Tool','Notification Tool'];
const DEV_NOTICE=[
 'This application is still in development phase and not ready for public use.',
 'We still working on it and will be available soon.',
 'Thank you'
];
mgu.run({start(ctx){
 const {ui,log}=ctx;
 let page=0,ntBusy=false,ntMessage='',ntCooldown=0,ntHealth=null,ntPoll=false,lastNtPoll=0;
 let bgHealth=null,bgBusy=false,lastBgPoll=0,bgCommandBusy=false,bgMessage='',bgDeadline=0;
 let udsHealth=null,healthError=false,lastHealthPoll=0,healthBusy=false;
 const word=key=>t(ctx.settings.get('language')||'en',key);
  async function testNotification(){
   if(ntBusy||Date.now()<ntCooldown)return;
   page=3;ntCooldown=Date.now()+15000;
   ntBusy=true;ntMessage=word('Sending');
   try{
    const id='test-'+Date.now();
    const opts={socket:'/run/bmrmodz-notification/ctl.sock',timeoutMs:2500};
    const a=await client.request({api:1,op:'showText',target:'kombi',app:'diagnostics',id:id+'-1',durationMs:6000,ttlMs:20000,segments:[{text:word('Notification test')+': ',color:'#FFFFFF',blinkMs:0},{text:word('Slow'),color:'#FF3030',blinkMs:1000}]},opts);
    const b=await client.request({api:1,op:'showText',target:'kombi',app:'diagnostics',id:id+'-2',durationMs:6000,ttlMs:20000,segments:[{text:word('Notification test')+': ',color:'#FFFFFF',blinkMs:0},{text:word('Fast'),color:'#00FF00',blinkMs:250}]},opts);
    ntMessage=word(a.ok&&b.ok?'Queued':'FAIL');
   }catch(_){ntMessage=word('FAIL');}finally{ntBusy=false;}
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

 async function pollNotification(){
  if(ntPoll)return;ntPoll=true;
  try{const h=await client.request({op:'status'},{socket:'/run/bmrmodz-notification/ctl.sock',timeoutMs:1500});ntHealth=h&&h.ok?h:null;}catch(_){ntHealth=null;}finally{ntPoll=false;}
 }
 ui.onClick('BTN_BT',()=>{toggleBackgroundTest().catch(e=>log.warn(String(e)));});
 ui.onClick('BTN_NT',()=>{testNotification().catch(e=>log.warn(String(e)));});
 ctx.onTab(i=>{if(i>=0&&i<pages.length)page=i;});
 ctx.onTap((x,y)=>{
  if(x>=520&&x<=1080&&y>=390&&y<=455){
   if(page===2)toggleBackgroundTest();
   if(page===3)testNotification();
  }
 });
 function label(cv,text,x,y,size,color,opts){cv.text(String(text==null?'':text).slice(0,105),x,y,size,color,Object.assign({literal:true},opts||{}));}
 function header(cv,theme,title,status){label(cv,word(title),55,93,32,theme.text,{font:'bold'});label(cv,status,1540,93,21,theme.dim,{align:'right'});G.panel(cv,theme,24,115,1552,380,null);}
 function row(cv,theme,key,value,y){label(cv,word(key),85,y,24,theme.dim);label(cv,value,1510,y,25,theme.text,{align:'right'});}
 function button(cv,theme,text,disabled){cv.roundRect(520,390,560,65,10,disabled?theme.track:theme.accent2);label(cv,text,800,430,24,theme.text,{align:'center',font:'bold'});}
 function drawInfo(cv,theme){
  header(cv,theme,'Info','0.1.70');
  DEV_NOTICE.forEach((line,i)=>label(cv,line,800,190+i*42,24,theme.text,{align:'center'}));
  label(cv,word('Stay parked during the test'),800,350,24,theme.warn,{align:'center'});
  label(cv,word('Notification Tool test'),800,410,22,theme.dim,{align:'center'});
 }
 function drawData(cv,theme){
  const h=udsHealth;header(cv,theme,'Data Tool',word(h?'Running':healthError?'Unavailable':'Loading Tool status'));
  if(!h)return;
  const n=h.stats||{};
  row(cv,theme,'Successful reads',n.ok||0,170);
  row(cv,theme,'Failed reads',(n.error||0)+(n.timeout||0),220);
  row(cv,theme,'Cache hits',n.cacheHits||0,270);
  row(cv,theme,'Sample status',word(h.freshness==='fresh'?'Fresh':h.freshness==='stale'?'Stale':'Missing'),320);
  row(cv,theme,'Sample age',Number.isFinite(h.sampleAgeMs)?Math.floor(h.sampleAgeMs/1000)+' s':word('Unknown'),370);
  row(cv,theme,'Last read error',h.lastError||word('None'),420);
  label(cv,word('Data Tool UDS only'),800,475,18,theme.dim,{align:'center'});
 }
 function drawBackground(cv,theme){
  const h=bgHealth;header(cv,theme,'Background Tool',word(h?'Running':'Unavailable'));
  if(h){
   row(cv,theme,'Rules',h.rules,170);
   row(cv,theme,'Evaluation ticks',h.ticks,220);
   row(cv,theme,'Test hits',h.testHits,270);
   const remaining=h.testActive?(bgDeadline?Math.max(0,Math.ceil((bgDeadline-Date.now())/1000))+' s':word('Unknown')):'—';
   row(cv,theme,'Remaining time',remaining,320);
  }
  button(cv,theme,word(h&&h.testActive?'Stop BT test':'Start BT test')+' '+bgMessage,bgCommandBusy);
 }
 function drawNotification(cv,theme){
  const h=ntHealth;header(cv,theme,'Notification Tool',word(h?'Running':'Unavailable'));
  if(h){
   const s=h.stats||{};
   row(cv,theme,'Queue',h.queued||0,155);
   row(cv,theme,'Accepted',s.accepted||0,200);
   row(cv,theme,'Submitted',s.submitted||0,245);
   row(cv,theme,'Failed',s.failed||0,290);
   row(cv,theme,'Expired',s.expired||0,335);
  }
  button(cv,theme,word('Test notification')+' '+ntMessage,ntBusy||Date.now()<ntCooldown);
  label(cv,word('Stay parked during the test'),800,480,18,theme.warn,{align:'center'});
 }
 async function render(){
  const theme=ctx.theme(),cv=ctx.canvas(W,H).clear(theme.bg),now=Date.now();delete cv.text;
  if(page===0)drawInfo(cv,theme);
  if(page===1){if(now-lastHealthPoll>=2000){lastHealthPoll=now;pollReadHealth();}drawData(cv,theme);}
  if(page===2){if(now-lastBgPoll>=2000){lastBgPoll=now;pollBackground();}drawBackground(cv,theme);}
  if(page===3){if(now-lastNtPoll>=2000){lastNtPoll=now;pollNotification();}drawNotification(cv,theme);}
  G.frame(cv,theme,pages.map(word),page,[]);
  return ui.image('MAIN_GFX',cv);
 }
 ctx.loop('MAIN',3,render);render().catch(e=>log.warn(String(e)));
}}); 
