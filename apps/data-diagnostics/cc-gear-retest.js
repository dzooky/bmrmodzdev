'use strict';
// A bounded, explicit-only gear feasibility test. Reuses the Tool's existing
// read-only structural catalog and ACL audits. Never guesses a DID, adds an
// unsupported VehicleInformation manifest, selects a gear or subscribes.
function evaluate(source,access,snapshot){
 const catalog=source&&source.catalog||{},shape=catalog.shape||{};
 const alternatives=catalog.alternativeCandidates||{};
 const fields=shape.fields||{},gear=snapshot&&snapshot.fields&&snapshot.fields.gear;
 const fresh=gear&&gear.valid===true&&['P','R','N','D'].indexOf(gear.value)>=0;
 const candidates=(alternatives.candidates||[]).slice(0,12).map(c=>({
  interface:String(c.interface||'unknown').slice(0,110),
  fields:Array.isArray(c.fields)?c.fields.slice(0,12):[],
  instances:Array.isArray(c.instances)?c.instances.slice(0,12):[],
  instanceVerified:false // catalog entries are not observed live services
 }));
 const result={
  ok:!!fresh,stage:'not-verified',selector:fresh?gear.value:null,
  source:fresh?'oap-native-provider':'none',
  catalogStatus:String(catalog.status||'unavailable').slice(0,70),
  exactStatus:String(shape.status||'unavailable').slice(0,70),
  exactMatches:shape.exactInterfaceMatches||0,
  fields:{statusGearboxDrive:fields.statusGearboxDrive===true,DataPowerTrain2:fields.DataPowerTrain2===true},
  instance1:shape.instance1===true,alternatives:candidates,
  candidateCount:alternatives.candidateCount||0,
  aclRegistered:!!(access&&access.registrationVerified),
  aclStaged:!!(access&&access.gear&&access.gear.stagedAclValid),
  availabilityVerified:false,vehicleRequests:0,
  note:'Catalog evidence is not a live P/R/N/D sample'
 };
 if(result.ok){result.stage='sample';result.availabilityVerified=true;return result;}
 if(!source||catalog.status!=='readable'){result.stage='catalog-unavailable';return result;}
 if(shape.status!=='candidate-confirmed'){
  result.stage='instance-or-schema-unverified';return result;
 }
 if(!result.aclStaged||!result.aclRegistered){
  result.stage='gear-access-unverified';return result;
 }
 result.stage='no-valid-gear-sample';return result;
}
async function run(request,snapshot){
 let audit=null,access=null,errors=[];
 try{audit=await request({op:'ccGearSourceAudit'},{timeoutMs:5000});}
 catch(e){errors.push('catalog: '+String(e&&e.message||e).slice(0,70));}
 try{access=await request({op:'ccAccessAudit'},{timeoutMs:5000});}
 catch(e){errors.push('ACL: '+String(e&&e.message||e).slice(0,70));}
 return Object.assign(evaluate(audit,access,snapshot),{errors});
}
module.exports={run,evaluate};
