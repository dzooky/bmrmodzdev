'use strict';
const mgu=require('./kit/mgu'),G=require('./kit/gauges'),rules=require('./cc-rules');
const {t}=require('./translations'),{upload}=require('./upload');
const fs=require('fs'),path=require('path');
mgu.run({start(ctx){
 const {ui,log}=ctx,word=k=>t(ctx.settings.get('language')||'en',k);
 const file=path.join(ctx.dataDir,'cc-rules-0213.json');
 let history=[],latest=null,busy=false,message='',localProfile=null;
 try{const x=JSON.parse(fs.readFileSync(file,'utf8'));if(Array.isArray(x))history=x.slice(-8);}catch(_){}
 const label=(cv,text,x,y,size,color,opts)=>cv.text(String(text).slice(0,105),x,y,size,color,Object.assign({literal:true},opts||{}));
 async function read(){
  busy=true;message=word('Reading status');
  try{const result=await rules.readProfile(ctx.signals);latest=result.report;localProfile=result.localProfile;history=history.concat([latest]).slice(-8);
  // Keep the latest catalog inventory only; repeated snapshots preserve timestamps and states.
  history=history.map((v,i)=>i===history.length-1?v:{at:v.at,states:v.states,discovery:{status:v.discovery.status},samples:v.samples,profile:{status:v.profile.status},readOnly:true,writeCount:0});
  try{fs.writeFileSync(file+'.tmp',JSON.stringify(history),{mode:0o600});fs.renameSync(file+'.tmp',file);message=latest.samples.piaProfileId.status;}catch(_){message=word('Report save failed');}
  }catch(_){message=word('Read failed');}finally{busy=false;}
 }
 async function send(){
  if(!history.length)return;busy=true;message=word('Sending');
  try{const r=await upload({schema:1,application:'bmrmodz-data-diagnostics',runMode:'cc-rules-catalog-0.2.13',results:[],notes:{ccRules:history}},ctx.dataDir);message=word('Report sent')+': '+r.id;}catch(e){message=word('Send failed')+': '+String(e.message||e).slice(0,55);}finally{busy=false;}
 }
 ctx.onTap((x,y)=>{if(busy||y<385||y>465)return;if(x>=90&&x<=760)read();else if(x>=840&&x<=1510)send();});
 async function render(){
  const theme=ctx.theme(),cv=ctx.canvas(1600,520).clear(theme.bg);delete cv.text;
  label(cv,word('Climate Comfort Rules'),55,93,32,theme.text,{font:'bold'});
  G.panel(cv,theme,24,115,1552,380,null);
  [['Driver seat heating','driverHeat'],['Driver seat ventilation','driverVent'],['Steering wheel heating','wheelHeat']].forEach((row,i)=>{
   label(cv,word(row[0]),90,150+i*54,26,theme.text);
   label(cv,word(latest?latest.states[row[1]]:'UNKNOWN'),1490,150+i*54,26,theme.warn,{align:'right'});
  });
  label(cv,word('Active BMW profile'),90,320,22,theme.text);
  label(cv,localProfile===null?word('UNKNOWN'):localProfile,1490,320,22,theme.warn,{align:'right'});
  label(cv,word('Profile getter only - climate rules not tested'),800,360,18,theme.dim,{align:'center'});
  [[90,'Read status'],[840,'Send report']].forEach(([x,k])=>{cv.roundRect(x,385,670,80,10,busy?theme.track:theme.accent2);label(cv,word(k),x+335,434,23,theme.text,{align:'center',font:'bold'});});
  label(cv,message+' / '+history.length+'/8',800,487,15,theme.dim,{align:'center'});
  G.frame(cv,theme,[word('Climate Comfort Rules')],0,[]);
  return ui.image('MAIN_GFX',cv);
 }
 ctx.loop('MAIN',3,render);render().catch(e=>log.warn(String(e)));
}});
