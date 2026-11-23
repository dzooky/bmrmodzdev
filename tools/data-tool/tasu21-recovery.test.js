'use strict';
// Offline regression: responses are simulated. Vehicle validation is NOT claimed.
const assert=require('assert'),net=require('net'),os=require('os'),path=require('path');
const {serve}=require('./service');
function call(socket,req){
 return new Promise((resolve,reject)=>{
  const client=net.createConnection(socket);let buffer='',done=false;
  const finish=(err,value)=>{if(done)return;done=true;client.destroy();err?reject(err):resolve(value);};
  client.setTimeout(16000,()=>finish(Error('IPC timeout')));
  client.on('connect',()=>client.write(JSON.stringify(req)+'\n'));
  client.on('data',chunk=>{buffer+=chunk.toString('utf8');const e=buffer.indexOf('\n');
   if(e>=0)try{finish(null,JSON.parse(buffer.slice(0,e)));}catch(error){finish(error);}
  });
  client.on('error',finish);
 });
}
function tasu(status){const e=new Error('TASU rejected request');e.tasuStatus=status;return e;}
async function scenario(name,read,verify){
 let reads=0;
 const transport={ready:true,async read(ecu,did,trace){reads++;return read(ecu,did,trace,reads);},close(){}};
 const socket=path.join(os.tmpdir(),'bmrmodz-tasu21-'+name+'-'+process.pid+'.sock');
 const service=serve(()=>transport,socket,{
  cdsEngine:{demand:()=>({ok:false}),snapshot:()=>({ok:false}),release:()=>({ok:true}),close(){}},
  generator:{run:async()=>({ok:false}),inspect:()=>({ok:false})},
  signalRunner:{run:async()=>({ok:false})}
 });
 await new Promise((resolve,reject)=>{service.server.once('listening',resolve);service.server.once('error',reject);});
 try{
  const passive=await call(socket,{op:'status'});
  assert.strictEqual(passive.ok,true);assert.strictEqual(passive.version,'0.1.38');
  assert.strictEqual(reads,0,'status is passive, never an ECU proof');
  await verify(req=>call(socket,req),()=>reads);
 }finally{service.close();}
}
async function run(){
 const f150={op:'read',ecu:0x12,did:0xF150};
 const positive=[0x62,0xF1,0x50,0x0F,0x1F,0xE8];
 await scenario('eventual',async(ecu,did,trace,count)=>{
  assert.strictEqual(ecu,0x12);assert.strictEqual(did,0xF150);
  if(count<=2){if(trace)trace.shortStatusCodes={'33':1};throw tasu(0x21);}
  return positive;
 },async(call,readCount)=>{
  const result=await call(f150);
  assert.strictEqual(result.ok,true,'only valid positive response is success');
  assert.deepStrictEqual(result.uds,positive);
  assert.strictEqual(readCount(),3,'one initial read and two bounded retries');
  const status=await call({op:'status'});
  assert.strictEqual(status.stats.tasu21Retries,2);
  assert.strictEqual((await call(f150)).cached,true);
  assert.strictEqual(readCount(),3);
 });
 await scenario('persistent',async()=>{throw tasu(0x21);},async(call,readCount)=>{
  const reply=await call({op:'readTrace',ecu:0x12,did:0x44BB});
  assert.strictEqual(reply.ok,false,'persistent reject must remain FAIL');
  assert.strictEqual(reply.tasuStatus,0x21);
  assert.strictEqual(reply.error,'TASU rejected request');
  assert.strictEqual(reply.trace.attempts,3);
  assert.strictEqual(reply.trace.tasu21Retries,2);
  assert.strictEqual(readCount(),3,'never retry indefinitely');
 });
 await scenario('other',async()=>{throw tasu(0x31);},async(call,readCount)=>{
  const reply=await call(f150);
  assert.strictEqual(reply.ok,false);assert.strictEqual(reply.tasuStatus,0x31);
  assert.strictEqual(readCount(),1,'other TASU status must not retry');
 });
 await scenario('timeout',async()=>null,async(call,readCount)=>{
  const reply=await call(f150);
  assert.strictEqual(reply.ok,false);assert.strictEqual(reply.error,'No matching response');
  assert.strictEqual(readCount(),1,'timeout must not trigger TASU-0x21 retry');
 });
 console.log('Data Tool TASU 0x21 offline: bounded positive recovery, persistent failure, distinct statuses and passive health passed');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
