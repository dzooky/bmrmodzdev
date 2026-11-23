'use strict';
// One-shot local Unix socket experiment on explicit diagnostics request.
// Does not contact a vehicle ECU or allow a production application.
// The returned report contains flags only; no PID, UID, path or credentials.
const fs=require('fs'),net=require('net'),os=require('os'),path=require('path');
const {createEndpoint}=require('./secure-ipc');
function request(socket,body){
 return new Promise((resolve,reject)=>{
  const c=net.createConnection(socket);let received='',settled=false;
  const done=(err,value)=>{
   if(settled)return;settled=true;c.destroy();
   if(err)reject(err);else resolve(value);
  };
  c.setTimeout(1800,()=>done(Error('Timed out')));
  c.on('connect',()=>c.write(JSON.stringify(body)+'\n'));
  c.on('data',chunk=>{received+=chunk.toString('utf8');if(received.length>2048)done(Error('Reply limit'));});
  c.on('end',()=>{try{done(null,JSON.parse(received.trim()));}catch(e){done(e);}});
  c.on('error',e=>done(e));
 });
}
async function run(){
 const result={ok:false,mode:'local-loopback-only',socketOwnerOnly:false,
  statusReceived:false,unauthorizedDenied:false,kernelCredentialsAvailable:false,
  kernelCredentialsObserved:false,applicationIdentityVerified:false,productionAccessEnabled:false};
 let dir=null,endpoint=null;
 try{
  dir=fs.mkdtempSync(path.join(os.tmpdir(),'bmrmodz-peer-probe-'));
  const socket=path.join(dir,'secure.sock');
  endpoint=createEndpoint(socket);
  await new Promise((resolve,reject)=>{
   const timeout=setTimeout(()=>reject(Error('Socket setup timeout')),2000);
   endpoint.server.once('listening',()=>{clearTimeout(timeout);setImmediate(resolve);});
   endpoint.server.once('error',e=>{clearTimeout(timeout);reject(e);});
  });
  const status=await request(socket,{op:'securityStatus',consumer:'dpf',uid:0});
  const denied=await request(socket,{op:'getData',fields:['dpf.soot'],consumer:'dpf',uid:0});
  result.socketOwnerOnly=!!(status.socket&&status.socket.present===true&&
    status.socket.mode==='0600'&&status.socket.ownerOnly===true);
  result.statusReceived=status.ok===true&&status.peerIdentityVerified===false&&
    status.productionAccessEnabled===false;
  result.unauthorizedDenied=denied.ok===false;
  result.kernelCredentialsAvailable=!!(status.peer&&status.peer.kernelCredentialsAvailable===true);
  result.kernelCredentialsObserved=!!(status.peer&&status.peer.kernelCredentialsObserved===true);
  result.ok=result.socketOwnerOnly&&result.statusReceived&&result.unauthorizedDenied;
 }catch(_){/* Always return bounded booleans; socket creation may be unsupported. */}
 finally{
  if(endpoint){try{endpoint.close();}catch(_){}}
  if(dir){try{fs.rmSync(dir,{recursive:true,force:true});}catch(_){}}
 }
 return result;
}
module.exports={run};
