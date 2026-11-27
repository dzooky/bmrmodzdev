'use strict';
const assert=require('assert'),r=require('./cc-rules');
const fixture={interfaces:{'de.bmw.ClimateComfort':{fields:{automaticHeatingRule:{},statusHeating:{}}},'de.bmw.Other':{fields:{profile:{}}}}};
assert.deepStrictEqual(r.inspect(fixture).candidates,[{interface:'de.bmw.ClimateComfort',field:'automaticHeatingRule'}]);
assert.equal(r.inspect({}).status,'unknown-schema');
const x=r.capture({statSync:()=>({isFile:()=>true,size:100}),readFileSync:()=>JSON.stringify(fixture)});
assert.equal(x.states.driverHeat,'UNKNOWN');assert.equal(x.states.driverVent,'UNKNOWN');assert.equal(x.states.wheelHeat,'UNKNOWN');assert.equal(x.writeCount,0);
assert.equal(r.capture({statSync(){throw Error('denied');}}).discovery.status,'catalog-unavailable');
console.log('CC rules metadata discovery, no inferred state, no writes PASS');

(async()=>{let closed=0;const io={statSync:()=>({isFile:()=>true,size:100}),readFileSync:()=>JSON.stringify({interfaces:{'de.bmw.UserProfile':{fields:{activeProfileId:{}}}}})};const x=await r.read({watch:async(i,n,h)=>{Object.values(h)[0]({enabled:true,threshold:12,name:'private',token:'secret'});return {available:true,shutdown(){closed++;}};}},{io,pause:async()=>{}});assert.equal(closed,2);assert.equal(x.samples.operationAutomaticSwitchDriverSeat.value.enabled,true);assert.equal(x.samples.operationAutomaticSwitchDriverSeat.value.name,undefined);assert.equal(x.profile.candidates[0].field,'activeProfileId');assert.equal(x.profile.status,'UNKNOWN');assert.equal(x.states.driverHeat,'UNKNOWN');console.log('Read-only candidate samples, profile metadata, privacy PASS');})().catch(e=>{console.error(e);process.exitCode=1;});
