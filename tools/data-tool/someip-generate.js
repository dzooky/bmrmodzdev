'use strict';
// Explicit one-shot BMW generator experiment. Only isolated staging files are
// written; no ACL installation, active configuration replacement, or ECU I/O.
const fs=require('fs'),path=require('path'),cp=require('child_process');
const ROOT='/var/opt/bmrmodz-data-tool';
const STAGING=path.join(ROOT,'generator-test');
const CATALOG='/etc/oap/someip/someip-interfaces.json';
const MANIFEST=path.join(__dirname,'signal-manifest.json');
const GENERATOR=path.join(__dirname,'someip-generator.js');
const CDS='de_bmw_infotainment_vehicle_CDS.json';
const MAX=1024*1024;
function readJson(file){
  const st=fs.statSync(file);
  if(!st.isFile()||st.size<2||st.size>MAX)throw new Error('Invalid generator output file');
  return JSON.parse(fs.readFileSync(file,'utf8'));
}
function inspect(){
  try{
    const config=readJson(path.join(STAGING,CDS));
    const acl=readJson(path.join(STAGING,'acl.json'));
    const fields=config&&config.fields;
    const ok=!!fields&&!!fields.statusEngineTemperature&&!!fields.statusEngineSpeed2
      &&acl&&Array.isArray(acl.offers)&&Array.isArray(acl.requests);
    return {ok:!!ok,mode:'staging-only',configGenerated:true,
      fields:{temperature:!!(fields&&fields.statusEngineTemperature),rpm:!!(fields&&fields.statusEngineSpeed2)},
      aclFileGenerated:!!(acl&&Array.isArray(acl.offers)&&Array.isArray(acl.requests)),
      aclRegistered:false,activeConfigChanged:false,
      note:ok?'Generated in isolated staging; ACL registration and CDS reception unverified':'Generator output incomplete'};
  }catch(e){
    return {ok:false,mode:'staging-only',configGenerated:false,aclFileGenerated:false,
      aclRegistered:false,activeConfigChanged:false,
      error:String(e&&e.message||e).slice(0,140)};
  }
}
function createGenerator(options){
  const opts=options||{},spawn=opts.spawn||cp.spawn,timeoutMs=opts.timeoutMs||12000;
  let attempted=false;
  function run(){
    if(attempted)return Promise.resolve({ok:false,stage:'already-attempted',error:'One generator test per service start'});
    attempted=true;
    // A fixed, tool-owned output folder and fixed manifest avoid caller-controlled writes.
    try{
      if(!fs.statSync(CATALOG).isFile())throw new Error('BMW catalog unavailable');
      if(!fs.statSync(MANIFEST).isFile())throw new Error('Tool manifest unavailable');
      if(!fs.statSync(GENERATOR).isFile())throw new Error('Generator script unavailable');
      fs.mkdirSync(ROOT,{recursive:true,mode:0o700});
      if(fs.existsSync(STAGING))throw new Error('Staging already exists; no overwrite attempted');
      fs.mkdirSync(STAGING,{mode:0o700});
    }catch(e){return Promise.resolve({ok:false,stage:'precheck',error:String(e&&e.message||e).slice(0,140)});}
    return new Promise(resolve=>{
      let child,output='',finished=false;
      const finish=value=>{
        if(finished)return;finished=true;
        clearTimeout(timer);
        if(child&&!child.killed)try{child.kill('SIGKILL');}catch(_){}
        resolve(value);
      };
      const timer=setTimeout(()=>finish({ok:false,stage:'timeout',error:'BMW generator timed out'}),timeoutMs);
      try{
        child=spawn(process.execPath,[GENERATOR,CATALOG,MANIFEST,String(process.getuid?process.getuid():0),STAGING],
          {stdio:['ignore','pipe','pipe'],env:process.env});
        const collect=part=>{output=(output+String(part)).slice(-3000);};
        child.stdout.on('data',collect);
        child.stderr.on('data',collect);
        child.on('error',e=>finish({ok:false,stage:'spawn',error:String(e.message||e).slice(0,140)}));
        child.on('close',code=>{
          if(code!==0)return finish({ok:false,stage:'generator',error:output.replace(/[\r\n]/g,' ').slice(-140)||'Generator exited '+code});
          const check=inspect();
          finish(Object.assign({stage:check.ok?'generated':'invalid-output'},check));
        });
      }catch(e){finish({ok:false,stage:'spawn',error:String(e.message||e).slice(0,140)});}
    });
  }
  return {run,inspect};
}
module.exports={createGenerator,inspect,STAGING};
