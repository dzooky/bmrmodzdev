'use strict';
// Passive local identity survey only. UID/GID are observations, not authentication.
// No /proc enumeration, privileged calls, user names, commands, or peer trust.
const fs=require('fs'),net=require('net');
function identity(options){
  const opts=options||{},processRef=opts.process||process,io=opts.fs||fs;
  const uid=typeof processRef.getuid==='function'?processRef.getuid():null;
  const gid=typeof processRef.getgid==='function'?processRef.getgid():null;
  return {uid:Number.isInteger(uid)?uid:null,gid:Number.isInteger(gid)?gid:null};
}
function inspectSocket(filename,io){
  try{
    const s=(io||fs).statSync(filename);
    return {present:s.isSocket(),mode:(s.mode&0o777).toString(8).padStart(4,'0'),
      uid:Number.isInteger(s.uid)?s.uid:null,gid:Number.isInteger(s.gid)?s.gid:null};
  }catch(_){return {present:false,mode:null,uid:null,gid:null};}
}
function inspectService(socket,options){
  const opts=options||{},proc=opts.process||process;
  return {ok:true,mode:'passive-observation',identity:identity(opts),
    diagnosticSocket:inspectSocket(socket,opts.fs),
    nodeMajor:Number.parseInt(String(proc.versions&&proc.versions.node||'').split('.')[0],10)||null,
    nativePeerCredentialMethod:typeof (opts.socketPrototype||net.Socket.prototype).getPeerCredentials==='function',
    peerIdentityVerified:false,productionAccessEnabled:false,
    note:'Self UID/GID and socket metadata are observations; client request labels are not authenticated'};
}
module.exports={identity,inspectSocket,inspectService};
