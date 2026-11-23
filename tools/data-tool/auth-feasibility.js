'use strict';
// Read-only capability survey on the running MGU service. NEVER used for
// authentication or to grant access. No process enumeration or raw paths/IDs.
const fs=require('fs'),net=require('net');
function safeRead(io,file){
 try{return String(io.readFileSync(file,'utf8')).slice(0,8192);}
 catch(_){return null;}
}
function inspect(options){
 const opts=options||{},io=opts.fs||fs,socket=opts.socket||null;
 const status=safeRead(io,'/proc/self/status');
 const cgroup=safeRead(io,'/proc/self/cgroup');
 const label=safeRead(io,'/proc/self/attr/current');
 const ns=safeRead(io,'/proc/self/ns/pid');
 const value=name=>{
  const match=status&&status.match(new RegExp('(?:^|\\n)'+name+':\\s*([^\\n]+)'));
  return match?match[1].trim():null;
 };
 const seccomp=value('Seccomp'),noNewPrivs=value('NoNewPrivs');
 // A group of observation flags. Neither SELinux nor a Linux namespace proves
 // the identity of an application connecting to this process.
 const available=!!(socket&&typeof socket.getPeerCredentials==='function');
 return {
  ok:true,mode:'passive-auth-feasibility',
  nativePeerApiAvailable:available,
  nativePeerIdentityVerified:false,
  appIdentityVerified:false,productionAccessEnabled:false,
  procStatusAccessible:status!==null,
  cgroupReadable:cgroup!==null,
  securityLabelReadable:label!==null,
  securityLabelConfinementObserved:!!(label&&label.trim()&&label.trim()!=='unconfined'&&label.trim()!=='unconfined\\n'),
  pidNamespaceLinkReadable:ns!==null,
  seccompModeObserved:seccomp==='0'||seccomp==='1'||seccomp==='2',
  seccompActive:seccomp==='1'||seccomp==='2',
  noNewPrivsObserved:noNewPrivs==='0'||noNewPrivs==='1',
  noNewPrivsEnabled:noNewPrivs==='1',
  nodeRuntimeMajor:Number(String(process.versions.node||'').split('.')[0])||null,
  safeNextStep:available?'verify-kernel-peer-and-package-boundary':'native-peer-adapter-feasibility'
 };
}
module.exports={inspect};
