'use strict';
// Real worker subprocess with a fake SOME/IP module: checks lifecycle and value
// extraction without native bindings, vehicle buses or ECU communications.
const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path');
const {spawn}=require('child_process');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'bmrmodz-signal-worker-'));
const modulePath=path.join(root,'mock-someip.js');
const configPath=path.join(root,'cds.json');
fs.writeFileSync(modulePath,`
exports.buildProxy=(config,instance)=>({
  init:async()=>{},
  subscribe:async({name,onReceive})=>{
    setImmediate(()=>onReceive(name==='statusEngineTemperature'
      ? {temperatureEngineDrive:86,temperatureEngineOilDrive:93}
      : {actualValueRPMEngineCrankshaft:715}));
  },
  getValue:undefined,
  shutdown:async()=>{}
});
`);
fs.writeFileSync(configPath,JSON.stringify({fields:{statusEngineTemperature:{getter:true},statusEngineSpeed2:{getter:true}}}));
function run(mode,field,env){
  return new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,[path.join(__dirname,'signal-worker.js'),mode,field],{env:Object.assign({},process.env,env)});
    let out='',err='';
    const timer=setTimeout(()=>{child.kill('SIGKILL');reject(new Error('worker timeout'));},2500);
    child.stdout.on('data',x=>out+=x);
    child.stderr.on('data',x=>err+=x);
    child.on('error',reject);
    child.on('exit',()=>{
      clearTimeout(timer);
      try{resolve(JSON.parse(out.trim()));}catch(e){reject(new Error('invalid worker reply '+out+' '+err));}
    });
  });
}
async function main(){
  const env={BMRMODZ_SOMEIP_MODULE:modulePath,BMRMODZ_CDS_CONFIG:configPath};
  try{
    const load=await run('load','-',env);
    assert.strictEqual(load.ok,true);
    assert.strictEqual(load.stage,'module-load');
    const temp=await run('sample','statusEngineTemperature',env);
    assert.strictEqual(temp.ok,true);
    assert.strictEqual(temp.value.oil,93);
    assert.strictEqual(temp.validated,true);
    assert.deepStrictEqual(temp.validFields,{oil:true,coolant:true});
    assert.strictEqual(temp.value.coolant,86);
    const staged=await run('staging','statusEngineTemperature',Object.assign({},env,{BMRMODZ_CDS_STAGING_TEST_PATH:configPath}));
    assert.strictEqual(staged.ok,true);
    assert.strictEqual(staged.value.oil,93);
    const rpm=await run('sample','statusEngineSpeed2',env);
    assert.strictEqual(rpm.ok,true);
    assert.strictEqual(rpm.value.rpm,715);
    assert.strictEqual(rpm.validated,true);
    fs.writeFileSync(modulePath,`
exports.buildProxy=()=>({
  init:async()=>{},
  subscribe:async({name,onReceive})=>setImmediate(()=>onReceive(
    name==='statusEngineTemperature'
      ? {temperatureEngineDrive:0,temperatureEngineOilDrive:undefined}
      : {actualValueRPMEngineCrankshaft:0})),
  shutdown:async()=>{}
});`);
    const zero=await run('staging','statusEngineSpeed2',Object.assign({},env,{BMRMODZ_CDS_STAGING_TEST_PATH:configPath}));
    assert.strictEqual(zero.ok,true);
    assert.strictEqual(zero.value.rpm,0);
    const missingOil=await run('staging','statusEngineTemperature',Object.assign({},env,{BMRMODZ_CDS_STAGING_TEST_PATH:configPath}));
    assert.strictEqual(missingOil.ok,false);
    assert.strictEqual(missingOil.stage,'value-invalid');
    assert.strictEqual(missingOil.received,true);
    assert.deepStrictEqual(missingOil.validFields,{oil:false,coolant:true});
    assert.strictEqual(JSON.stringify(missingOil).includes('"value"'),false);
    const missingStaged=await run('staging','statusEngineSpeed2',Object.assign({},env,{BMRMODZ_CDS_STAGING_TEST_PATH:'/no-such-staging-config'}));
    assert.strictEqual(missingStaged.stage,'config');
    const deny=await run('staging','UnknownField',env);
    assert.strictEqual(deny.stage,'allowlist');
    const badConfig=await run('sample','statusEngineTemperature',Object.assign({},env,{BMRMODZ_CDS_CONFIG:'/no-such-file'}));
    assert.strictEqual(badConfig.stage,'config');
    console.log('Data Tool SOME/IP worker: mock load, subscription, extraction, allowlist and missing config passed');
  }finally{
    fs.unlinkSync(modulePath);fs.unlinkSync(configPath);fs.rmdirSync(root);
  }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
