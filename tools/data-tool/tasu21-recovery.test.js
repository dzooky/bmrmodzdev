'use strict';
// Restored 0.1.35 baseline: TASU errors are terminal, never trigger speculative retries.
const assert=require('assert'),net=require('net'),os=require('os'),path=require('path');
const {serve}=require('./service');
function call(socket,req){
 return new Promise((resolve,reject)=>{
  const c=net.createConnection(socket);let buf='';
  c.on('connect',()=>c.write(JSON.stringify(req)+'\n'));
  c.on('data',d=>{buf+=d.toString();if(buf.includes('\n')){c.end();try{resolve(JSON.parse(buf.split('\n')[0]));}catch(e){reject(e);}}});
  c.on('error',reject);
 });
}
async function run(){
 let reads=0;
 const mock={ready:true,async read(){reads++;throw new Error('TASU rejected request');},close(){}};
 const socket=path.join(os.tmpdir(),'bmrmodz-tasu-baseline-'+process.pid+'.sock');
 const svc=serve(()=>mock,socket,{cdsEngine:{demand:()=>({ok:false}),snapshot:()=>({ok:false}),release:()=>({ok:true}),close(){}},generator:{run:async()=>({ok:false}),inspect:()=>({ok:false})},signalRunner:{run:async()=>({ok:false})}});
 await new Promise((r,j)=>{svc.server.once('listening',r);svc.server.once('error',j);});
 try{
  const status=await call(socket,{op:'status'});
  assert.strictEqual(status.version,'0.1.42');
  assert.strictEqual(reads,0);
  for(let i=0;i<2;i++){
   const reply=await call(socket,{op:'read',ecu:0x12,did:0xF150});
   assert.strictEqual(reply.ok,false);
   assert.strictEqual(reply.cached,undefined,'failures must not enter success cache');
   assert.strictEqual(reads,i+1,'one physical request per explicit read; no auto-retry');
  }
  assert.strictEqual((await call(socket,{op:'status'})).stats.sent,2);
 }finally{svc.close();}
 console.log('Data Tool restored TASU baseline: no implicit retry, no negative cache, passive status passed');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
