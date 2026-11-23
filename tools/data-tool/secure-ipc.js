'use strict';
// Secure endpoint foundation. A Unix socket's filename mode restricts who can
// connect, but a JSON consumer label is NOT an authenticated application ID.
// Until verified peer credentials and a per-app policy are available, this
// endpoint only exposes its own readiness and rejects all vehicle data calls.
const fs=require('fs'),net=require('net'),path=require('path');
const SECURE_SOCKET='/run/bmrmodz-data-tool/secure.sock';
function describe(socket,io){
  const file=io||fs;
  try{
    const stat=file.statSync(socket);
    const mode=stat.mode&0o777;
    return {present:stat.isSocket(),mode:mode.toString(8).padStart(4,'0'),
      ownerOnly:(mode&0o077)===0};
  }catch(_){return {present:false,mode:null,ownerOnly:false};}
}
function createEndpoint(socketPath,options){
  const opts=options||{},io=opts.fs||fs;
  const socket=socketPath||SECURE_SOCKET;
  let closed=false;
  io.mkdirSync(path.dirname(socket),{recursive:true});
  try{io.unlinkSync(socket);}catch(e){if(e.code!=='ENOENT')throw e;}
  const server=net.createServer(client=>{
    client.setEncoding('utf8');
    let bytes=0,responded=false;
    client.setTimeout(3000,()=>client.destroy());
    client.on('data',chunk=>{
      if(responded)return;
      bytes+=Buffer.byteLength(chunk,'utf8');
      if(bytes>4096){client.destroy();return;}
      if(!chunk.includes('\n'))return;
      responded=true;
      let payload;
      try{payload=JSON.parse(chunk.slice(0,chunk.indexOf('\n')));}catch(_){payload=null;}
      const answer=payload&&payload.op==='securityStatus'
        ? {ok:true,mode:'diagnostic-only',peerIdentityVerified:false,
          productionAccessEnabled:false,consumerAuthentication:'unavailable',
          socket:describe(socket,io)}
        : {ok:false,error:'Secure data API unavailable until peer identity is verified'};
      client.end(JSON.stringify(answer)+'\n');
    });
  });
  server.listen(socket,()=>{
    try{
      io.chmodSync(socket,0o600);
      const stat=describe(socket,io);
      if(!stat.present||!stat.ownerOnly)throw Error('Secure socket permissions not enforced');
    }catch(_){server.close();}
  });
  function close(){
    if(closed)return;
    closed=true;
    server.close();
    try{io.unlinkSync(socket);}catch(_){}
  }
  return {server,close,inspect:()=>describe(socket,io)};
}
module.exports={SECURE_SOCKET,createEndpoint,describe};
