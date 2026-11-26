'use strict';
const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path');
const {inspect}=require('./cc-generator-audit');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'bmrmodz-cc-gear-'));
try{
 const catalog=path.join(dir,'catalog.json'),bundle=path.join(dir,'app.js');
 fs.writeFileSync(catalog,JSON.stringify({names:['de.bmw.infrastructure.VehicleInformation',
  'statusGearboxDrive','DataPowerTrain2']}));
 const valid='(function(a,b,c){return {"someip-interfaces-generator/IFConfigGenerator":1,"someip-interfaces-generator/AclGenerator":2};})({},{},[0])';
 for(const [src,status] of [[valid,'syntax-valid'],
  ['(function(a,b,c){return (})({},{},[0])','syntax-error'],
  ['something unexpected','bundle-tail-unrecognized']]){
  fs.writeFileSync(bundle,src);
  const v=inspect({catalogPath:catalog,bundlePath:bundle});
  assert.strictEqual(v.bundle.status,status);
  assert.strictEqual(v.mode,'local-read-only');
  assert.strictEqual(v.carRequests,0);
  assert.strictEqual(v.aclChanged,false);
  assert.strictEqual(v.helperWireEncodingVerified,false);
  if(status==='syntax-valid'){
   assert.strictEqual(v.ok,true);
   assert.strictEqual(v.catalog.shape.status,'interface-not-structurally-located');
   assert.strictEqual(v.catalog.alternativeCandidates.availabilityVerified,false);
   assert.strictEqual(v.catalog.alternativeCandidates.vehicleRequests,0);
   assert.strictEqual(v.bundle.executionVerified,false);
  }
 }
 fs.writeFileSync(catalog,'broken json');
 assert.strictEqual(inspect({catalogPath:catalog,bundlePath:bundle}).catalog.status,'error');
 fs.unlinkSync(bundle);
 assert.strictEqual(inspect({catalogPath:catalog,bundlePath:bundle}).bundle.status,'error');
 console.log('CC generator read-only preflight PASS');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
