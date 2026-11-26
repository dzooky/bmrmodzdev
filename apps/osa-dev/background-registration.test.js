'use strict';
const assert=require('assert'),{create,desired}=require('./background-registration');
(async()=>{const settings={enabled:false,target:80,language:'sk'},calls=[];let fail=false;
 const c=create({info(){},warn(){}},()=>settings,async msg=>{calls.push(msg);return {ok:!fail};});
 await c.sync();assert.equal(calls[0].op,'unregister');await c.sync();assert.equal(calls.length,1);
 settings.enabled=true;await c.sync();const rule=calls[1].rule;assert.equal(rule.fields.length,2);assert.equal(rule.fields[1].name,'engine.rpm');assert.equal(rule.fields[0].name,'engine.oilTemperature');assert.deepStrictEqual(rule.condition.all,[{field:'engine.rpm',op:'gte',value:300},{field:'engine.oilTemperature',op:'gte',value:80}]);assert.deepStrictEqual(rule.rearm,{field:'engine.rpm',op:'eq',value:0});assert.equal(rule.actions[0].payload.segments[0].text,'Olej zohriaty ');
 await c.sync();assert.equal(calls.length,2);settings.target=85;fail=true;await c.sync();fail=false;await c.sync();assert.equal(calls.length,4);assert.equal(calls[3].rule.condition.all[1].value,85);
 settings.language='en';await c.sync();assert.equal(calls[4].rule.actions[0].payload.segments[0].text,'Oil warmed up ');
 settings.enabled=false;await c.sync();assert.equal(calls[5].op,'unregister');assert.equal(calls[5].ruleId,'oil-warm');
 assert.throws(()=>desired({enabled:true,target:NaN}));console.log('Background registration lifecycle passed');
})().catch(e=>{console.error(e);process.exitCode=1;});

(async()=>{
 const {Engine}=require('../../tools/background-tool/engine');
 let saved=new Map(),events=0,t=100000;
 const make=()=>{const e=new Engine(x=>{saved=x;},async()=>{events++;});e.rules=saved;return e;};
 let engine=make();const rule=desired({enabled:true,target:80,language:'sk'}).rule;engine.register(rule);
 async function tick(rpm,oil,valid=true){t+=1000;await engine.tick({'engine.rpm':{value:rpm,valid,sampledAt:t},'engine.oilTemperature':{value:oil,valid,sampledAt:t}},t);}
 await tick(0,85);assert.equal(events,0);
 await tick(700,85);assert.equal(events,1);
 await tick(700,77);await tick(700,85);assert.equal(events,1);
 engine=make();engine.register(rule);await tick(700,85);assert.equal(events,1);
 await tick(0,85,false);await tick(700,85);assert.equal(events,1);
 await tick(0,85);await tick(700,85);assert.equal(events,2);
 await tick(0,70);await tick(700,70);await tick(700,79);assert.equal(events,2);
 await tick(700,80);assert.equal(events,3);
 console.log('OSA engine-start warm/cold, persistence and invalid sample regression passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
