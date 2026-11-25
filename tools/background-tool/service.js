'use strict';
const fs=require('fs'),net=require('net'),path=require('path');
const {createRuntime}=require('./runtime'),{createStore}=require('./store');
function serve({socket,state,connect}){
 let testUntil=0,testHits=0;
 const rt=createRuntime({store:createStore(state),connect,dispatch:async(a,k)=>{if(k==='diagnostics:reference'&&a.type==='action'&&a.name==='count'&&Date.now()<testUntil){testHits++;return;}throw Error('Live actions disabled');}});
 // Never resume an experimental test after restart.
 rt.request({api:1,op:'unregister',ruleId:'reference'},'diagnostics');
 const stopTest=()=>{if(testUntil){rt.request({api:1,op:'unregister',ruleId:'reference'},'diagnostics');testUntil=0;}};
 const expiry=setInterval(()=>{if(testUntil&&Date.now()>=testUntil)try{stopTest();}catch(_){}},1000);
 function handle(req){
  if(!req||req.api!==1||Object.keys(req).length!==2)return {ok:false,error:'INVALID_REQUEST'};
  if(req.op==='status')return Object.assign(rt.health(),{testActive:testUntil>Date.now(),testHits});
  if(req.op==='testStart'){
   if(testUntil>Date.now())return {ok:false,error:'TEST_ACTIVE'};
   stopTest();testHits=0;
   rt.request({api:1,op:'register',rule:{api:1,appId:'diagnostics',ruleId:'reference',fields:[{name:'dpf.b57.request',freshnessMs:5000}],condition:{field:'dpf.b57.request',op:'gte',value:0},trigger:'once',actions:[{type:'action',name:'count',payload:{}}]}},'diagnostics');
   testUntil=Date.now()+120000;return {ok:true};
  }
  if(req.op==='testStop'){stopTest();return {ok:true};}
  return {ok:false,error:'READ_ONLY'};
 }
 let clients=0;
 const server=net.createServer(s=>{if(clients>=8){s.destroy();return;}clients++;s.on('close',()=>clients--);s.on('error',()=>s.destroy());s.setTimeout(2500,()=>s.destroy());let buf='';s.setEncoding('utf8');s.on('data',chunk=>{buf+=chunk;if(buf.length>1024){s.destroy();return;}const n=buf.indexOf('\n');if(n<0)return;let reply={ok:false,error:'READ_ONLY'};try{const req=JSON.parse(buf.slice(0,n));reply=handle(req);}catch(_){}s.end(JSON.stringify(reply)+'\n');});});
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
