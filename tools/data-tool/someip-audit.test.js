'use strict';
const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path');
const {inspect}=require('./someip-audit');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'bmrmodz-acl-audit-'));
try{
  const missing=inspect({staging:dir,uid:0,gid:0});
  assert.strictEqual(missing.ok,false);
  assert.strictEqual(missing.aclRegistered,false);
  assert.strictEqual(missing.registration,'unverified');
  assert.strictEqual(missing.signalReceptionVerified,false);
  fs.writeFileSync(path.join(dir,'de_bmw_infotainment_vehicle_CDS.json'),
    JSON.stringify({fields:{statusEngineTemperature:{},statusEngineSpeed2:{}}}));
  fs.writeFileSync(path.join(dir,'acl.json'),JSON.stringify({offers:[],requests:[{secret:'never-return'}]}));
  const success=inspect({staging:dir,uid:0,gid:0});
  assert.strictEqual(success.ok,true);
  assert.deepStrictEqual(success.aclCounts,{offers:0,requests:1});
  assert.strictEqual(success.fields.rpm,true);
  assert.strictEqual(success.identity.uid,0);
  assert.strictEqual(success.aclRegistered,false);
  assert.ok(!JSON.stringify(success).includes('never-return'));
  fs.writeFileSync(path.join(dir,'acl.json'),JSON.stringify({offers:{},requests:[]}));
  const invalid=inspect({staging:dir,uid:0,gid:0});
  assert.strictEqual(invalid.ok,false);
  assert.strictEqual(invalid.aclRegistered,false);
  console.log('Data Tool passive staged CDS/ACL audit passed');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
