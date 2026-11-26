'use strict';
const assert=require('assert'),mod=require('./front');
(async()=>{
 assert.equal(mod.decode([0x71,1,0xA0,0xD2,0]),'unlatched');
 assert.equal(mod.decode([0x71,1,0xA0,0xD2,1]),'latched');
 assert.equal(mod.decode([0x71,1,0xA0,0xD2,2]),null);
 assert.equal(mod.decode([0x7F,0x31,0x13]),null);
 let count=0,stopped=0;
 class Mock{
  constructor() {this.p={shutdown(){stopped++;}};}
  async init(){}
  async physical(address,sid,data){assert.equal(address,1);assert.equal(sid,0x31);count++;return [0x71,1,0xA0,0xD2,data[3]===1?1:0];}
 }
 const x=await mod.run({},null,Mock);
 assert.equal(x.frontLeft.value,'latched');assert.equal(x.frontRight.value,'unlatched');
 assert.equal(count,2);assert.equal(stopped,1);
 console.log('Native OAP TASU front sensor request and validation PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});
