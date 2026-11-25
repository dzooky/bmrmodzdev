'use strict';
const assert=require('assert'),{createApi}=require('./public-api'),{createEngine}=require('./cds-engine'),{EventEmitter}=require('events');
let t=10000,starts=0,child;
const engine=createEngine({now:()=>t,spawn:()=>{starts++;child=new EventEmitter();child.stdout=new EventEmitter();child.stdout.setEncoding=()=>{};child.kill=()=>{};return child;}});
const api=createApi({cdsEngine:engine,now:()=>t});
const oil='engine.oilTemperature',rpm='engine.rpm';
const demand=(...fields)=>({op:'demand',fields,freshnessMs:Object.fromEntries(fields.map(k=>[k,1000]))});
try{
 const a=api.connect('a'),b=api.connect('b');
 assert.equal(a.request({op:'catalog'}).fields.length,3);
 assert.equal(starts,0);
 assert.equal(a.request(demand('unknown')).ok,false);
 assert.ok(a.request(demand(oil)).ok);
 assert.ok(b.request(demand(oil,rpm)).ok);
 assert.equal(starts,1);
 child.stdout.emit('data',JSON.stringify({type:'sample',field:'statusEngineTemperature',value:{oil:128,coolant:130}})+'\n');
 child.stdout.emit('data',JSON.stringify({type:'sample',field:'statusEngineSpeed2',value:{rpm:3200}})+'\n');
 let x=a.request({op:'snapshot'}).fields,y=b.request({op:'snapshot'}).fields;
 assert.deepStrictEqual(Object.keys(x),[oil]);assert.equal(x[oil].value,80);assert.equal(y[rpm].value,800);assert.equal(x[oil].sampledAt,y[oil].sampledAt);
 t+=3000;assert.equal(a.request({op:'snapshot'}).fields[oil].valid,true);
 t++;assert.equal(a.request({op:'snapshot'}).fields[oil].valid,false);
 a.close();assert.equal(engine.status().running,true);
 b.request({op:'release'});assert.equal(engine.status().running,false);
 assert.ok(b.request(demand(oil)).ok);assert.equal(starts,2);
 assert.equal(b.request({op:'snapshot'}).fields[oil].valid,false);
 t+=15001;assert.equal(b.request({op:'snapshot'}).error,'SESSION_EXPIRED');assert.equal(engine.status().running,false);
 console.log('Public CDS shared engine, filtered snapshots, validity and leases PASS');
}finally{api.close();engine.close();}
