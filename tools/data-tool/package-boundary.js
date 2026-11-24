'use strict';
// Diagnostic only. No caller-supplied PID, path, UID or package ID is accepted.
// The helper's private binary stdout stays inside the service. Only fixed
// observations leave this module; they are NEVER an authorization attestation.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),zlib=require('zlib'),cp=require('child_process');
const PAYLOAD='H4sIAAAAAAAC/6t39XFjYmRkgAEmBjsGME/AAcx3gIqfEIArAYpZMDADSRYgCVLLwoAMHFDoF1AejGaAmgPSx4rEh9kHo3ugwj1o+gKflqSwMRAPBBhGwSgYBaNgFIyCUTAKRsEoGAWjYBSMglEQbHjA8JLjTlB3fD8zkPDpPOfRG6PyxaPTReWLT6+Lyocd5kDhzhCVP56dt3YJAtnHgYI8QJqfdT8TkPJoPVBq2FwDFCvVAlJfGOqUXQ0vuRoe8Ok84dN53qPz3i6IasP/Hs0/eBz4px73YPxv+A2iaIcNyIjOT/ysr/+5OztbKWi4pCZlJuYpGJroGekZ6BpaakKZDAx6xRnFJUUliUkMeiWpFSUMesn5ubmpeSXUCAdu6JgEfGwBPh6BNg7BgBi/QAaCUDEDNPEeqH55HPqRaWYs7loN1S9FwH4AhjpcQsgRAAA=';
const SHA='37f2da772f05f2725456781b0d8020d8fb924dbeee8ce8420a195e2e28695340';
const packages=['data-diagnostics','dpf-dev'];
function out(stage,extra){return Object.assign({ok:false,stage,observationOnly:true,
 packageIdentityVerified:false,productionAccessEnabled:false,layout:false,uidMatches:false,
 sourceProtected:false,candidate:'unknown',processStable:false,protectionReason:'unknown'},extra||{});}
function unpack(){
 const code=zlib.gunzipSync(Buffer.from(PAYLOAD,'base64'));
 if(code.length<128||code.length>16384||code[0]!==127||code.toString('ascii',1,4)!=='ELF'||
  code[4]!==2||code[5]!==1||code.readUInt16LE(18)!==62||
  crypto.createHash('sha256').update(code).digest('hex')!==SHA)throw Error('Unsafe package survey artifact');
 return code;
}
function processSample(io,pid){
 const base='/proc/'+pid;
 const stat=String(io.readFileSync(base+'/stat','utf8'));
 const close=stat.lastIndexOf(')');
 if(close<0)return null;
 const start=stat.slice(close+1).trim().split(/\s+/)[19];
 const status=String(io.readFileSync(base+'/status','utf8'));
 const match=status.match(/^Uid:\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*$/m);
 const cwd=String(io.readlinkSync(base+'/cwd'));
 if(!start||!/^\d+$/.test(start)||!match||cwd.length>1024||
  !path.isAbsolute(cwd)||path.resolve(cwd)!==cwd||/[\x00-\x1f]/.test(cwd)||cwd.endsWith(' (deleted)'))return null;
 return {start,uid:Number(match[2]),cwd};
}
function directoryReason(io,dir){
 // Same strict policy as 0.1.45. Report the first failing category only.
 let current='/';
 const parts=dir.split('/').filter(Boolean);
 for(const part of [''].concat(parts)){
  if(part)current=path.join(current,part);
  const kind=current===dir?'source':current===path.dirname(dir)?'app-root':'ancestor';
  let st;try{st=io.lstatSync(current);}catch(_){return kind+'-stat';}
  if(st.isSymbolicLink())return kind+'-symlink';
  if(!st.isDirectory())return kind+'-type';
  if(st.uid!==0)return kind+'-owner';
  if((st.mode&0o022)!==0)return kind+'-write';
 }
 return 'protected';
}
function packageCandidate(io,dir){
 const source=path.join(dir,'source');
 let fd=null,stage='manifest-stat';
 const blocked=reason=>({sourceProtected:false,candidate:'unknown',protectionReason:reason});
 try{
  const reason=directoryReason(io,source);
  if(reason!=='protected')return blocked(reason);
  const filename=path.join(source,'package.json');
  const before=io.lstatSync(filename);
  if(before.isSymbolicLink())return blocked('manifest-symlink');
  if(!before.isFile())return blocked('manifest-type');
  if(before.uid!==0)return blocked('manifest-owner');
  if((before.mode&0o022)!==0)return blocked('manifest-write');
  if(before.size<2||before.size>16384)return blocked('manifest-size');
  if(typeof fs.constants.O_NOFOLLOW!=='number'||typeof fs.constants.O_NONBLOCK!=='number')
   return blocked('open-flags');
  stage='manifest-open';
  fd=io.openSync(filename,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW|fs.constants.O_NONBLOCK);
  stage='manifest-changed';
  const st=io.fstatSync(fd);
  if(!st.isFile()||st.uid!==0||(st.mode&0o022)!==0||st.dev!==before.dev||st.ino!==before.ino||
     st.size!==before.size)return blocked(stage);
  stage='manifest-read';
  const buf=Buffer.alloc(st.size+1);let used=0;
  while(used<buf.length){const n=io.readSync(fd,buf,used,buf.length-used,null);if(n===0)break;used+=n;}
  if(used!==st.size)return blocked(stage);
  let value;try{value=JSON.parse(buf.toString('utf8',0,used));}catch(_){return {sourceProtected:true,candidate:'unknown',protectionReason:'manifest-invalid'};}
  return {sourceProtected:true,candidate:value&&packages.includes(value.name)?value.name:'unknown',protectionReason:'protected'};
 }catch(_){return blocked(stage);}
 finally{if(fd!==null)try{io.closeSync(fd);}catch(_){}}
}
function inspectPeer(peer,io){
 const f=io||fs;
 if(!peer||!Number.isSafeInteger(peer.pid)||peer.pid<=0||!Number.isSafeInteger(peer.uid)||peer.uid<0)
  return out('invalid-peer');
 try{
  const first=processSample(f,peer.pid);
  if(!first||first.uid!==peer.uid)return out('peer-unavailable');
  const root=path.dirname(first.cwd),name=path.basename(root);
  const layout=path.basename(first.cwd)==='data'&&/^oap_[A-Za-z0-9_-]{1,64}$/.test(name);
  const uidMatches=layout&&name==='oap_'+peer.uid;
  const candidate=layout?packageCandidate(f,root):{sourceProtected:false,candidate:'unknown',protectionReason:'layout-unavailable'};
  const last=processSample(f,peer.pid);
  if(!last||first.start!==last.start||first.uid!==last.uid||first.cwd!==last.cwd)
   return out('peer-changed');
  return out('observed',{ok:true,layout,uidMatches,sourceProtected:candidate.sourceProtected,
   candidate:candidate.candidate,processStable:true,protectionReason:candidate.protectionReason});
 }catch(_){return out('peer-unavailable');}
}
let active=false;
function run(socket,directory,options){
 if(process.platform!=='linux'||process.arch!=='x64'||!socket||typeof socket.address!=='function')
  return Promise.resolve(out('unsupported'));
 if(active)return Promise.resolve(out('busy'));
 active=true;
 return new Promise(resolve=>{
  let file=null,fd=null,child=null,timer=null,finished=false,exited=false,stdoutEnded=false,exitCode=null;
  let chunks=[],bytes=0;
  const opts=options||{};
  const finish=value=>{
   if(finished)return;finished=true;active=false;clearTimeout(timer);
   if(child&&!exited&&!child.killed)try{child.kill('SIGKILL');}catch(_){}
   if(fd!==null)try{fs.closeSync(fd);}catch(_){}
   if(file)try{fs.unlinkSync(file);}catch(_){}
   resolve(value);
  };
  const complete=()=>{
   if(finished||!exited||!stdoutEnded)return;
   if(exitCode!==0||bytes!==12)return finish(out('kernel-peer-unavailable'));
   const data=Buffer.concat(chunks,12);
   const result=inspectPeer({pid:data.readInt32LE(0),uid:data.readUInt32LE(4)});
   chunks=[];data.fill(0);
   finish(result);
  };
  try{
   if(!directory||!path.isAbsolute(directory))return finish(out('unsafe-directory'));
   const dir=path.resolve(directory),st=fs.lstatSync(dir);
   if(!st.isDirectory()||st.isSymbolicLink()||(st.mode&0o022)!==0||st.uid!==process.getuid())
    return finish(out('unsafe-directory'));
   const code=unpack();
   file=path.join(dir,'package-peer-'+crypto.randomBytes(8).toString('hex'));
   fd=fs.openSync(file,'wx',0o700);
   if(fs.writeSync(fd,code,0,code.length,0)!==code.length)throw Error('Short write');
   fs.fchmodSync(fd,0o700);fs.closeSync(fd);fd=null;
   child=(opts.spawn||cp.spawn)(file,[],{stdio:['ignore','pipe','ignore',socket]});
   timer=setTimeout(()=>finish(out('timeout')),2000);
   child.on('error',()=>finish(out('spawn-error')));
   child.stdout.on('data',chunk=>{bytes+=chunk.length;if(bytes>12)return finish(out('invalid-response'));chunks.push(chunk);});
   child.stdout.on('end',()=>{stdoutEnded=true;complete();});
   child.on('exit',code=>{exited=true;exitCode=code;complete();});
  }catch(_){finish(out('unavailable'));}
 });
}
module.exports={run,unpack,inspectPeer};
