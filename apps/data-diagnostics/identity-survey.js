'use strict';
// Local app observations only; untrusted by Data Tool for authorization.
const fs=require('fs'),net=require('net');
const SOCKET='/run/bmrmodz-data-tool/ctl.sock';
function inspect(options){
  const opts=options||{},proc=opts.process||process,io=opts.fs||fs;
  const uid=typeof proc.getuid==='function'?proc.getuid():null;
  const gid=typeof proc.getgid==='function'?proc.getgid():null;
  let socket={present:false,mode:null,uid:null,gid:null};
  try{
    const stat=io.statSync(opts.socket||SOCKET);
    socket={present:stat.isSocket(),mode:(stat.mode&0o777).toString(8).padStart(4,'0'),
      uid:Number.isInteger(stat.uid)?stat.uid:null,gid:Number.isInteger(stat.gid)?stat.gid:null};
  }catch(_){}
  return {ok:true,mode:'self-observation',uid:Number.isInteger(uid)?uid:null,
    gid:Number.isInteger(gid)?gid:null,socket,
    nativePeerCredentialMethod:typeof (opts.socketPrototype||net.Socket.prototype).getPeerCredentials==='function',
    authenticated:false};
}
module.exports={inspect};
