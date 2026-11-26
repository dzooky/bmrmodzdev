'use strict';
// Node-compatible local client. One outstanding request; reconnect explicitly.
const net=require('net');
function connect(appId,path,scope){
 const socket=net.createConnection(path||'/run/bmrmodz-data-tool/ctl.sock');
 let pending=null,buffer='',closed=false;
 function close(){closed=true;socket.destroy();if(pending){const p=pending;pending=null;clearTimeout(p.timer);p.reject(Error('API disconnected'));}}
 socket.on('error',close);socket.on('close',close);
 socket.setEncoding('utf8');
 socket.on('data',chunk=>{
  buffer+=chunk;if(buffer.length>16384){close();return;}
  const n=buffer.indexOf(String.fromCharCode(10));if(n<0)return;
  if(!pending||n!==buffer.length-1){close();return;}
  const p=pending;pending=null;clearTimeout(p.timer);
  try{const reply=JSON.parse(buffer.slice(0,n));buffer='';p.resolve(reply);}catch(e){p.reject(e);close();}
 });
 function send(msg){return new Promise((resolve,reject)=>{
  if(closed||pending)return reject(Error('API unavailable or busy'));
  pending={resolve,reject,timer:setTimeout(close,15000)};
  socket.write(JSON.stringify(msg)+String.fromCharCode(10));
 });}
 return send(['cds','egs','ihka'].includes(scope)?{op:'apiHello',api:1,appId,scope}:{op:'apiHello',api:1,appId}).then(reply=>{
  if(!reply.ok){close();throw Error(reply.error);}
  return {request:request=>send({op:'apiRequest',request}),close};
 },e=>{close();throw e;});
}
module.exports={connect};
