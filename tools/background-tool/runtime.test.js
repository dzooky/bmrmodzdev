'use strict';
const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path'),{createStore}=require('./store'),{createRuntime}=require('./runtime');
(async()=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'bt-')),file=path.join(dir,'rules.json');let time=100000,raw=1,calls=[],events=0;
const connect=async()=>({close(){},async request(r){calls.push(r);if(r.op==='catalog')return {ok:true,fields:[{name:'dpf.test',minFreshnessMs:5000}]};if(r.op==='snapshot')return {ok:true,active:true,fields:{'dpf.test':{valid:true,raw,sampledAt:new Date(time).toISOString()}}};return {ok:true};}});
const make=()=>createRuntime({store:createStore(file),connect,dispatch:async()=>{events++;},now:()=>time});
let rt=make();const rule={api:1,appId:'a',ruleId:'r',fields:[{name:'dpf.test',freshnessMs:5000}],condition:{field:'dpf.test',op:'eq',value:1},trigger:'rising',actions:[{type:'notification',name:'test',payload:{}}]};
assert.throws(()=>rt.request({api:1,op:'register',rule},'b'));rt.request({api:1,op:'register',rule},'a');await rt.tick();assert.equal(events,1);rt.close();rt=make();await rt.tick();assert.equal(events,1);
raw=0;await rt.tick();raw=1;time+=6000;await rt.tick();assert.equal(events,2);assert(calls.filter(x=>x.op==='demand').length>=3);
rt.request({api:1,op:'unregister',ruleId:'r'},'a');await rt.tick();rt.close();assert.equal(createStore(file).load().size,0);fs.unlinkSync(file);fs.rmdirSync(dir);console.log('Runtime tests passed');})().catch(e=>{console.error(e);process.exitCode=1;});

(async()=>{
 const assert=require('assert');let time=100000,oil=79,raw=0,cdsFail=false,events=[],scopes=[],closed=[];
 const store={load:()=>new Map(),save(){}};
 const connect=async(app,path,scope)=>{const cds=scope==='cds';scopes.push(cds?'cds':'dpf');const field=cds?'engine.oilTemperature':'dpf.test';
 return {close(){closed.push(field);},async request(r){if(cds&&cdsFail)throw Error('CDS offline');if(r.op==='catalog')return {ok:true,fields:[{name:field,minFreshnessMs:cds?1000:5000}]};if(r.op==='snapshot')return {ok:true,active:true,fields:{[field]:{valid:true,raw:cds?999:raw,value:cds?oil:999,sampledAt:new Date(time).toISOString()}}};if(r.op==='demand')assert.deepStrictEqual(r.fields,[field]);return {ok:true};}};};
 const rt=createRuntime({store,connect,dispatch:async(a,k)=>events.push(k),now:()=>time});
 function add(app,field,value){rt.request({api:1,op:'register',rule:{api:1,appId:app,ruleId:'r',fields:[{name:field,freshnessMs:5000}],condition:{field,op:'gte',value},trigger:'rising',actions:[{type:'notification',name:'test',payload:{}}]}},app);}
 add('osa','engine.oilTemperature',80);add('dpf','dpf.test',1);
 await rt.tick();assert.deepStrictEqual(events,[]);assert.deepStrictEqual(scopes.sort(),['cds','dpf']);
 oil=80;await rt.tick();assert.deepStrictEqual(events,['osa:r']);
 cdsFail=true;raw=1;await rt.tick();assert.deepStrictEqual(events,['osa:r','dpf:r']);
 rt.request({api:1,op:'unregister',ruleId:'r'},'osa');await rt.tick();assert.equal(rt.health().fields,1);
 rt.close();assert(closed.includes('dpf.test'));console.log('Mixed CDS/DPF runtime tests passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
