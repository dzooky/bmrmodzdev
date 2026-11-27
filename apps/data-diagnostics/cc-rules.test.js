'use strict';
const assert=require('assert'),r=require('./cc-rules');
const fixture={interfaces:{'de.bmw.ClimateComfort':{fields:{automaticHeatingRule:{},statusHeating:{}}},'de.bmw.Other':{fields:{profile:{}}}}};
assert.deepStrictEqual(r.inspect(fixture).candidates,[{interface:'de.bmw.ClimateComfort',field:'automaticHeatingRule'}]);
assert.equal(r.inspect({}).status,'unknown-schema');
const x=r.capture({statSync:()=>({isFile:()=>true,size:100}),readFileSync:()=>JSON.stringify(fixture)});
assert.equal(x.states.driverHeat,'UNKNOWN');assert.equal(x.states.driverVent,'UNKNOWN');assert.equal(x.states.wheelHeat,'UNKNOWN');assert.equal(x.writeCount,0);
assert.equal(r.capture({statSync(){throw Error('denied');}}).discovery.status,'catalog-unavailable');
console.log('CC rules metadata discovery, no inferred state, no writes PASS');

const [iface,field]=r.targets[0];const io={statSync:()=>({isFile:()=>true,size:100}),readFileSync:()=>JSON.stringify({interfaces:{[iface]:{fields:{[field]:{getter:{id:123},setter:{id:124}}},instances:{'1':{}}},'de.bmw.UserProfile':{fields:{activeProfileId:{}}},'de.bmw.infrastructure.DriverSelectionModule':{fields:{piaProfileId:{getter:1}}}},instanceIDs:{'de.bmw.infrastructure.DriverSelectionModule':{'driver':1},[iface]:{'1':1,'realInstance':2}}})};
const y=r.read({io});assert.equal(y.capabilities[field].getter,true);assert.equal(y.capabilities[field].setter,true);assert.deepStrictEqual(y.capabilities[field].instances,['1']);assert.equal(y.profile.candidates[0].field,'activeProfileId');assert.equal(y.states.driverHeat,'UNKNOWN');assert.deepStrictEqual(y.samples,{});assert.equal(y.writeCount,0);
console.log('Passive capability metadata, no signal permissions or inferred state PASS');

(async()=>{let calls=[],closed=0;const declared=[{interface:iface,field,instance:'realInstance'},{interface:'de.bmw.infrastructure.DriverSelectionModule',field:'piaProfileId',instance:'driver'}];const x=await r.sample({proxy:async(i,n)=>({getValue:async f=>{calls.push([i,n,f]);return f==='piaProfileId'?{piaProfileId:'local-only-id'}:{enabled:true,threshold:12};},shutdown(){closed++;}})},declared,{io});assert.equal(calls.length,2);assert.equal(closed,2);assert.equal(x.report.samples[field].value.enabled,true);assert.equal(x.localProfile,'local-only-id');assert.equal(x.report.profile.status,'sample');assert.ok(!JSON.stringify(x.report).includes('local-only-id'));assert.equal(x.report.samples.statusClimateUpdateAutomatic.status,'not-declared');assert.equal(x.report.states.driverHeat,'UNKNOWN');console.log('Getter-only declared reads, profile stays local PASS');})().catch(e=>{console.error(e);process.exitCode=1;});
