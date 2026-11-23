'use strict';
const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path'),events=require('events');
const {createGenerator,checkStaging,STAGING}=require('./someip-generate');
assert.ok(STAGING.endsWith('/generator-test'));
const fixture=fs.mkdtempSync(path.join(os.tmpdir(),'bmrmodz-generator-'));
const paths={root:fixture,staging:path.join(fixture,'generator-test'),
  catalog:path.join(fixture,'catalog.json'),manifest:path.join(fixture,'manifest.json'),
  generator:path.join(fixture,'gen.js')};
function spawnFake(errorOutput,code){
  return function(){
    const child=new events.EventEmitter();
    child.stdout=new events.EventEmitter();child.stderr=new events.EventEmitter();
    child.kill=()=>{child.killed=true;};
    setImmediate(()=>{child.stderr.emit('data',errorOutput);child.emit('close',code);});
    return child;
  };
}
async function run(){
  try{
    // Emulate the MGU's older Node behavior: mkdir on an existing
    // directory raises EEXIST even if recursive:true was requested.
    const oldNodeFs=Object.assign({},fs,{
      mkdirSync(directory,options){
        if(fs.existsSync(directory)){
          const error=new Error("EEXIST: file already exists, mkdir '"+directory+"'");
          error.code='EEXIST';
          throw error;
        }
        return fs.mkdirSync(directory,options);
      }
    });
    const gen=createGenerator({paths,fs:oldNodeFs,spawn:spawnFake('Generator parser rejected manifest',1)});
    const first=await gen.run();
    assert.strictEqual(first.stage,'precheck');
    assert.strictEqual((await gen.run()).stage,'precheck'); // failed precheck can retry
    assert.strictEqual(gen.inspect().stage,'precheck');
    for(const file of [paths.catalog,paths.manifest,paths.generator])fs.writeFileSync(file,'{}');
    const result=await gen.run();
    assert.strictEqual(result.stage,'generator');
    assert.ok(result.error.includes('parser rejected manifest'));
    assert.strictEqual(gen.inspect().stage,'generator'); // root cause exposed in report
    const retry=await gen.run();
    assert.strictEqual(retry.stage,'generator'); // existing empty staging -> safe retry, no EEXIST
    assert.strictEqual(gen.inspect().aclRegistered,false);
    fs.writeFileSync(path.join(paths.staging,'partial-file.json'),'{}');
    assert.strictEqual((await gen.run()).stage,'partial-output');
    assert.ok(fs.existsSync(path.join(paths.staging,'partial-file.json')));
    assert.strictEqual(gen.inspect().stage,'partial-output');
    const staged=checkStaging(paths.staging,fs);
    assert.strictEqual(staged.activeConfigChanged,false);
    assert.strictEqual(staged.aclRegistered,false);
    const freshPaths=Object.assign({},paths,{
      root:path.join(fixture,'fresh-root'),
      staging:path.join(fixture,'fresh-root','generator-test')
    });
    const freshGen=createGenerator({paths:freshPaths,fs:oldNodeFs,spawn:spawnFake('Generator parser rejected manifest',1)});
    assert.strictEqual((await freshGen.run()).stage,'generator'); // missing root created once
    assert.strictEqual((await freshGen.run()).stage,'generator'); // existing root and empty staging reused
    assert.ok(fs.statSync(freshPaths.root).isDirectory());
    console.log('Data Tool: MGU EEXIST compatibility, retry, retained error and staging safety passed');
  }finally{
    fs.rmSync(fixture,{recursive:true,force:true});
  }
}
run().catch(error=>{console.error(error);process.exitCode=1;});
