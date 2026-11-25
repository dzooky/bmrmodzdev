'use strict';
const fs=require('fs'),net=require('net'),path=require('path');
const publicApi=require('./public-api'),crypto=require('crypto');
const {createRuntime}=require('./runtime'),{createStore}=require('./store');
function serve({socket,state,connect,notificationSocket='/run/bmrmodz-notification/ctl.sock',armMs=15000}){
 let testUntil=0,testHits=0,testArmAt=0,testId='',notificationAccepted=0,notificationError='';
 function notify(payload){return new Promise((resolve,reject)=>{const c=net.createConnection(notificationSocket);let raw='',done=false;const finish=(e,v)=>{if(done)return;done=true;c.destroy();if(e)reject(e);else resolve(v);};c.setTimeout(2500,()=>finish(Error('Notification timeout')));c.on('error',finish);c.on('end',()=>finish(Error('Notification closed')));c.on('connect',()=>c.write(JSON.stringify(payload)+'\n'));c.on('data',x=>{raw+=x.toString('utf8');if(raw.length>8192)return finish(Error('Reply too large'));const n=raw.indexOf('\n');if(n>=0){try{finish(null,JSON.parse(raw.slice(0,n)));}catch(e){finish(e);}}});});}
 const rt=createRuntime({store:createStore(state),connect,dispatch:async(a,k)=>{if(k==='diagnostics:reference'&&a.type==='notification'&&a.name==='kombi'&&Date.now()<testUntil){testHits++;try{const reply=await notify(Object.assign({},a.payload,{api:1,op:'showText',app:'background-test',id:testId,target:'kombi'}));if(!reply||!reply.ok||reply.status!=='queued')throw Error(reply&&reply.error||'Notification not queued');notificationAccepted++;}catch(e){notificationError=String(e.message||e);throw e;}return;}if(k==='diagnostics:reference')throw Error('Test inactive');
 const app=k.split(':')[0];if(!publicApi.appId(app))throw Error('Invalid app');
 const payload=publicApi.notification(a);const reply=await notify(Object.assign({},payload,{api:1,op:'showText',app,id:crypto.randomBytes(16).toString('hex'),target:'kombi'}));if(!reply||!reply.ok||reply.status!=='queued')throw Error(reply&&reply.error||'Notification not queued');}});
 // Never resume an experimental test after restart.
 rt.request({api:1,op:'unregister',ruleId:'reference'},'diagnostics');
 const stopTest=()=>{if(testUntil){testArmAt=0;rt.request({api:1,op:'unregister',ruleId:'reference'},'diagnostics');testUntil=0;}};
 const expiry=setInterval(()=>{try{
 if(testUntil&&Date.now()>=testUntil)stopTest();
 else if(testArmAt&&Date.now()>=testArmAt){testArmAt=0;
 rt.request({api:1,op:'register',rule:{api:1,appId:'diagnostics',ruleId:'reference',fields:[{name:'dpf.b57.request',freshnessMs:5000}],condition:{field:'dpf.b57.request',op:'gte',value:0},trigger:'once',actions:[{type:'notification',name:'kombi',payload:{durationMs:6000,ttlMs:10000,segments:[{text:'Background test: ',color:'#FFFFFF',blinkMs:0},{text:'OK',color:'#00FF00',blinkMs:500}]}}]}},'diagnostics');
 }
 }catch(e){notificationError=String(e.message||e);}},1000);
 function handle(req){
  if(!req||req.api!==1)return {ok:false,error:'INVALID_REQUEST'};
  if(Object.prototype.hasOwnProperty.call(req,'appId')){try{return publicApi.request(req,rt);}catch(e){return {ok:false,error:String(e.message||e).slice(0,180)};}}
  if(Object.keys(req).length!==2)return {ok:false,error:'INVALID_REQUEST'};
  if(req.op==='status')return Object.assign(rt.health(),{testActive:testUntil>Date.now(),testHits,testRemainingMs:Math.max(0,testUntil-Date.now()),armRemainingMs:Math.max(0,testArmAt-Date.now()),notificationAccepted,notificationError});
  if(req.op==='testStart'){
   if(testUntil>Date.now())return {ok:false,error:'TEST_ACTIVE'};
   stopTest();testHits=0;notificationAccepted=0;notificationError='';testId='bt-'+Date.now();
   testArmAt=Date.now()+armMs;testUntil=testArmAt+120000;return {ok:true};
  }
  if(req.op==='testStop'){stopTest();return {ok:true};}
  return {ok:false,error:'READ_ONLY'};
 }
 let clients=0;
 const server=net.createServer(s=>{if(clients>=8){s.destroy();return;}clients++;s.on('close',()=>clients--);s.on('error',()=>s.destroy());s.setTimeout(2500,()=>s.destroy());let buf='';s.setEncoding('utf8');s.on('data',chunk=>{buf+=chunk;if(Buffer.byteLength(buf,'utf8')>20000){s.destroy();return;}const n=buf.indexOf('\n');if(n<0)return;let reply={ok:false,error:'READ_ONLY'};try{const req=JSON.parse(buf.slice(0,n));reply=handle(req);}catch(_){}s.end(JSON.stringify(reply)+'\n');});});
 server.on('error',()=>{clearInterval(expiry);rt.close();});
 server.listen(socket,()=>{fs.chmodSync(socket,0o666);rt.start();});
 return {server,close(){clearInterval(expiry);rt.close();server.close();}};
}
if(require.main===module){
 const socket='/run/bmrmodz-background-tool/ctl.sock',state='/var/opt/bmrmodz-background-tool/rules.json';
 const {connect}=require('./data-client');
 // systemd owns the runtime directory; remove only a stale socket in that directory.
 try{if(!fs.lstatSync(socket).isSocket())throw Error('Invalid socket path');fs.unlinkSync(socket);}catch(e){if(e.code!=='ENOENT')throw e;}
 const service=serve({socket,state,connect});
 process.on('SIGTERM',()=>service.close());
}
module.exports={serve};
