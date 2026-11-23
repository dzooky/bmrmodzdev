'use strict';
// One-shot local Unix socket experiment on explicit diagnostics request.
// Does not contact a vehicle ECU or allow a production application.
// The returned report contains flags only; no PID, UID, path or credentials.
const fs=require('fs'),net=require('net'),crypto=require('crypto'),path=require('path');
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
async function run(options){
 const opts=options||{};
 const result={ok:false,mode:'local-loopback-only',socketOwnerOnly:false,
  statusReceived:false,unauthorizedDenied:false,kernelCredentialsAvailable:false,
  kernelCredentialsObserved:false,applicationIdentityVerified:false,productionAccessEnabled:false,
  failureStage:'not-run',failureCode:'none'};
 let socket=null,endpoint=null,stage='choose-socket-path';
 try{
  // Use the already-working Data Tool runtime socket directory. On MGU the
  // configured TMPDIR may be a long path or have separate Unix bind policy.
  // Keep the test filename short and never replace or alter ctl.sock.
  const directory=opts.socketDirectory;
  if(typeof directory!=='string'||!path.isAbsolute(directory)||
     !fs.statSync(directory).isDirectory())throw Error('Missing runtime socket directory');
  socket=path.join(directory,'peer-'+crypto.randomBytes(6).toString('hex')+'.sock');
  if(Buffer.byteLength(socket)>95||fs.existsSync(socket))throw Error('Socket path unsuitable');
  stage='listen';
  endpoint=createEndpoint(socket);
  await new Promise((resolve,reject)=>{
   const timeout=setTimeout(()=>reject(Error('Socket setup timeout')),2000);
   endpoint.server.once('listening',()=>{clearTimeout(timeout);setImmediate(resolve);});
   endpoint.server.once('error',e=>{clearTimeout(timeout);reject(e);});
  });
  stage='security-status';
  const status=await request(socket,{op:'securityStatus',consumer:'dpf',uid:0});
  stage='unauthorized-request';
  const denied=await request(socket,{op:'getData',fields:['dpf.soot'],consumer:'dpf',uid:0});
  result.socketOwnerOnly=!!(status.socket&&status.socket.present===true&&
    status.socket.mode==='0600'&&status.socket.ownerOnly===true);
  result.statusReceived=status.ok===true&&status.peerIdentityVerified===false&&
    status.productionAccessEnabled===false;
  result.unauthorizedDenied=denied.ok===false;
  result.kernelCredentialsAvailable=!!(status.peer&&status.peer.kernelCredentialsAvailable===true);
  result.kernelCredentialsObserved=!!(status.peer&&status.peer.kernelCredentialsObserved===true);
  result.ok=result.socketOwnerOnly&&result.statusReceived&&result.unauthorizedDenied;
  result.failureStage=!result.statusReceived?'security-status':
    !result.socketOwnerOnly?'socket-permissions':
    !result.unauthorizedDenied?'unauthorized-request':'none';
 }catch(error){
  // Allow only a fixed set of non-identifying error categories in reports.
  const code=error&&error.code;
  result.failureStage=stage;
  result.failureCode=['EACCES','EPERM','ENOENT','EADDRINUSE','ENAMETOOLONG','EOPNOTSUPP','EINVAL','EIO'].indexOf(code)>=0?code:
    error&&error.message==='Socket setup timeout'?'TIMEOUT':'OTHER';
 }
 finally{
  if(endpoint){try{endpoint.close();}catch(_){}}
  // Only remove the uniquely named probe socket, never the service directory.
  if(socket){try{fs.unlinkSync(socket);}catch(_){} }
 }
 return result;
}
module.exports={run};
