'use strict';
const fs=require('fs'),net=require('net'),path=require('path');
const front=require('./front');
const NAME='bmrmodz-cc-native.sock';
function normalizeGear(sample){
 const stage=sample&&sample.ok===true?sample.selector:null;
 return {valid:['P','R','N','D'].indexOf(stage)>=0,value:['P','R','N','D'].indexOf(stage)>=0?stage:null};
}
function create(options){
 const opts=options||{},io=opts.fs||fs,network=opts.net||net,clock=opts.now||Date.now;
 const socket=opts.socket||path.resolve(__dirname,'../../data',NAME);
 let server=null,inflight=null,previous=null,closed=false;
 async function snapshot(){
  if(previous&&clock()-previous.at<2500)return previous.value;
  if(inflight)return inflight;
  inflight=Promise.resolve().then(async()=>{
   const belt=await (opts.front||front.run)(opts.signals,opts.log);
   // Optional gearbox source must never add unsupported manifest permissions.
   const selector=opts.gear?await opts.gear(opts.signals,opts.log):{ok:false};
   const fields={
    frontLeft:belt&&belt.frontLeft||{valid:false,value:null},
    frontRight:belt&&belt.frontRight||{valid:false,value:null},
    gear:normalizeGear(selector)
   };
   const value={ok:true,op:'ccNativeSnapshot',fields};
   previous={at:clock(),value};return value;
  }).catch(()=>({ok:false,op:'ccNativeSnapshot',fields:{}})).then(x=>{inflight=null;return x;});
  return inflight;
 }
 function start(){
  if(closed||server)throw Error('Bridge already started or closed');
  const dir=path.dirname(socket),stat=io.statSync(dir);
  if(!stat.isDirectory()||((stat.mode&0o007)!==0))throw Error('Unsafe app data directory');
  try{const prior=io.lstatSync(socket);if(!prior.isSocket()||prior.uid!==(process.getuid?process.getuid():-1))throw Error('Unsafe prior socket');io.unlinkSync(socket);}catch(e){if(e.code!=='ENOENT')throw e;}
  server=network.createServer(client=>{
   client.setEncoding('utf8');client.setTimeout(15000,()=>client.destroy());
   let buffer='',handled=false;
   client.on('data',async part=>{
    if(handled)return;buffer+=String(part);
    if(buffer.length>512){handled=true;client.destroy();return;}
    const end=buffer.indexOf('\n');if(end<0)return;
    handled=true;
    let cmd;try{cmd=JSON.parse(buffer.slice(0,end));}catch(_){cmd=null;}
    if(!cmd||cmd.op!=='ccNativeSnapshot'||Object.keys(cmd).length!==1){client.end('{"ok":false,"op":"ccNativeSnapshot"}\n');return;}
    const reply=await snapshot();
    if(!client.destroyed)client.end(JSON.stringify(reply)+'\n');
   });
   client.on('error',()=>{});
  });
  server.on('error',()=>{try{server.close();}catch(_){}});
  server.listen(socket,()=>{
   try{io.chmodSync(socket,0o600);}catch(_){try{server.close();}catch(_){}}
  });
  return server;
 }
 function close(){closed=true;if(server)server.close();try{io.unlinkSync(socket);}catch(_){}}
 return {start,close,snapshot};
}
module.exports={create,normalizeGear};
