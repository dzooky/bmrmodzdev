'use strict';
// Explicit, local-only CC generator preflight. Does not execute BMW code,
// register ACL, open SOME/IP, or make vehicle requests.
const fs=require('fs'),vm=require('vm');
const catalogShape=require('./cc-catalog-shape');
const gearCandidates=require('./cc-gear-candidates');
const DEFAULT_BUNDLE='/usr/lib/oap-mainapp/src/AppManagement/AppManagement.js';
const DEFAULT_CATALOG='/etc/oap/someip/someip-interfaces.json';
const MAX=16*1024*1024;
function bounded(io,file){
 const s=io.statSync(file);
 if(!s.isFile()||s.size<2||s.size>MAX)throw Error('file-missing-or-size');
 return io.readFileSync(file,'utf8');
}
function inspect(options){
 const opts=options||{},io=opts.fs||fs;
 const result={ok:false,mode:'local-read-only',carRequests:0,aclChanged:false,
  helperWireEncodingVerified:false,bundle:{status:'unavailable'},catalog:{status:'unavailable'}};
 try{
  const raw=bounded(io,opts.catalogPath||DEFAULT_CATALOG);
  const db=JSON.parse(raw);
  result.catalog={status:'readable',
   vehicleInformationMentioned:raw.indexOf('de.bmw.infrastructure.VehicleInformation')>=0,
   statusGearboxDriveMentioned:raw.indexOf('statusGearboxDrive')>=0,
   dataPowerTrain2Mentioned:raw.indexOf('DataPowerTrain2')>=0,
   shape:catalogShape.inspect(db),alternativeCandidates:gearCandidates.inspect(db)};
 }catch(e){result.catalog={status:'error',reason:String(e.message||e).slice(0,60)};}
 try{
  const raw=bounded(io,opts.bundlePath||DEFAULT_BUNDLE);
  const modules={
   IFConfigGenerator:raw.indexOf('"someip-interfaces-generator/IFConfigGenerator"')>=0,
   AclGenerator:raw.indexOf('"someip-interfaces-generator/AclGenerator"')>=0
  };
  const tail=/,\{\},\[\d+\]\)\s*;?\s*$/;
  if(!tail.test(raw))result.bundle={status:'bundle-tail-unrecognized',modules};
  else {
   // Exactly the expression shape used in someip-generator.js; parse only.
   const expression=raw.replace(tail,',{},[])');
   try{
    new vm.Script('(function(require){return '+expression+'})',
     {filename:'BMW-bundle-parse-only'});
    result.bundle={status:'syntax-valid',modules,executionVerified:false};
   }catch(e){
    const m=/BMW-bundle-parse-only:(\d+)/.exec(String(e.stack||''));
    result.bundle={status:'syntax-error',modules,error:String(e.message||e).slice(0,75),
     line:m?Number(m[1]):null};
   }
  }
 }catch(e){result.bundle={status:'error',reason:String(e.message||e).slice(0,60)};}
 result.ok=result.bundle.status==='syntax-valid'&&
  result.catalog.status==='readable'&&result.catalog.vehicleInformationMentioned&&
  result.bundle.modules.IFConfigGenerator&&result.bundle.modules.AclGenerator;
 return result;
}
module.exports={inspect};
