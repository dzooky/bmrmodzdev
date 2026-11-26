'use strict';
const assert=require('assert'),{run,resultFor}=require('./cc-native-front');
assert.deepStrictEqual(resultFor([0x71,1,0xA0,0xD2,1]),{state:'latched',detail:'01'});
assert.deepStrictEqual(resultFor([0x71,1,0xA0,0xD2,0]),{state:'unlatched',detail:'00'});
assert.deepStrictEqual(resultFor([0x7f,0x31,0x13]),{state:'unknown',detail:'NRC 13'});
assert.deepStrictEqual(resultFor([0x71,1,0xA0,0xD3,1]),{state:'unknown',detail:'unexpected-reply'});
assert.deepStrictEqual(resultFor(null),{state:'unknown',detail:'timeout'});
(async()=>{
 let calls=[],shutdown=0;
 class FakeDiag{
  constructor(signals,log){assert.ok(signals);this.p={shutdown:()=>{shutdown++;}};}
  async init(){}
  async physical(ecu,sid,bytes,ms,accept,options){
   calls.push({ecu,sid,bytes,ms,options});
   const reply=bytes[3]===1?[0x71,1,0xA0,0xD2,1]:[0x7f,0x31,0x13];
   assert.equal(accept(reply),true);
   return reply;
  }
 }
 const out=await run({proxy:true},{warn(){}},FakeDiag);
 assert.equal(out.frontLeft.state,'latched');
 assert.equal(out.frontRight.detail,'NRC 13');
 assert.deepStrictEqual(calls.map(c=>c.bytes),
 [[1,0xA0,0xD2,1],[1,0xA0,0xD2,2]]);
 assert(calls.every(c=>c.options.maxRetries===0));
 assert.equal(shutdown,1);
 class MissingProxy{async init(){this.p=null;}}
 const blocked=await run({},null,MissingProxy);
 assert.equal(blocked.error,'proxy-unavailable');
 assert.equal(blocked.frontLeft.state,'unknown');
 console.log('CC native front TASU isolated probe PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});
