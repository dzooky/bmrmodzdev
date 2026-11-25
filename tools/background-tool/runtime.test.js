'use strict';
const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path'),{createStore}=require('./store'),{createRuntime}=require('./runtime');
(async()=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'bt-')),file=path.join(dir,'rules.json');let time=100000,raw=1,calls=[],events=0;
const connect=async()=>({close(){},async request(r){calls.push(r);if(r.op==='catalog')return {ok:true,fields:[{name:'dpf.test',minFreshnessMs:5000}]};if(r.op==='snapshot')return {ok:true,active:true,fields:{'dpf.test':{valid:true,raw,sampledAt:new Date(time).toISOString()}}};return {ok:true};}});
const make=()=>createRuntime({store:createStore(file),connect,dispatch:async()=>{events++;},now:()=>time});
let rt=make();const rule={api:1,appId:'a',ruleId:'r',fields:[{name:'dpf.test',freshnessMs:5000}],condition:{field:'dpf.test',op:'eq',value:1},trigger:'rising',actions:[{type:'notification',name:'test',payload:{}}]};
assert.throws(()=>rt.request({api:1,op:'register',rule},'b'));rt.request({api:1,op:'register',rule},'a');await rt.tick();assert.equal(events,1);rt.close();rt=make();await rt.tick();assert.equal(events,1);
raw=0;await rt.tick();raw=1;time+=6000;await rt.tick();assert.equal(events,2);assert(calls.filter(x=>x.op==='demand').length>=3);
rt.request({api:1,op:'unregister',ruleId:'r'},'a');await rt.tick();rt.close();assert.equal(createStore(file).load().size,0);fs.unlinkSync(file);fs.rmdirSync(dir);console.log('Runtime tests passed');})().catch(e=>{console.error(e);process.exitCode=1;});
