'use strict';
const assert=require('assert'),r=require('./cc-rules');
const fixture={interfaces:{'de.bmw.ClimateComfort':{fields:{automaticHeatingRule:{},statusHeating:{}}},'de.bmw.Other':{fields:{profile:{}}}}};
assert.deepStrictEqual(r.inspect(fixture).candidates,[{interface:'de.bmw.ClimateComfort',field:'automaticHeatingRule'}]);
assert.equal(r.inspect({}).status,'unknown-schema');
const x=r.capture({statSync:()=>({isFile:()=>true,size:100}),readFileSync:()=>JSON.stringify(fixture)});
assert.equal(x.states.driverHeat,'UNKNOWN');assert.equal(x.states.driverVent,'UNKNOWN');assert.equal(x.states.wheelHeat,'UNKNOWN');assert.equal(x.writeCount,0);
assert.equal(r.capture({statSync(){throw Error('denied');}}).discovery.status,'catalog-unavailable');
console.log('CC rules metadata discovery, no inferred state, no writes PASS');
