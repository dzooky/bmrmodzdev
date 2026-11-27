'use strict';
const assert=require('assert'),{check,decodeRear}=require('./cc-actuation-gate');
(async()=>{
 const at=()=>Date.parse('2026-11-27T10:00:02.000Z');
 const sample={ok:true,sampledAt:'2026-11-27T10:00:00.000Z',fields:{
  frontLeft:{valid:true,value:'latched'},frontRight:{valid:true,value:'unlatched'}}};
 assert.equal((await check('frontHeat',async()=>sample,at)).ok,true);
 assert.equal((await check('frontVent',async()=>sample,at)).stage,'unlatched');
 assert.equal((await check('frontHeat',async()=>sample,()=>at()+10000)).stage,'front-sample-stale');
 const rear={ok:true,uds:[0x62,0x40,0x53,0,0,135,0,35]};
 assert.equal(decodeRear(rear,'rearLeft'),'latched');
 assert.equal((await check('rearHeat',async()=>rear,at)).ok,true);
 assert.equal((await check('wheelHeat',async()=>{throw Error('offline');},at)).ok,false);
 assert.equal((await check('unknown',async()=>sample,at)).stage,'unsupported-actuator');
 console.log('CC manual control Tool belt preflight and fail-closed freshness PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});
