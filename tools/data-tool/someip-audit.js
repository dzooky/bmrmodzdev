'use strict';
// Passive staged CDS/ACL audit: bounded local reads only. No authorization
// registration, config installation, proxy creation or vehicle traffic.
const fs=require('fs'),path=require('path');
const STAGING='/var/opt/bmrmodz-data-tool/generator-test';
const CONFIG='de_bmw_infotainment_vehicle_CDS.json';
const LIMIT=1024*1024;
function safeRead(io,file){
  const stat=io.statSync(file);
  if(!stat.isFile()||stat.size<2||stat.size>LIMIT)throw Error('Invalid staged file');
  return JSON.parse(io.readFileSync(file,'utf8'));
}
function inspect(options){
  const opts=options||{},io=opts.fs||fs,staging=opts.staging||STAGING;
  const uid=typeof opts.uid==='number'?opts.uid:(process.getuid?process.getuid():null);
  const gid=typeof opts.gid==='number'?opts.gid:(process.getgid?process.getgid():null);
  const base={ok:false,mode:'passive-only',identity:{uid,gid},
    registration:'unverified',registrationMechanism:'not established for standalone systemd tool',
    aclRegistered:false,activeConfigChanged:false,signalReceptionVerified:false};
  try{
    const cfg=safeRead(io,path.join(staging,CONFIG));
    const acl=safeRead(io,path.join(staging,'acl.json'));
    const fields=cfg&&cfg.fields;
    const temperature=!!(fields&&fields.statusEngineTemperature);
    const rpm=!!(fields&&fields.statusEngineSpeed2);
    const offers=acl&&Array.isArray(acl.offers)?acl.offers:null;
    const requests=acl&&Array.isArray(acl.requests)?acl.requests:null;
    const counts={offers:offers?offers.length:null,requests:requests?requests.length:null};
    const valid=temperature&&rpm&&!!offers&&!!requests;
    return Object.assign(base,{ok:!!valid,stagedConfigPresent:true,stagedAclPresent:true,
      fields:{temperature,rpm},aclCounts:counts,
      note:valid?'Staging valid; standalone ACL registration still unverified':'Staged fields or ACL structure incomplete'});
  }catch(e){
    return Object.assign(base,{stagedConfigPresent:false,stagedAclPresent:false,
      error:String(e&&e.message||e).replace(/[\r\n]/g,' ').slice(0,140)});
  }
}
module.exports={inspect,STAGING};
