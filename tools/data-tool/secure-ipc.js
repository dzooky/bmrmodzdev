'use strict';
// Secure endpoint foundation. A Unix socket's filename mode restricts who can
// connect, but a JSON consumer label is NOT an authenticated application ID.
// Until verified peer credentials and a per-app policy are available, this
// endpoint only exposes its own readiness and rejects all vehicle data calls.
const fs=require('fs'),net=require('net'),path=require('path');
const SECURE_SOCKET='/run/bmrmodz-data-tool/secure.sock';
function describe(socket,io,targetUid){
  const file=io||fs;
  try{
    const stat=file.statSync(socket);
    const mode=stat.mode&0o777;
    return {present:stat.isSocket(),mode:mode.toString(8).padStart(4,'0'),
      ownerOnly:(mode&0o077)===0,ownerUid:stat.uid,ownerGid:stat.gid,
      dacTargetUid:Number.isInteger(targetUid)?targetUid:null,
      dacOwnershipReady:Number.isInteger(targetUid)&&stat.isSocket()&&(mode&0o777)===0o600&&stat.uid===targetUid};
  }catch(_){return {present:false,mode:null,ownerOnly:false,ownerUid:null,ownerGid:null,
      dacTargetUid:Number.isInteger(targetUid)?targetUid:null,dacOwnershipReady:false};}
}
function createEndpoint(socketPath,options){
  const opts=options||{},io=opts.fs||fs;
  const socket=socketPath||SECURE_SOCKET;
  let closed=false;
  // An explicit numeric UID restricts the optional, status-only test socket via
  // kernel filesystem DAC. It does NOT authenticate peers or unlock data APIs.
  const targetUid=opts.targetUid;
  if(targetUid!==undefined&&(!Number.isSafeInteger(targetUid)||targetUid<=0))
    throw Error('Invalid experimental DAC target UID');
  io.mkdirSync(path.dirname(socket),{recursive:true});
  try{io.unlinkSync(socket);}catch(e){if(e.code!=='ENOENT')throw e;}
  const server=net.createServer(client=>{
    client.setEncoding('utf8');
    let bytes=0,responded=false,buffer='';
    client.setTimeout(3000,()=>client.destroy());
    client.on('data',chunk=>{
      if(responded)return;
      bytes+=Buffer.byteLength(chunk,'utf8');
      buffer+=chunk;
      if(bytes>4096){client.destroy();return;}
      if(!chunk.includes('\n'))return;
      responded=true;
      let payload;
      try{payload=JSON.parse(chunk.slice(0,chunk.indexOf('\n')));}catch(_){payload=null;}
      const answer=payload&&payload.op==='securityStatus'
        ? {ok:true,mode:'diagnostic-only',peerIdentityVerified:false,
          productionAccessEnabled:false,consumerAuthentication:'unavailable',
          socket:describe(socket,io,targetUid)}
        : {ok:false,error:'Secure data API unavailable until peer identity is verified'};
      client.end(JSON.stringify(answer)+'\n');
    });
  });
  // Experimental listener errors must never become unhandled exceptions in Data Tool.
  server.on('error',()=>{try{server.close();}catch(_){} });
  server.listen(socket,()=>{
    try{
      io.chmodSync(socket,0o600);
      if(targetUid!==undefined)io.chownSync(socket,targetUid,typeof process.getgid==='function'?process.getgid():0);
      const stat=describe(socket,io,targetUid);
      if(!stat.present||!stat.ownerOnly||(targetUid!==undefined&&!stat.dacOwnershipReady))
        throw Error('Experimental DAC socket permissions not enforced');
    }catch(_){server.close();}
  });
  function close(){
    if(closed)return;
    closed=true;
    server.close();
    try{io.unlinkSync(socket);}catch(_){}
  }
  return {server,close,inspect:()=>describe(socket,io,targetUid)};
}
module.exports={SECURE_SOCKET,createEndpoint,describe};
