'use strict';
const assert=require('assert'),r=require('./cc-rules');
const fixture={interfaces:{'de.bmw.ClimateComfort':{fields:{automaticHeatingRule:{},statusHeating:{}}},'de.bmw.Other':{fields:{profile:{}}}}};
assert.deepStrictEqual(r.inspect(fixture).candidates,[{interface:'de.bmw.ClimateComfort',field:'automaticHeatingRule'}]);
assert.equal(r.inspect({}).status,'unknown-schema');
const x=r.capture({statSync:()=>({isFile:()=>true,size:100}),readFileSync:()=>JSON.stringify(fixture)});
assert.equal(x.states.driverHeat,'UNKNOWN');assert.equal(x.states.driverVent,'UNKNOWN');assert.equal(x.states.wheelHeat,'UNKNOWN');assert.equal(x.writeCount,0);
assert.equal(r.capture({statSync(){throw Error('denied');}}).discovery.status,'catalog-unavailable');
console.log('CC rules metadata discovery, no inferred state, no writes PASS');

const [iface,field]=r.targets[0];const io={statSync:()=>({isFile:()=>true,size:100}),readFileSync:()=>JSON.stringify({interfaces:{[iface]:{fields:{[field]:{getter:{id:123},setter:{id:124}}},instances:{'1':{}}},'de.bmw.UserProfile':{fields:{activeProfileId:{}}}}})};
const y=r.read({io});assert.equal(y.capabilities[field].getter,true);assert.equal(y.capabilities[field].setter,true);assert.deepStrictEqual(y.capabilities[field].instances,['1']);assert.equal(y.profile.candidates[0].field,'activeProfileId');assert.equal(y.states.driverHeat,'UNKNOWN');assert.deepStrictEqual(y.samples,{});assert.equal(y.writeCount,0);
console.log('Passive capability metadata, no signal permissions or inferred state PASS');
