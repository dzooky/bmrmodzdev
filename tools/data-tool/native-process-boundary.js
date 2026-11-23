'use strict';
// Explicit diagnostic-only native x86_64 Linux probe. NEVER used for auth.
// Standalone libc-free static ELF is an immutable, hash-checked payload.
// Decode/run ONLY on manual nativePeerProbe request. No boot-time execution.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const zlib=require('zlib'),cp=require('child_process');
const artifact=require('./process-boundary-payload');
const PAYLOAD=artifact.compressed, SHA=artifact.sha;
const out=(stage,extra)=>Object.assign({ok:false,mode:'passive-process-boundary',
  stage,unixSocket:false,kernelPeerObserved:false,
  applicationIdentityVerified:false,packageIdentityVerified:false,
  installedPackageIdentityVerified:false,processInstanceVerified:false,
  productionAccessEnabled:false,observationOnly:true},extra||{});
function unpack(){
 const code=zlib.gunzipSync(Buffer.from(PAYLOAD,'base64'));
 if(code.length>16384||code.length<128||
    code[0]!==127||code.toString('ascii',1,4)!=='ELF'||
    code[4]!==2||code[5]!==1||code.readUInt16LE(18)!==62||
    crypto.createHash('sha256').update(code).digest('hex')!==SHA)
   throw Error('Unsafe native artifact');
 return code;
}
function run(socket,directory,options){
 // Installed service may run on Node 8. No optional chaining or fs.rmSync.
 if(process.platform!=='linux'||process.arch!=='x64'||!socket||
    typeof socket.address!=='function')
   return Promise.resolve(out('unsupported'));
 let file=null,fd=null,child=null,finished=false;
 return new Promise(resolve=>{
  const opts=options||{};
  const timeoutMs=opts.timeoutMs||2000;
  let timer=null,seen='',result=out('unavailable'),exited=false,exitCode=null,stdoutEnded=false,spawned=false;
  const finish=value=>{
   if(finished)return;finished=true;
   clearTimeout(timer);
   result=value;
   if(child&&!exited&&!child.killed){try{child.kill('SIGKILL');}catch(_){}}
   if(fd!==null){try{fs.closeSync(fd);}catch(_){}fd=null;}
   if(file){try{fs.unlinkSync(file);}catch(_){}}
   resolve(result);
  };
  try{
   // Never execute in directories writable by other users.
   const dir=directory&&path.resolve(directory);
   if(!dir||!path.isAbsolute(directory))return finish(out('unsafe-directory'));
   const st=fs.statSync(dir);
   if(!st.isDirectory()||(st.mode&0o022)!==0||
      (typeof process.getuid==='function'&&st.uid!==process.getuid()))
     return finish(out('unsafe-directory'));
   const code=unpack();
   const name='boundary-'+crypto.randomBytes(8).toString('hex');
   file=path.join(dir,name);
   fd=fs.openSync(file,'wx',0o700);
   if(fs.writeSync(fd,code,0,code.length,0)!==code.length)throw Error('Short write');
   fs.fchmodSync(fd,0o700);
   fs.closeSync(fd);fd=null;
   child=(opts.spawn||cp.spawn)(file,[],{stdio:['ignore','pipe','ignore',socket]});
   // On Node 8 'close' can be delayed by the still-connected inherited FD3.
   // Observe process exit AND stdout EOF; neither waits for FD3 to close.
   const complete=()=>{
    if(finished||!exited||!stdoutEnded)return;
    let parsed=null;
    try{parsed=JSON.parse(seen.trim());}catch(_){}
    const safe=parsed&&parsed.mode==='passive-process-boundary'&&
      parsed.observationOnly===true&&parsed.installedPackageIdentityVerified===false&&
      parsed.processInstanceVerified===false&&parsed.applicationIdentityVerified===false&&
      parsed.applicationIdentityVerified===false&&
      parsed.productionAccessEnabled===false&&
      parsed.ok===true&&parsed.kernelPeerObserved===true&&exitCode===0;
    finish(safe?out('kernel-peer-observed',{ok:true,unixSocket:true,
      kernelPeerObserved:true,
      sameUidAsService:parsed.sameUidAsService===true,
      peerCgroupReadable:parsed.peerCgroupReadable===true,
      serviceCgroupReadable:parsed.serviceCgroupReadable===true,
      peerCgroupDifferentFromService:parsed.peerCgroupDifferentFromService===true,
      peerProcStatReadable:parsed.peerProcStatReadable===true,
      peerExeLinkReadable:parsed.peerExeLinkReadable===true,
      installedPackageIdentityVerified:false,processInstanceVerified:false,
      observationOnly:true}):out('kernel-peer-unavailable'));
   };
   timer=setTimeout(()=>finish(out(exited?'timeout-after-exit':
     spawned?'timeout-after-spawn':'timeout-before-spawn')),timeoutMs);
   spawned=true; // Node 8 ChildProcess does not expose a 'spawn' event.
   child.on('error',()=>finish(out('spawn-error')));
   child.stdout.on('data',chunk=>{
    seen+=String(chunk);
    if(seen.length>512)finish(out('invalid-response'));
   });
   child.stdout.on('end',()=>{stdoutEnded=true;complete();});
   child.on('exit',code=>{exited=true;exitCode=code;complete();});
  }catch(_){finish(out('unavailable'));}
 });
}
module.exports={run,unpack};
