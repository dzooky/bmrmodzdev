'use strict';
const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path');
const {inspect}=require('./cc-access-audit');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'cc-access-audit-'));
const paths={tasuConfig:path.join(root,'tasu.json'),tasuAcl:path.join(root,'tasu-acl.json'),
 gearConfig:path.join(root,'gear.json'),gearAcl:path.join(root,'gear-acl.json')};
try{
 const before=inspect({paths});assert.equal(before.ok,true);
 assert.equal(before.registrationVerified,false);assert.equal(before.tasu.configValid,false);
 fs.writeFileSync(paths.tasuConfig,JSON.stringify({methods:{sendTasuRequest:{id:1}}}));
 fs.writeFileSync(paths.tasuAcl,JSON.stringify({offers:[],requests:[{}]}));
 fs.writeFileSync(paths.gearConfig,JSON.stringify({fields:{statusGearboxDrive:{},DataPowerTrain2:{}}}));
 fs.writeFileSync(paths.gearAcl,JSON.stringify({offers:[],requests:[]}));
 const yes=inspect({paths});
 assert.equal(yes.tasu.methodPresent,true);assert.equal(yes.tasu.stagedAclValid,true);
 assert.equal(yes.gear.fieldsPresent,true);assert.equal(yes.gear.stagedAclValid,true);
 assert.equal(yes.toolRegistersAcl,false);assert.equal(yes.registrationVerified,false);
 assert.equal(yes.ecuRequests,0);assert.equal(yes.aclChanged,false);
 fs.writeFileSync(paths.tasuAcl,'not-json');
 assert.equal(inspect({paths}).tasu.stagedAclValid,false);
 console.log('CC Tool-owned staged ACL and config passive audit PASS');
}finally{fs.rmSync(root,{recursive:true,force:true});}
