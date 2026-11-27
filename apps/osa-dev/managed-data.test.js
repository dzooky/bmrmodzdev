'use strict';
const assert=require('assert'),{create}=require('./managed-data');
(async()=>{
 let now=10000,opens=0,closes=0,demands=0,invalid=false;
 const car=create({now:()=>now,connect:async(id,path,scope)=>{
  opens++;let fields=[];
  return {close(){closes++;},async request(req){
   if(req.op==='demand'){fields=req.fields;demands++;return {ok:true};}
   return {ok:true,active:true,fields:Object.fromEntries(fields.map(name=>[name,{valid:!invalid,value:42,ageMs:0,validityMs:scope==='egs'?15000:3000,sampledAt:now}]))};
  }};
 }});
 await car.poll();assert.equal(opens,0);
 car.setVisible(true);await car.poll();assert.equal(opens,2);assert.equal(demands,2);
 assert.equal(car.data().oil,42);assert.equal(car.data().atf,42);
 now+=3100;assert.equal(car.data().oil,null);assert.equal(car.data().atf,42);
 invalid=true;await car.poll();assert.equal(car.data().atf,null);
 car.setVisible(false);assert.equal(closes,2);assert.equal(car.data().oil,null);
 await car.poll();assert.equal(opens,2);
 car.setVisible(true);invalid=false;await car.poll();assert.equal(car.data().oil,42);assert.equal(opens,4);
 car.setVisible(false);
 const states=[];
 let failDemand=true;
 const debug=create({now:()=>now,onStatus:(scope,state)=>states.push(scope+':'+state),connect:async(id,path,scope)=>({
  close(){},async request(req){
   if(req.op==='demand')return failDemand?{ok:false,error:'DEMAND_REJECTED'}:{ok:true};
   return {ok:true,active:true,fields:scope==='cds'?{
    'engine.oilTemperature':{valid:true,value:76,ageMs:0,validityMs:3000,sampledAt:now},
    'engine.coolantTemperature':{valid:false,value:null,ageMs:null,validityMs:3000}
   }:{'transmission.oilTemperature':{valid:true,value:40,ageMs:0,validityMs:15000,sampledAt:now}}};
  }
 })});
 debug.setVisible(true);await debug.poll();
 assert(states.includes('cds:error:DEMAND_REJECTED'));
 assert.equal(debug.data().oil,null);
 failDemand=false;now+=2100;await debug.poll();
 assert.equal(debug.data().oil,76);
 assert.equal(debug.data().coolant,null);
 assert(states.some(s=>s.startsWith('cds:missing:')&&s.includes('coolant')));
 debug.setVisible(false);
 console.log('OSA foreground cache, visibility and diagnostics passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
