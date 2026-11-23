'use strict';
const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path');
const {createEngine}=require('./cds-engine');
const worker=path.join(os.tmpdir(),'bmrmodz-cds-engine-test-'+process.pid+'.js');
fs.writeFileSync(worker,`
'use strict';
let n=0;
process.stdout.write(JSON.stringify({type:'ready'})+'\\n');
setInterval(()=>{
  n++;
  process.stdout.write(JSON.stringify({type:'sample',field:'statusEngineTemperature',
    value:{oil:80+n,coolant:75+n}})+'\\n');
  process.stdout.write(JSON.stringify({type:'sample',field:'statusEngineSpeed2',
    value:{rpm:0}})+'\\n');
},60);
process.on('SIGTERM',()=>process.exit(0));
`);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function main(){
  const engine=createEngine({worker,leaseMs:500,staleMs:300});
  try{
    assert.strictEqual(engine.status().running,false);
    assert.strictEqual(engine.demand('unknown').ok,false);
    const first=engine.demand('diagnostics');
    assert.strictEqual(first.running,true);
    await sleep(230);
    const snap=engine.snapshot();
    assert.strictEqual(snap.fields.oil.valid,true);
    assert.strictEqual(snap.fields.coolant.valid,true);
    assert.strictEqual(snap.fields.rpm.valid,true);
    assert.strictEqual(snap.values.rpm,0);
    const sampleCount=snap.stats.samples;
    engine.demand('diagnostics');
    assert.strictEqual(engine.status().stats.starts,1);
    await sleep(200);
    assert.ok(engine.snapshot().stats.samples>sampleCount);
    const stopped=engine.release('diagnostics');
    assert.strictEqual(stopped.running,false);
    assert.strictEqual(stopped.consumers,0);
    await sleep(350);
    assert.strictEqual(engine.snapshot().fields.oil.valid,false);
    assert.strictEqual(engine.snapshot().values.oil,undefined);
    engine.demand('diagnostics');
    await sleep(130);
    assert.strictEqual(engine.status().stats.starts,2);
    await sleep(700);
    assert.strictEqual(engine.status().running,false);
    assert.strictEqual(engine.status().consumers,0);
    // Second test identity has its own lease and receives only manifest fields.
    const starts=engine.status().stats.starts;
    engine.demand('diagnostics');
    engine.demand('diagnostics-secondary');
    assert.strictEqual(engine.status().stats.starts,starts+1);
    await sleep(200);
    const second=engine.snapshot('diagnostics-secondary');
    assert.strictEqual(second.fields.rpm.valid,true);
    assert.strictEqual(second.fields.coolant.valid,true);
    assert.strictEqual(Object.prototype.hasOwnProperty.call(second.fields,'oil'),false);
    assert.strictEqual(Object.prototype.hasOwnProperty.call(second.values,'oil'),false);
    assert.strictEqual(engine.snapshot('unknown').ok,false);
    assert.strictEqual(engine.release('diagnostics').running,true);
    assert.strictEqual(engine.status().consumers,1);
    assert.strictEqual(engine.release('diagnostics-secondary').running,false);
    assert.strictEqual(engine.snapshot('diagnostics-secondary').fields.rpm.valid,false);
    assert.strictEqual(engine.demand('unknown').ok,false);
    console.log('CDS engine: shared subscriptions, independent consumers, filtered cache, lease expiry and stop passed');
  }finally{engine.close();fs.unlinkSync(worker);}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
