'use strict';
// Explicit diagnostic-only native x86_64 Linux probe. NEVER used for auth.
// Standalone libc-free static ELF is an immutable, hash-checked payload.
// Decode/run ONLY on manual nativePeerProbe request. No boot-time execution.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const zlib=require('zlib'),cp=require('child_process');
const PAYLOAD='H4sICB6pBGsCA3BlZXJjcmVkLXN0YXRpYwDtms1K60AUxydtdaGCEdy4qzEuBFsqIlqRSwSVCgUVRe42TabX0JiUZOKt+LUoLvMEgs8iguZJXCn4CDqZj1B7xQ9wdTm/Rf6cM/8z58CsAudivb6RUxQkyaFfiEWqwWJD5H9PZhaaW0IF+i2gPPMWUC/GGy2Kq6UilUsaDvTEsp/UO5GW2lvH+hVFvmi80aroU+3rt/NA7EH0dVQEAAAAAAAAAAAAAP8Pte6TkazplfR3upbczDNJ8qnERFdr8Z5eGR2oXd503Gb3VFeVyE7tI9y+2GNP7hUmt2NU6vG4Xo/XZG2FllZGopnuio7Op2ghtyZM4oW/o6zwikbUP/fyOP2P5ZlbrrklSXJ8gBUWwzMCAAAAAAAAAAAAwIecaH5LWyZBhGe1Q9/G2rJ2+CcqeSZxjnCpjXFQagd+A2uzWuQ5nV3famEiC1o48LC7TU1bjRAHR9iWJ2a77ToWvcT3Nm3sEYcc7+PAaTqppWm6IfXQe+3ISi2rloXDcN0zG252fjbERxPmb8wmKt4bThz9xHSoHB6EJCBmA5UJ7hBUpgUmMX/oXYYR33XIdhay/Qgud31+pS8eE7mcTGR7Elyqysf1aZx/Z66q2AOZ+KT/K7WeFIdYIgAA';
const SHA='f584ce1f9e8fcc007becc25cb8eaa6d8380d7f439a49fd5c5210ceed0378e6bc';
const out=(stage,extra)=>Object.assign({ok:false,mode:'mgu-native-peer-probe',
  stage,unixSocket:false,kernelPeerObserved:false,
  applicationIdentityVerified:false,packageIdentityVerified:false,
  productionAccessEnabled:false},extra||{});
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
  const timeoutMs=1000;
  let timer=null,seen='',result=out('unavailable');
  const finish=value=>{
   if(finished)return;finished=true;
   clearTimeout(timer);
   result=value;
   if(child&&!child.killed){try{child.kill('SIGKILL');}catch(_){}}
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
   const name='peer-'+crypto.randomBytes(8).toString('hex');
   file=path.join(dir,name);
   fd=fs.openSync(file,'wx',0o700);
   if(fs.writeSync(fd,code,0,code.length,0)!==code.length)throw Error('Short write');
   fs.fchmodSync(fd,0o700);
   fs.closeSync(fd);fd=null;
   child=cp.spawn(file,[],{stdio:['ignore','pipe','ignore',socket]});
   timer=setTimeout(()=>finish(out('timeout')),timeoutMs);
   child.on('error',()=>finish(out('unavailable')));
   child.stdout.on('data',chunk=>{
    seen+=String(chunk);
    if(seen.length>512)finish(out('invalid-response'));
   });
   child.on('close',code=>{
    if(finished)return;
    let parsed=null;
    try{parsed=JSON.parse(seen.trim());}catch(_){}
    const safe=parsed&&parsed.mode==='mgu-native-peer-probe'&&
      parsed.applicationIdentityVerified===false&&
      parsed.productionAccessEnabled===false&&
      parsed.unixSocket===true&&parsed.kernelPeerObserved===true&&code===0;
    finish(safe?out('kernel-peer-observed',{ok:true,unixSocket:true,
      kernelPeerObserved:true}):out('kernel-peer-unavailable'));
   });
  }catch(_){finish(out('unavailable'));}
 });
}
module.exports={run,unpack};
