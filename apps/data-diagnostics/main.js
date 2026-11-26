'use strict';
const mgu=require('./kit/mgu'),G=require('./kit/gauges'),client=require('./client');
const {t}=require('./translations');
const cdsProbe=require('./cds-probe');
const ccTest=require('./cc-test');
const nativeFront=require('./cc-native-front');
const W=1600,H=520;
const pages=['Info','Data Tool','Background Tool','Notification Tool','CC Test'];
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
  }
  catch(e){ccResult={gear:{ok:false,stage:'error'},belts:{},errors:[String(e.message||e)]};}
  finally{ccBusy=false;}
 }
 async function pollNotification(){
  if(ntPoll)return;ntPoll=true;
  try{const h=await client.request({op:'status'},{socket:'/run/bmrmodz-notification/ctl.sock',timeoutMs:1500});ntHealth=h&&h.ok?h:null;}catch(_){ntHealth=null;}finally{ntPoll=false;}
 }
 ui.onClick('BTN_BT',()=>{toggleBackgroundTest().catch(e=>log.warn(String(e)));});
 ui.onClick('BTN_NT',()=>{testNotification().catch(e=>log.warn(String(e)));});
 ctx.onTab(i=>{if(i>=0&&i<pages.length)page=i;});
 ctx.onTap((x,y)=>{
  if(page===4&&ccResult&&!ccBusy&&x>=1080&&x<=1510&&y>=55&&y<=110){ccDetailPage=(ccDetailPage+1)%(Math.ceil(ccTest.detailLines(ccResult).length/6)+1);return;}
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
  header(cv,theme,'Info','0.1.80');
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
   label(cv,word('Stay parked during the test'),800,480,18,theme.warn,{align:'center'});
   return;
  }
  const x=ccResult||{},g=x.gear||{},belts=x.belts||{};
  row(cv,theme,'Gear selector',!ccResult?'—':g.ok&&g.selector?'PASS: '+g.selector+' / '+(g.source||'?'):'FAIL: '+(g.stage||'unknown'),150);
  ['frontLeft','frontRight','rearLeft','rearRight'].forEach((k,i)=>{
   const v=belts[k],tool=v==='latched'||v==='unlatched'?v:word('Unknown');
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
 async function render(){
  const theme=ctx.theme(),cv=ctx.canvas(W,H).clear(theme.bg),now=Date.now();delete cv.text;
  if(page===0)drawInfo(cv,theme);
  if(page===1){if(now-lastHealthPoll>=2000){lastHealthPoll=now;pollReadHealth();}drawData(cv,theme);}
  if(page===2){if(now-lastBgPoll>=2000){lastBgPoll=now;pollBackground();}drawBackground(cv,theme);}
  if(page===3){if(now-lastNtPoll>=2000){lastNtPoll=now;pollNotification();}drawNotification(cv,theme);}
  if(page===4)drawCC(cv,theme);
  G.frame(cv,theme,pages.map(word),page,[]);
  return ui.image('MAIN_GFX',cv);
 }
 ctx.loop('MAIN',3,render);render().catch(e=>log.warn(String(e)));
}}); 
