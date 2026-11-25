'use strict';
const assert=require('assert'),{Engine}=require('./engine');
(async()=>{let saved,events=[];const e=new Engine(x=>{saved=x;},async(a,k)=>events.push(k));
const r={api:1,appId:'test',ruleId:'oil',fields:[{name:'oil',freshnessMs:5000}],condition:{field:'oil',op:'gte',value:80},trigger:'rising',actions:[{type:'notification',name:'test',payload:{}}]};
e.register(r);e.register(r);assert.equal(e.rules.size,1);
const sample=(value,valid=true,sampledAt=1000)=>({oil:{value,valid,sampledAt}});
await e.tick(sample(79),1000);await e.tick(sample(80),1000);await e.tick(sample(81),1000);assert.equal(events.length,1);
await e.tick(sample(0,false),1000);await e.tick(sample(81),1000);assert.equal(events.length,1);
await e.tick(sample(0,true,0),20000);await e.tick(sample(81),1000);assert.equal(events.length,1);
await e.tick(sample(79),1000);await e.tick(sample(80),1000);assert.equal(events.length,2);
e.register(Object.assign({},r,{ruleId:'other',fields:[{name:'oil',freshnessMs:10000}]}));assert.equal(e.demand().oil,5000);
e.unregister('test','oil');assert.equal(e.demand().oil,10000);assert.equal(saved.size,1);
assert.throws(()=>e.register(Object.assign({},r,{condition:{field:'oil',op:'constructor',value:1}})));
console.log('Background engine tests passed');})().catch(e=>{console.error(e);process.exitCode=1;});

(async()=>{let events=0;const e=new Engine(()=>{},async()=>{events++;});const rule={api:1,appId:'test',ruleId:'h',fields:[{name:'oil',freshnessMs:5000}],condition:{field:'oil',op:'gte',value:80},rearm:{field:'oil',op:'lte',value:78},trigger:'rising',actions:[{type:'notification',name:'test',payload:{}}]};e.register(rule);for(const value of [79,80,79,80,78,79,80])await e.tick({oil:{value,valid:true,sampledAt:1000}},1000);assert.equal(events,2);assert.throws(()=>e.register(Object.assign({},rule,{trigger:'once'})));console.log('Hysteresis tests passed');})().catch(e=>{console.error(e);process.exitCode=1;});
