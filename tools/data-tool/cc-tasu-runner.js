'use strict';
// Explicit-only subprocess boundary for service-owned native TASU access.
const cp=require('child_process'),path=require('path');
function createRunner(options){
 const opts=options||{},spawn=opts.spawn||cp.spawn;
 const worker=opts.worker||path.join(__dirname,'cc-tasu-worker.js');
 let active=false;
 return {run(){
  if(active)return Promise.resolve({ok:false,stage:'busy',accessVerified:false});
  active=true;
  return new Promise(resolve=>{
   let child,timer,finished=false,buffer='';
   function finish(out){
    if(finished)return;finished=true;active=false;clearTimeout(timer);
    if(child&&!child.killed)try{child.kill('SIGKILL');}catch(_){}
    resolve(out);
   }
   try{
    child=spawn(process.execPath,[worker,'read'],{stdio:['ignore','pipe','ignore'],env:process.env});
    timer=setTimeout(()=>finish({ok:false,stage:'timeout',accessVerified:false}),10000);
    child.stdout.setEncoding('utf8');
    child.stdout.on('data',part=>{
     buffer+=part;
     if(buffer.length>2048)return finish({ok:false,stage:'oversize',accessVerified:false});
     const end=buffer.indexOf('\n');
     if(end>=0)try{
      const value=JSON.parse(buffer.slice(0,end));
      finish(value&&typeof value.ok==='boolean'?value:{ok:false,stage:'invalid',accessVerified:false});
     }catch(_){finish({ok:false,stage:'invalid',accessVerified:false});}
    });
    child.on('error',()=>finish({ok:false,stage:'spawn',accessVerified:false}));
    child.on('exit',()=>finish({ok:false,stage:'exit',accessVerified:false}));
   }catch(_){finish({ok:false,stage:'spawn',accessVerified:false});}
  });
 }};}
module.exports={createRunner};
