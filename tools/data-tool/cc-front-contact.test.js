'use strict';
const assert=require('assert'),{HmiTransport}=require('./transport');
(async()=>{
 const t=new HmiTransport('not-started');t.ready=true;
 let sent=[];
 t.line=async request=>{
  sent.push(request);
  setImmediate(()=>t.pendingRead.consume({ecu:1,uds:[0x71,1,0xA0,0xD2,sent.length===1?1:0]}));
  return 'ok';
 };
 assert.equal(await t.readFrontContact(1),1);
 assert.equal(await t.readFrontContact(2),0);
 assert(sent[0].endsWith('f201310000020000000401a0d20100'));
 assert(sent[1].endsWith('f201310000020000000401a0d20200'));
 assert.equal(t.pendingRead,null);
 await assert.rejects(t.readFrontContact(3),/Unsupported/);
 // Match original CC behavior: preserve actual NRC byte in the error.
 t.line=async request=>{
  setImmediate(()=>t.pendingRead.consume({ecu:1,uds:[0x7F,0x31,0x22]}));
  return 'ok';
 };
 await assert.rejects(t.readFrontContact(1),/ACSM NRC 22/);
 assert.equal(t.pendingRead,null);
 t.line=async request=>{
  setImmediate(()=>t.pendingRead.consume({ecu:1,uds:[0x7F,0x31,0x33]}));
  return 'ok';
 };
 await assert.rejects(t.readFrontContact(2),/ACSM NRC 33/);
 assert.equal(t.pendingRead,null);
 t.line=async request=>{
  setImmediate(()=>t.pendingRead.consume({ecu:1,uds:[0x7F,0x22,0x31]}));
  setImmediate(()=>t.pendingRead.consume({ecu:1,uds:[0x71,1,0xA0,0xD2,0]}));
  return 'ok';
 };
 assert.equal(await t.readFrontContact(1),0);
 console.log('Bounded front ACSM contact framing and response tests passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
