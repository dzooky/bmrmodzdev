'use strict';
// Manual, passive inspection of Tool-owned staged CC SOME/IP inputs.
// Never installs ACL, reads other app configs, runs a generator, or contacts an ECU.
const fs=require('fs'),path=require('path');
const ROOT='/var/opt/bmrmodz-data-tool';
const TASU=path.join(ROOT,'generator-cc-tasu');
const GEAR=path.join(ROOT,'generator-cc-gear');
const CAP=1024*1024;
function read(io,name){
 try{
  const stat=io.statSync(name);
  if(!stat.isFile()||stat.size<2||stat.size>CAP)return {valid:false,reason:'size-or-type'};
  const json=JSON.parse(io.readFileSync(name,'utf8'));
  if(!json||typeof json!=='object'||Array.isArray(json))return {valid:false,reason:'shape'};
  return {valid:true,data:json};
 }catch(e){return {valid:false,reason:e&&e.code==='ENOENT'?'missing':'read-or-parse'};}
}
function inspect(options){
 const opts=options||{},io=opts.fs||fs,paths=opts.paths||{
  tasuConfig:path.join(TASU,'com_harman_infotainment_systemfunctions_tasu_tasu_InternalTasu.json'),
  tasuAcl:path.join(TASU,'acl.json'),
  gearConfig:path.join(GEAR,'de_bmw_infrastructure_VehicleInformation.json'),
  gearAcl:path.join(GEAR,'acl.json')
 };
 const config=read(io,paths.tasuConfig),acl=read(io,paths.tasuAcl);
 const gc=read(io,paths.gearConfig),ga=read(io,paths.gearAcl);
 const aclShape=x=>x.valid&&Array.isArray(x.data.offers)&&Array.isArray(x.data.requests);
 const method=!!(config.valid&&config.data.methods&&config.data.methods.sendTasuRequest);
 const gear=!!(gc.valid&&gc.data.fields&&gc.data.fields.statusGearboxDrive&&gc.data.fields.DataPowerTrain2);
 return {ok:true,mode:'passive-only',ecuRequests:0,aclChanged:false,
  registrationVerified:false,serviceNativeAccessVerified:false,
  tasu:{configValid:config.valid,methodPresent:method,stagedAclValid:aclShape(acl),
   aclRequests:aclShape(acl)?acl.data.requests.length:null,configFailure:config.valid?null:config.reason,
   aclFailure:acl.valid?null:acl.reason},
  gear:{configValid:gc.valid,fieldsPresent:gear,stagedAclValid:aclShape(ga),
   aclRequests:aclShape(ga)?ga.data.requests.length:null,configFailure:gc.valid?null:gc.reason,
   aclFailure:ga.valid?null:ga.reason},
  // Installation of an ACL is not performed by this Tool. No inference is
  // made about an external system registry from the staged file.
  toolRegistersAcl:false};
}
module.exports={inspect,read};
