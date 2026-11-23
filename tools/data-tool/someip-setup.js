'use strict';
// Passive installation readiness survey. Never generate interfaces, read app-private
// configs, register ACLs, invoke native SOME/IP or issue vehicle requests.
const fs=require('fs');
const path=require('path');
const CDS='/var/opt/bmrmodz-data-tool/config/de_bmw_infotainment_vehicle_CDS.json';
const CATALOG='/etc/oap/someip/someip-interfaces.json';
const FIRMWARE='/usr/lib/oap-mainapp/src/AppManagement/AppManagement.js';
const MANIFEST=path.join(__dirname,'signal-manifest.json');
function fileExists(io,name){
  try{return io.statSync(name).isFile();}catch(_){return false;}
}
function inspect(options){
  const opts=options||{};
  const io=opts.fs||fs;
  const target=opts.configPath||CDS;
  const catalog=opts.catalogPath||CATALOG;
  const firmware=opts.firmwarePath||FIRMWARE;
  const manifest=opts.manifestPath||MANIFEST;
  const uid=typeof opts.uid==='number'?opts.uid:typeof process.getuid==='function'?process.getuid():null;
  const gid=typeof opts.gid==='number'?opts.gid:typeof process.getgid==='function'?process.getgid():null;
  const checks={
    catalogPresent:fileExists(io,catalog),
    firmwareAppManagementPresent:fileExists(io,firmware),
    toolManifestPresent:fileExists(io,manifest),
    generatedCdsPresent:fileExists(io,target)
  };
  return {
    ok:true,mode:'passive-only',checks,
    identity:{uid,gid},
    registration:'not verified',
    next:!checks.catalogPresent?'BMW SOME/IP catalog missing':
      !checks.firmwareAppManagementPresent?'BMW generator bundle path unavailable':
      !checks.toolManifestPresent?'Data Tool signal manifest missing':
      !checks.generatedCdsPresent?'Tool-owned CDS config has not been generated':
      'Configuration exists; ACL registration and read access still unverified',
    limitations:['No generator invoked','No ACL changes','No private application configuration accessed','No native proxy or ECU request']
  };
}
module.exports={inspect};
