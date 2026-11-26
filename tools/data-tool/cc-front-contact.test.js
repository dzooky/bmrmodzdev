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
 console.log('Bounded front ACSM contact framing and response tests passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
