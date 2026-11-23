'use strict';
// Verifies the existing read-only DDE socket contract used by DPF Status.
// This does not authenticate an application or enable production getData.
const assert=require('assert');
const os=require('os'),path=require('path'),net=require('net');
const {serve}=require('./service');
function call(socket,payload){
 return new Promise((resolve,reject)=>{
  const client=net.createConnection(socket);let raw='',done=false;
  function finish(err,value){if(done)return;done=true;client.destroy();err?reject(err):resolve(value);}
  client.setTimeout(2500,()=>finish(Error('timeout')));
  client.on('connect',()=>client.write(JSON.stringify(payload)+'\n'));
  client.on('data',chunk=>{raw+=chunk.toString();const i=raw.indexOf('\n');if(i>=0){try{finish(null,JSON.parse(raw.slice(0,i)));}catch(e){finish(e);}}});
  client.on('error',finish);
 });
}
(async()=>{
 let sends=0;
 const transport={ready:true,async read(ecu,did){sends++;await new Promise(resolve=>setTimeout(resolve,25));return [0x62,did>>8,did&255,0,0,0,1];},close(){}};
 const socket=path.join(os.tmpdir(),'bmrmodz-dpf-contract-'+process.pid+'.sock');
 const svc=serve(()=>transport,socket,{cdsEngine:{demand:()=>({ok:false}),snapshot:()=>({ok:false}),release:()=>({ok:true}),close:()=>{}},
  generator:{run:async()=>({ok:false}),inspect:()=>({ok:false})},
  signalRunner:{run:async()=>({ok:false})}});
 await new Promise((resolve,reject)=>{svc.server.once('listening',resolve);svc.server.once('error',reject);});
 try{
  const status=await call(socket,{op:'status'});
  assert.strictEqual(status.version,'0.1.38');
  assert.strictEqual(sends,0,'status must not send ECU requests');
  const did=0x44BB,ecu=0x12;
  const [one,two]=await Promise.all([call(socket,{op:'read',ecu,did}),call(socket,{op:'read',ecu,did})]);
  for(const reply of [one,two]){
   assert.strictEqual(reply.ok,true);
   assert.strictEqual(reply.ecu,ecu);
   assert.strictEqual(reply.did,did);
   assert.deepStrictEqual(reply.uds,[0x62,0x44,0xBB,0,0,0,1]);
  }
  assert.strictEqual(sends,1,'concurrent identical DPF reads must share one ECU request');
  const cached=await call(socket,{op:'read',ecu,did});
  assert.strictEqual(cached.ok,true);
  assert.strictEqual(cached.cached,true);
  assert.strictEqual(sends,1,'immediate repeat must use cache');
  const id=await call(socket,{op:'read',ecu,did:0xF150});
  assert.strictEqual(id.ok,true);
  assert.strictEqual(id.uds[0],0x62);
  assert.strictEqual(id.uds[1],0xF1);
  assert.strictEqual(id.uds[2],0x50);
  const denied=await call(socket,{op:'getData',fields:['dpf.soot']});
  assert.strictEqual(denied.ok,false,'production data broker must stay disabled');
  const controls=await call(socket,{op:'control',ecu:0x40,sid:0x2e});
  assert.strictEqual(controls.ok,false,'controls must remain unavailable');
  assert.strictEqual(sends,2);
  console.log('Data Tool 0.1.38: DPF read-only response, coalescing, caching and fail-closed control checks passed');
 }finally{svc.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
