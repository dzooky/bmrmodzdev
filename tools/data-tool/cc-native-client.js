'use strict';
// A single authorized OAP application's autostart Unix socket is a transport.
// The Data Tool is the only requester; no third-party sample-push endpoint.
const fs=require('fs'),net=require('net'),path=require('path');
const ROOT='/var/opt/public/oap',REG=path.join(ROOT,'oap_12201/security/uids.txt');
const ID='data-native-provider',SOCKET='bmrmodz-cc-native.sock';
function verifiedFile(io,name,maxSize,owners,stage){
 const st=io.lstatSync(name);
 if(!st.isFile()||st.isSymbolicLink()||st.size<2||st.size>maxSize||
    (st.mode&0o002)!==0||owners.indexOf(st.uid)<0)throw Error(stage||'UNTRUSTED_PACKAGE');
 return st;
}
function locate(io){
 const file=io||fs;
 try{
  verifiedFile(file,REG,65536,[0,12201],'UNTRUSTED_REGISTRY');
  const lines=String(file.readFileSync(REG,'utf8')).split('\n');
  const matches=lines.map(s=>/^(\d+)=data-native-provider$/.exec(s)).filter(Boolean);
  if(matches.length!==1)throw Error('PROVIDER_NOT_INSTALLED');
  const uid=Number(matches[0][1]);
  if(!Number.isInteger(uid)||uid<12203||uid>12450)throw Error('INVALID_PROVIDER_UID');
  const base=path.join(ROOT,'oap_'+uid),source=path.join(base,'source'),dir=path.join(base,'data');
  const st=file.lstatSync(dir);
  if(st.isSymbolicLink()||!st.isDirectory()||st.uid!==12201||st.gid!==uid||(st.mode&0o007)!==0)throw Error('UNTRUSTED_PROVIDER_DIR');
  const manifest=path.join(source,'package.json');
  verifiedFile(file,manifest,16384,[0,12201],'UNTRUSTED_PACKAGE');
  const pkg=JSON.parse(file.readFileSync(manifest,'utf8'));
  if(!pkg||pkg.name!==ID||pkg.mguAppStartType!=='autostart')throw Error('WRONG_PROVIDER_PACKAGE');
  const socket=path.join(dir,SOCKET),sock=file.lstatSync(socket);
  if(!sock.isSocket()||sock.isSymbolicLink()||sock.uid!==uid||(sock.mode&0o777)!==0o600)
   throw Error('UNTRUSTED_PROVIDER_SOCKET');
  return {ok:true,socket,uid};
 }catch(e){return {ok:false,stage:String(e&&e.message||e).slice(0,40)};}
}
const FIELDS=['frontLeft','frontRight','gear'];
function validate(reply,at){
 const out={ok:false,source:'oap-native-provider',sampledAt:null,fields:{}};
 FIELDS.forEach(k=>out.fields[k]={valid:false,value:null});
 if(!reply||reply.ok!==true||reply.op!=='ccNativeSnapshot'||!reply.fields||typeof reply.fields!=='object')
  return out;
 for(const field of FIELDS){
  const item=reply.fields[field];
  const value=item&&item.value;
  const allowed=field==='gear'?['P','R','N','D']:['latched','unlatched'];
  if(item&&item.valid===true&&allowed.indexOf(value)>=0)
   out.fields[field]={valid:true,value};
 }
 out.ok=FIELDS.some(field=>out.fields[field].valid);
 if(out.ok)out.sampledAt=new Date(at).toISOString();
 return out;
}
function create(options){
 const opts=options||{},io=opts.fs||fs,network=opts.net||net,clock=opts.now||Date.now;
 const locateProvider=opts.locate||(()=>locate(io)),timeoutMs=opts.timeoutMs||18000;
 let inflight=null,last=null;
 function snapshot(){
  if(last&&clock()-last.at<=2500)return Promise.resolve(Object.assign({cached:true},last.value));
  if(inflight)return inflight;
  inflight=new Promise(resolve=>{
   const target=locateProvider();
   if(!target||target.ok!==true){resolve({ok:false,stage:target&&target.stage||'PROVIDER_UNAVAILABLE'});return;}
   let settled=false,data='',client;
   const finish=answer=>{if(settled)return;settled=true;if(client)client.destroy();resolve(answer);};
   try{
    client=network.createConnection(target.socket);
    client.setTimeout(timeoutMs,()=>finish({ok:false,stage:'PROVIDER_TIMEOUT'}));
    client.on('connect',()=>client.write('{"op":"ccNativeSnapshot"}\n'));
    client.on('data',part=>{
     data+=String(part);
     if(data.length>4096)return finish({ok:false,stage:'INVALID_REPLY'});
     const end=data.indexOf('\n');
     if(end<0)return;
     let parsed;try{parsed=JSON.parse(data.slice(0,end));}catch(_){return finish({ok:false,stage:'INVALID_REPLY'});}
     const result=validate(parsed,clock());
     if(result.ok)last={at:clock(),value:result};
     finish(result);
    });
    client.on('error',()=>finish({ok:false,stage:'PROVIDER_DISCONNECTED'}));
    client.on('end',()=>finish({ok:false,stage:'PROVIDER_CLOSED'}));
   }catch(_){finish({ok:false,stage:'PROVIDER_UNAVAILABLE'});}
  }).then(value=>{inflight=null;return value;},error=>{inflight=null;return {ok:false,stage:'PROVIDER_ERROR'};});
  return inflight;
 }
 return {snapshot};
}
module.exports={create,locate,validate};
