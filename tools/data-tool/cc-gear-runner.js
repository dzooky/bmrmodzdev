'use strict';
const {spawn}=require('child_process');
const path=require('path');
function createRunner(options){
 const opts=options||{},spawnProcess=opts.spawn||spawn;
 const worker=opts.worker||path.join(__dirname,'cc-gear-worker.js');
 let busy=false;
 return {run(){
  if(busy)return Promise.resolve({ok:false,stage:'busy'});
  busy=true;
  return new Promise(resolve=>{
   let child=null,timer=null,output='',done=false;
   const finish=result=>{
    if(done)return;
    done=true;busy=false;clearTimeout(timer);
    if(child&&!child.killed)try{child.kill('SIGKILL');}catch(_){}
    resolve(result);
   };
   try{
    child=spawnProcess(process.execPath,[worker],{stdio:['ignore','pipe','ignore'],env:process.env});
    timer=setTimeout(()=>finish({ok:false,stage:'timeout'}),6500);
    child.stdout.setEncoding('utf8');
    child.stdout.on('data',chunk=>{
     output+=chunk;
     if(output.length>8192)return finish({ok:false,stage:'oversize'});
     const n=output.indexOf('\n');
     if(n>=0)try{
      const value=JSON.parse(output.slice(0,n));
      finish(value&&typeof value.ok==='boolean'?value:{ok:false,stage:'invalid'});
     }catch(_){finish({ok:false,stage:'invalid'});}
    });
    child.on('error',e=>finish({ok:false,stage:'spawn',error:String(e.message||e).slice(0,90)}));
    child.on('exit',()=>finish({ok:false,stage:'exit'}));
   }catch(e){finish({ok:false,stage:'spawn'});}
  });
 }};
}
module.exports={createRunner};
