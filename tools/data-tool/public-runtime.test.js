'use strict';
const assert=require('assert'),os=require('os'),path=require('path');
const {serve}=require('./service'),{connect}=require('./public-client');
(async()=>{
 let reads=0;
 const socket=path.join(os.tmpdir(),'bmr-public-'+process.pid+'.sock');
 const svc=serve(()=>({ready:true,async read(ecu,did){reads++;return did===0xF150?[0x62,0xF1,0x50,0x0F,0x1F,0xE8]:[0x62,did>>8,did&255,1];},close(){}}),socket);
 let a,b;
 try{
  await new Promise(r=>svc.server.once('listening',r));
  assert.strictEqual(reads,0);
  a=await connect('dpf-dev',socket);b=await connect('external',socket);
  assert.strictEqual(reads,1);
  const field='dpf.b57.request',demand={op:'demand',fields:[field],freshnessMs:{[field]:5000}};
  assert.strictEqual((await a.request(demand)).ok,true);
  assert.strictEqual((await b.request(demand)).ok,true);
  await new Promise(r=>setTimeout(r,1500));
  assert.strictEqual((await a.request({op:'snapshot'})).fields[field].raw,1);
  assert.strictEqual((await b.request({op:'snapshot'})).fields[field].raw,1);
  assert.strictEqual(reads,2);
  assert.strictEqual((await a.request({op:'read',ecu:18,did:1})).ok,false);
  a.close();b.close();
  await new Promise(r=>setTimeout(r,100));
  console.log('Public runtime: existing socket, shared automatic acquisition, passive cache PASS');
 }finally{if(a)a.close();if(b)b.close();svc.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
