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
    const gen=createGenerator({paths,spawn:spawnFake('Generator parser rejected manifest',1)});
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
    assert.strictEqual(retry.stage,'generator'); // empty staging -> safe retry
    assert.strictEqual(gen.inspect().aclRegistered,false);
    fs.writeFileSync(path.join(paths.staging,'partial-file.json'),'{}');
    assert.strictEqual((await gen.run()).stage,'partial-output');
    assert.ok(fs.existsSync(path.join(paths.staging,'partial-file.json')));
    assert.strictEqual(gen.inspect().stage,'partial-output');
    const staged=checkStaging(paths.staging,fs);
    assert.strictEqual(staged.activeConfigChanged,false);
    assert.strictEqual(staged.aclRegistered,false);
    console.log('Data Tool: retryable generator preflight, retained error and safe staging tests passed');
  }finally{
    fs.rmSync(fixture,{recursive:true,force:true});
  }
}
run().catch(error=>{console.error(error);process.exitCode=1;});
