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
 car.setVisible(false);console.log('OSA foreground cache and visibility passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
