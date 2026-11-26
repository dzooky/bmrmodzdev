'use strict';
// Explicit manual BMW generator probe. A failed preflight is retryable.
// A failed generator keeps its original error visible; partial output is never
// overwritten. No ACL installation, active config, or ECU operations.
const fs=require('fs'),path=require('path'),cp=require('child_process');
const ROOT='/var/opt/bmrmodz-data-tool';
const STAGING=path.join(ROOT,'generator-test');
const CATALOG='/etc/oap/someip/someip-interfaces.json';
const MANIFEST=path.join(__dirname,'signal-manifest.json');
const GENERATOR=path.join(__dirname,'someip-generator.js');
const CDS='de_bmw_infotainment_vehicle_CDS.json';
const MAX=1024*1024;
const MESSAGE=140;
function clean(error){
  return String(error&&error.message||error||'Unknown generator error')
    .replace(/[\r\n\t]/g,' ').slice(0,MESSAGE);
}
function readJson(file,io){
  const stat=io.statSync(file);
  if(!stat.isFile()||stat.size<2||stat.size>MAX)throw new Error('Invalid generator output file');
  return JSON.parse(io.readFileSync(file,'utf8'));
}
function checkStaging(directory,io){
  try{
    const cfg=readJson(path.join(directory,CDS),io);
    const acl=readJson(path.join(directory,'acl.json'),io);
    const fields=cfg&&cfg.fields;
    const validAcl=!!acl&&Array.isArray(acl.offers)&&Array.isArray(acl.requests);
    const temperature=!!(fields&&fields.statusEngineTemperature);
    const rpm=!!(fields&&fields.statusEngineSpeed2);
    const ok=temperature&&rpm&&validAcl;
    return {ok,mode:'staging-only',configGenerated:true,
      fields:{temperature,rpm},aclFileGenerated:validAcl,
      aclRegistered:false,activeConfigChanged:false,
      note:ok?'Staged CDS and ACL generated; not registered':'Generated fields or ACL incomplete'};
  }catch(error){
    return {ok:false,mode:'staging-only',configGenerated:false,aclFileGenerated:false,
      aclRegistered:false,activeConfigChanged:false,error:clean(error)};
  }
}
function inspect(){return checkStaging(STAGING,fs);}
function createGenerator(options){
  const opts=options||{},io=opts.fs||fs,spawn=opts.spawn||cp.spawn;
  const validate=opts.check||checkStaging;
  const paths=opts.paths||{root:ROOT,staging:STAGING,catalog:CATALOG,manifest:MANIFEST,generator:GENERATOR};
  const timeoutMs=opts.timeoutMs||12000;
  let running=false,attempts=0,last=null;
  function record(value){
    last=value;
    return value;
  }
  function status(){
    const check=validate(paths.staging,io);
    if(check.ok)return check;
    if(last&&!last.ok)return Object.assign({},check,{stage:last.stage,error:last.error||check.error,
      note:'Previous generator attempt failed; active config and ACL remain unchanged'});
    return check;
  }
  function run(){
    if(running)return Promise.resolve({ok:false,stage:'busy',error:'Generator test is still running'});
    if(status().ok)return Promise.resolve(record(Object.assign({stage:'already-generated'},status())));
    if(attempts>=3)return Promise.resolve(last||{ok:false,stage:'attempt-limit',error:'Generator attempt limit reached; restart service to retry'});
    try{
      for(const [file,label] of [[paths.catalog,'BMW catalog'],[paths.manifest,'Tool manifest'],[paths.generator,'Generator script']]){
        if(!io.statSync(file).isFile())throw new Error(label+' unavailable');
      }
      // MGU Node may not support mkdir({recursive:true}) reliably:
      // do not call mkdir on an already existing directory.
      if(io.existsSync(paths.root)){
        if(!io.statSync(paths.root).isDirectory())throw new Error('Tool data path is not a directory');
      }else{
        io.mkdirSync(paths.root,{mode:0o700});
      }
      if(io.existsSync(paths.staging)){
        if(!io.statSync(paths.staging).isDirectory())throw new Error('Staging path is not a directory');
        // Reuse an EMPTY staging directory after an unsuccessful attempt.
        // Never delete or overwrite partial output.
        if(io.readdirSync(paths.staging).length!==0)
          return Promise.resolve(record({ok:false,stage:'partial-output',error:'Staging contains partial files; preserved for review'}));
      }else{
        io.mkdirSync(paths.staging,{mode:0o700});
      }
    }catch(error){return Promise.resolve(record({ok:false,stage:'precheck',error:clean(error)}));}
    running=true;attempts++;
    return new Promise(resolve=>{
      let child=null,output='',finished=false,timer=null;
      function finish(value){
        if(finished)return;
        finished=true;running=false;clearTimeout(timer);
        if(child&&!child.killed)try{child.kill('SIGKILL');}catch(_){}
        resolve(record(value));
      }
      timer=setTimeout(()=>finish({ok:false,stage:'timeout',error:'BMW generator timed out'}),timeoutMs);
      try{
        child=spawn(process.execPath,[paths.generator,paths.catalog,paths.manifest,
          String(process.getuid?process.getuid():0),paths.staging],
          {stdio:['ignore','pipe','pipe'],env:process.env});
        const collect=part=>{output=(output+String(part)).slice(-3000);};
        child.stdout.on('data',collect);child.stderr.on('data',collect);
        child.on('error',error=>finish({ok:false,stage:'spawn',error:clean(error)}));
        child.on('close',code=>{
          if(code!==0)return finish({ok:false,stage:'generator',error:clean(output||'Generator exit code '+code)});
          const result=validate(paths.staging,io);
          finish(Object.assign({stage:result.ok?'generated':'invalid-output'},result));
        });
      }catch(error){finish({ok:false,stage:'spawn',error:clean(error)});}
    });
  }
  return {run,inspect:status};
}
function createOsaGenerator(){
 const paths={root:ROOT,staging:path.join(ROOT,'generator-osa'),catalog:CATALOG,manifest:path.join(__dirname,'osa-signal-manifest.json'),generator:GENERATOR};
 return createGenerator({paths,check(directory,io){
  try{
   const speed=readJson(path.join(directory,'de_bmw_infotainment_vehicle_Vehicle2.json'),io);
   const outside=readJson(path.join(directory,'de_bmw_infrastructure_EnvironmentalInformation.json'),io);
   const acl=readJson(path.join(directory,'acl.json'),io);
   const ok=!!(speed.fields&&speed.fields.statusCarSpeed2&&outside.fields&&outside.fields.ExteriorTemperature&&Array.isArray(acl.offers)&&Array.isArray(acl.requests));
   return {ok,mode:'staging-only',aclRegistered:false,activeConfigChanged:false};
  }catch(e){return {ok:false,mode:'staging-only',error:clean(e),aclRegistered:false,activeConfigChanged:false};}
 }});
}
function createGearGenerator(){
 const directory=path.join(ROOT,'generator-cc-gear');
 const paths={root:ROOT,staging:directory,catalog:CATALOG,
  manifest:path.join(__dirname,'cc-gear-manifest.json'),generator:GENERATOR};
 return createGenerator({paths,check(dir,io){
  try{
   const config=readJson(path.join(dir,'de_bmw_infrastructure_VehicleInformation.json'),io);
   const acl=readJson(path.join(dir,'acl.json'),io);
   const fields=config&&config.fields;
   const ok=!!(fields&&fields.statusGearboxDrive&&fields.DataPowerTrain2&&
    Array.isArray(acl.offers)&&Array.isArray(acl.requests));
   return {ok,mode:'staging-only',aclRegistered:false,activeConfigChanged:false};
  }catch(e){return {ok:false,mode:'staging-only',aclRegistered:false,
   activeConfigChanged:false,error:clean(e)};}
 }});
}
module.exports={createGenerator,createOsaGenerator,createGearGenerator,inspect,STAGING,checkStaging};
