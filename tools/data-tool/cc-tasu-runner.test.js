'use strict';
const assert=require('assert'),{EventEmitter}=require('events');
const {createRunner}=require('./cc-tasu-runner');
function makeSpawn(mode,metrics){
 return (node,args,options)=>{
  assert.strictEqual(args[1],'read');
  assert.deepStrictEqual(options.stdio,['ignore','pipe','ignore']);
  metrics.spawned++;
  const proc=new EventEmitter();
  proc.killed=false;proc.kill=()=>{proc.killed=true;};
  proc.stdout=new EventEmitter();proc.stdout.setEncoding=()=>{};
  setImmediate(()=>{
   if(mode==='valid')proc.stdout.emit('data',JSON.stringify({ok:true,stage:'verified-read',
     readings:{frontLeft:{state:'unlatched'},frontRight:{state:'latched'}},
     accessVerified:true})+'\n');
   else if(mode==='invalid')proc.stdout.emit('data','garbage\n');
   else proc.emit('exit',1);
  });
  return proc;
 };
}
(async()=>{
 let metrics={spawned:0};
 const runner=createRunner({spawn:makeSpawn('valid',metrics)});
 const got=await runner.run();assert.strictEqual(got.ok,true);assert.equal(got.readings.frontRight.state,'latched');
 assert.strictEqual(metrics.spawned,1);
 const invalid=await createRunner({spawn:makeSpawn('invalid',metrics)}).run();
 assert.equal(invalid.ok,false);assert.equal(invalid.stage,'invalid');
 const exited=await createRunner({spawn:makeSpawn('exit',metrics)}).run();
 assert.equal(exited.ok,false);assert.equal(exited.stage,'exit');
 console.log('Tool-native TASU isolated runner and fail-closed output PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});
