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

(async()=>{
 const assert=require('assert'),{Engine}=require('./engine');let events=[],saved=new Map();
 const e=new Engine(x=>{saved=x;},async(a)=>events.push(a.payload.text));
 const mode='dpf.b57.mode',request='dpf.b57.request';
 const action=text=>({type:'notification',name:'kombi',payload:{text}});
 const active={field:mode,op:'bitSet',value:2},inactive={field:mode,op:'bitClear',value:2};
 const rule={api:1,appId:'dpf-dev',ruleId:'regen',fields:[{name:mode,freshnessMs:5000},{name:request,freshnessMs:5000}],trigger:'state',states:[
 {id:'active',condition:active,actions:[action('Started')],repeat:{delayMs:3000,intervalMs:60000,actions:[action('In Progress')]}},
 {id:'requested',condition:{all:[inactive,{field:request,op:'gte',value:4},{field:request,op:'lte',value:6}]},actions:[action('Requested')]},
 {id:'idle',condition:inactive,from:['active'],actions:[action('Finished')]}]};
 e.register(rule);let time=100000;
 async function tick(m,r,t,valid=true,engine=e){time=t;await engine.tick({[mode]:{valid,value:m,sampledAt:t},[request]:{valid,value:r,sampledAt:t}},t);}
 await tick(0,0,time);assert.deepStrictEqual(events,[]);
 await tick(0,4,time+1000);await tick(2,4,time+1000);assert.deepStrictEqual(events,['Requested','Started']);
 await tick(2,4,time+3000);await tick(2,4,time+60000);assert.deepStrictEqual(events,['Requested','Started','In Progress','In Progress']);
 await tick(0,0,time+1000,false);assert.equal(events.length,4);
 const restarted=new Engine(x=>{saved=x;},async(a)=>events.push(a.payload.text));restarted.rules=saved;
 await tick(0,0,time+1000,true,restarted);assert.equal(events[4],'Finished');
 await tick(0,0,time+1000,true,restarted);assert.equal(events.length,5);
 console.log('Declarative state transitions and recurrence passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
