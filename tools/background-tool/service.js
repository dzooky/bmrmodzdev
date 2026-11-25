'use strict';
const fs=require('fs'),net=require('net'),path=require('path');
const {createRuntime}=require('./runtime'),{createStore}=require('./store');
function serve({socket,state,connect}){
 const rt=createRuntime({store:createStore(state),connect,dispatch:async()=>{throw Error('Live actions disabled');}});
 let clients=0;
 const server=net.createServer(s=>{if(clients>=8){s.destroy();return;}clients++;s.on('close',()=>clients--);s.on('error',()=>s.destroy());s.setTimeout(2500,()=>s.destroy());let buf='';s.setEncoding('utf8');s.on('data',chunk=>{buf+=chunk;if(buf.length>1024){s.destroy();return;}const n=buf.indexOf('\n');if(n<0)return;let reply={ok:false,error:'READ_ONLY'};try{const req=JSON.parse(buf.slice(0,n));if(req.api===1&&req.op==='status'&&Object.keys(req).length===2)reply=rt.health();}catch(_){}s.end(JSON.stringify(reply)+'\n');});});
 server.on('error',()=>rt.close());
 server.listen(socket,()=>{fs.chmodSync(socket,0o666);rt.start();});
 return {server,close(){rt.close();server.close();}};
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
