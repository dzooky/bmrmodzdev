'use strict';
// Isolated read-only trace tests. No hmictl process or vehicle connection.
const assert=require('assert');
const {HmiTransport,decode,frameIssue,shortEnvelope}=require('./transport');
const ecu=0x12,did=0x44BB;
function fake(schedule){
  const transport=new HmiTransport('/not-used');
  transport.ready=true;
  transport.line=async()=>{setImmediate(()=>schedule(transport));return 'ok';};
  return transport;
}
async function main(){
  // Frame taxonomy is read-only; no payload is stored in the diagnostic report.
  const examples=[
    [undefined,'missing'],['','missing'],['zzzzzzzz000000000000','nonHex'],
    ['0000000900000000000','oddLength'],['00000009','shortFrame'],
    ['00000008000000000000000000','shortHeader'],
    ['00000012000000000000000000','lengthOverflow'],
    ['00000009000000000000000000',null]
  ];
  for(const [hex,reason] of examples){
    assert.strictEqual(frameIssue(hex),reason);
    if(reason!==null)assert.strictEqual(decode(hex),null);
  }

  // Distinguish a short TASU reject marker from an unknown short envelope.
  const shortReject='00000008'+Buffer.from([0xf0,0xf2,0x7f,0,0,0,0,0]).toString('hex');
  const shortUnknown='00000008'+Buffer.from([0xf0,0xf2,0x20,0,0,0,0,0]).toString('hex');
  const shortTruncated='00000008'+Buffer.from([0xf0,0xf2,0x7f,0,0,0,0]).toString('hex');
  assert.deepStrictEqual(shortEnvelope(shortReject),
    {rejectMarker:true,statusCode:0,lengthConsistent:true,lengthBand:'5-8'});
  assert.deepStrictEqual(shortEnvelope(shortUnknown),
    {rejectMarker:false,statusCode:null,lengthConsistent:true,lengthBand:'5-8'});
  assert.deepStrictEqual(shortEnvelope(shortTruncated),
    {rejectMarker:true,statusCode:0,lengthConsistent:false,lengthBand:'5-8'});
  assert.strictEqual(shortEnvelope('00000009000000000000000000'),null);
  const rejectWithCode='00000008'+Buffer.from([0xF0,0xF2,0x7F,0,0x31,0,0,0]).toString('hex');
  assert.strictEqual(shortEnvelope(rejectWithCode).statusCode,0x31);
  assert.strictEqual(shortEnvelope(shortReject).statusCode,0);
  assert.strictEqual(shortEnvelope(shortUnknown).statusCode,null);
  const noCode='00000004'+Buffer.from([0xF0,0xF2,0x7F,0]).toString('hex');
  assert.strictEqual(shortEnvelope(noCode).statusCode,null);
  const trace={};
  const success=fake(t=>{
    t.pendingRead.consume({ecu:0x18,uds:[0x62,0x44,0xBB]});
    t.pendingRead.consume({ecu,uds:[0x62,0x12,0x34]});
    t.pendingRead.consume({ecu,uds:[0x7F,0x22,0x78]});
    t.pendingRead.consume({ecu,uds:[0x62,0x44,0xBB,0x01]});
  });
  const reply=await success.read(ecu,did,trace);
  assert.strictEqual(reply[0],0x62);
  assert.strictEqual(trace.ackAccepted,true);
  assert.strictEqual(trace.otherEcuEvents,1);
  assert.strictEqual(trace.matchedEcuEvents,3);
  assert.strictEqual(trace.wrongDidEvents,1);
  assert.strictEqual(trace.pendingEvents,1);
  assert.strictEqual(trace.negativeEvents,0);
  assert.strictEqual(trace.timedOut,false);
  const negativeTrace={};
  const negative=fake(t=>t.pendingRead.consume({ecu,uds:[0x7F,0x22,0x31]}));
  const nrc=await negative.read(ecu,did,negativeTrace);
  assert.deepStrictEqual(nrc,[0x7F,0x22,0x31]);
  assert.strictEqual(negativeTrace.negativeEvents,1);
  const timeoutTrace={};
  const timeout=fake(t=>{
    t.pendingRead.consume({ecu:0x18,uds:[0x62,0x44,0xBB]});
    t.pendingRead.arm(15);
  });
  assert.strictEqual(await timeout.read(ecu,did,timeoutTrace),null);
  assert.strictEqual(timeoutTrace.timedOut,true);
  assert.strictEqual(timeoutTrace.ackAccepted,true);
  assert.strictEqual(timeoutTrace.matchedEcuEvents,0);
  assert.strictEqual(timeoutTrace.otherEcuEvents,1);
  const rejectedTrace={};
  const rejected=new HmiTransport('/not-used');
  rejected.ready=true;rejected.line=async()=> 'error';
  await assert.rejects(rejected.read(ecu,did,rejectedTrace),/TASU command rejected/);
  assert.strictEqual(rejectedTrace.ackAccepted,false);
  assert.strictEqual(rejected.pendingRead,null);
  assert.strictEqual(JSON.stringify(trace).includes('uds'),false);
  console.log('Transport trace: ACK, routing, DID mismatch, pending, negative, timeout and rejected command passed');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
