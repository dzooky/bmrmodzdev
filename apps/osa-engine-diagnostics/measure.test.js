'use strict';
const assert=require('assert'),m=require('./measure');
(async()=>{
 assert.deepStrictEqual(m.decode('oil',128),{raw:128,value:80});
 assert.deepStrictEqual(m.decode('coolant',148),{raw:148,value:100});
 assert.deepStrictEqual(m.decode('rpm',3200),{raw:3200,value:800});
 assert.equal(m.decode('oil',255),null);
 assert.equal(m.decode('rpm',65535),null);
 let callback,shutdown=0;
 const native=await m.native({watch:async(iface,instance,handlers)=>{assert.equal(iface,m.IFACE);callback=handlers;
  handlers.statusEngineTemperature({temperatureEngineOilDrive:128,temperatureEngineDrive:130});
  handlers.statusEngineSpeed2({actualValueRPMEngineCrankshaft:3200});
  return {available:true,shutdown:async()=>{shutdown++;}};}},null,{delay:async()=>{}});
 assert.equal(native.status,'complete');assert.equal(native.values.oil.value,80);assert.equal(shutdown,1);
 let demand=false,released=false,closed=false;
 const tool=await m.tool({connect:async()=>({request:async req=>{
  if(req.op==='demand'){demand=true;return {ok:true};}
  if(req.op==='release'){released=true;return {ok:true};}
  return {ok:true,active:true,fields:{
   'engine.oilTemperature':{valid:true,value:80,raw:128,ageMs:0,validityMs:3000},
   'engine.coolantTemperature':{valid:false},
   'engine.rpm':{valid:true,value:800,raw:3200,ageMs:100,validityMs:3000}
  }};},close(){closed=true;}}),delay:async()=>{}});
 assert(demand&&released&&closed);assert.equal(tool.status,'partial');assert.deepStrictEqual(tool.invalid,['coolant']);
 const diff=m.compare(native,tool);assert.equal(diff.oil.delta,0);assert.equal(diff.coolant.state,'native-only');
 const broken=await m.tool({connect:async()=>({request:async req=>({ok:false,error:'test-rejection'}),close(){}})});
 assert.equal(broken.status,'missing');assert(broken.errors[0].includes('test-rejection'));
 console.log('Engine source conversion, native capture, Tool demand, incomplete samples, release and errors PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});
