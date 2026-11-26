'use strict';
const assert=require('assert');
const {create}=require('./managed-temperature');
(async()=>{
 let clock=100000,connected=[],requests=[],closed=[];
 const samples={
 cds:{'environment.outsideTemperature':{valid:true,value:12,ageMs:0,validityMs:3000}},
 ihka:{
  'climate.frontLeftFootwell':{valid:true,value:19,ageMs:0,validityMs:15000},
  'climate.frontRightFootwell':{valid:true,value:21,ageMs:0,validityMs:15000},
  'climate.rearLeftFootwell':{valid:true,value:17,ageMs:0,validityMs:15000},
  'climate.rearRightFootwell':{valid:true,value:22,ageMs:0,validityMs:15000}
 }
 };
 const managed=create({now:()=>clock,connect:async(appId,path,scope)=>{
  assert.strictEqual(appId,'cc-dev');connected.push(scope);
  return {request:async req=>{
   requests.push({scope,req});
   return req.op==='snapshot'?{ok:true,active:true,fields:samples[scope]}:{ok:true};
  },close:()=>closed.push(scope)};
 }});
 await managed.poll();assert.strictEqual(connected.length,0);assert.strictEqual(managed.hasValidFootwell(),false);
 managed.setVisible(true);await managed.poll();
 assert.deepStrictEqual(connected.sort(),['cds','ihka']);
 assert.deepStrictEqual(managed.data(),{outside:12,frontLeft:19,frontRight:21,rearLeft:17,rearRight:22});
 assert.strictEqual(managed.hasValidFootwell(),true);
 const ihkaDemand=requests.find(x=>x.scope==='ihka'&&x.req.op==='demand').req;
 assert.strictEqual(ihkaDemand.fields.length,4);
 assert.ok(ihkaDemand.fields.every(f=>ihkaDemand.freshnessMs[f]===5000));
 clock+=5100;await managed.poll();
 assert.strictEqual(requests.filter(x=>x.req.op==='demand').length,4);
 // Invalid sample must not allow an automatic decision.
 samples.ihka['climate.frontLeftFootwell']={valid:false,value:null,ageMs:0,validityMs:15000};
 clock+=600;await managed.poll();assert.strictEqual(managed.data().frontLeft,null);
 // Expired snapshots must become unavailable even without another poll.
 clock+=16000;assert.strictEqual(managed.hasValidFootwell(),false);
 managed.setVisible(false);assert.strictEqual(managed.data().outside,null);
 assert.deepStrictEqual(closed.sort(),['cds','ihka']);
 await managed.poll();assert.strictEqual(connected.length,2);
 managed.setVisible(true);await managed.poll();assert.strictEqual(connected.length,4);
 console.log('CC DEV managed temperature: two scoped demands, 4 shared IHKA values, stale safety, hide/reopen PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});
