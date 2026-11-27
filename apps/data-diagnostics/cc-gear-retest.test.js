'use strict';
const assert=require('assert'),gear=require('./cc-gear-retest');
const source={catalog:{status:'readable',shape:{status:'incomplete-or-schema-unknown',
 exactInterfaceMatches:2,fields:{statusGearboxDrive:true,DataPowerTrain2:true},instance1:false},
 alternativeCandidates:{candidateCount:1,candidates:[{interface:'VehicleInformation',
 fields:['DataPowerTrain2','statusGearboxDrive'],instances:['1'],instanceVerified:true}]}}};
const access={registrationVerified:false,gear:{stagedAclValid:false}};
const sample={ok:true,fields:{gear:{valid:false,value:null}}};
const a=gear.evaluate(source,access,sample);
assert.equal(a.stage,'instance-or-schema-unverified');
assert.equal(a.selector,null);assert.equal(a.vehicleRequests,0);
assert.equal(a.availabilityVerified,false);assert.equal(a.alternatives[0].instanceVerified,false);
assert.equal(gear.evaluate(null,null,sample).stage,'catalog-unavailable');
const confirmed={catalog:Object.assign({},source.catalog,{shape:Object.assign({},source.catalog.shape,
 {status:'candidate-confirmed',instance1:true})})};
assert.equal(gear.evaluate(confirmed,access,sample).stage,'gear-access-unverified');
assert.equal(gear.evaluate(confirmed,{registrationVerified:true,gear:{stagedAclValid:true}},sample).stage,'no-valid-gear-sample');
assert.equal(gear.evaluate(confirmed,access,{fields:{gear:{valid:true,value:'P'}}}).stage,'sample');
(async()=>{
 const calls=[];const out=await gear.run(async q=>{calls.push(q.op);
  return q.op==='ccGearSourceAudit'?source:access;},sample);
 assert.deepStrictEqual(calls,['ccGearSourceAudit','ccAccessAudit']);
 assert.equal(out.stage,'instance-or-schema-unverified');assert.equal(out.errors.length,0);
 const failure=await gear.run(async()=>{throw Error('offline');},sample);
 assert.equal(failure.stage,'catalog-unavailable');assert.equal(failure.errors.length,2);
 console.log('Combined gear catalog/ACL/read-only feasibility test PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});
