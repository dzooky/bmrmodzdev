'use strict';
const assert=require('assert'),{inspect}=require('./cc-gear-candidates');
const catalog={records:[
 {name:'de.bmw.infrastructure.VehicleInformation',attributes:{statusGearboxDrive:{},DataPowerTrain2:{}},instances:{'2':{}}},
 {interfaceName:'OtherInterface',fields:[{name:'statusGearSelectionDrive'}],instances:{'1':{}}},
 {name:'MentionOnly',description:'statusGearboxDrive'}
]};
const r=inspect(catalog);
assert.equal(r.status,'structural-candidates-only');
assert.equal(r.candidateCount,2);
assert.equal(r.availabilityVerified,false);assert.equal(r.vehicleRequests,0);
assert.deepStrictEqual(r.candidates[0].fields,['statusGearboxDrive','DataPowerTrain2']);
assert.deepStrictEqual(r.candidates[1].instances,['1']);
assert.equal(inspect({foo:'statusGearboxDrive'}).candidateCount,0);
assert.equal(inspect({}).status,'none-structurally-located');
console.log('Gear alternative candidates are passive structural-only evidence PASS');
