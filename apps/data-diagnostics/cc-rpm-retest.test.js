'use strict';
const assert=require('assert'),{run}=require('./cc-rpm-retest');
(async()=>{
 const calls=[];let tick=0;
 const request=async q=>{
  calls.push(q.op+' '+q.consumer);
  if(q.op==='cdsDemand')return {ok:true};
  if(q.op==='cdsRelease')return {ok:true};
  tick++;
  return {ok:true,ready:true,running:true,fields:{rpm:{valid:true,ageMs:200}},values:{rpm:3000+tick}};
 };
 const r=await run(request,{rounds:5,delayMs:0,sleep:async()=>{}});
 assert.strictEqual(r.ok,true);assert.strictEqual(r.stage,'rpm-sample');
 assert.strictEqual(r.rpm,3001.25);assert.strictEqual(r.samples,5);
 assert.strictEqual(r.released,true);assert.strictEqual(r.minRpm,750.25);
 assert.deepStrictEqual(calls,[
 'cdsDemand diagnostics-secondary','cdsSnapshot diagnostics-secondary',
 'cdsSnapshot diagnostics-secondary','cdsSnapshot diagnostics-secondary',
 'cdsDemand diagnostics-secondary','cdsSnapshot diagnostics-secondary',
 'cdsSnapshot diagnostics-secondary','cdsRelease diagnostics-secondary']);
 const zero=await run(async q=>q.op==='cdsSnapshot'?
 {ok:true,ready:true,running:true,fields:{rpm:{valid:true,ageMs:10}},values:{rpm:0}}:{ok:true},
 {rounds:1,delayMs:0});
 assert.equal(zero.stage,'zero-rpm');assert.equal(zero.ok,false);assert.equal(zero.released,true);
 const no=await run(async q=>q.op==='cdsSnapshot'?
 {ok:true,ready:false,running:true,error:'no-proxy',fields:{rpm:{valid:false}},values:{}}:{ok:true},
 {rounds:1,delayMs:0});
 assert.equal(no.stage,'worker-error');assert.equal(no.workerError,'no-proxy');
 const missing=await run(async q=>q.op==='cdsSnapshot'?
 {ok:true,ready:true,running:true,fields:{rpm:{valid:false}},values:{rpm:65535}}:{ok:true},
 {rounds:1,delayMs:0});
 assert.equal(missing.stage,'no-fresh-rpm');
 const rejected=await run(async()=>({ok:false,error:'unsupported'}),{rounds:1,delayMs:0});
 assert.equal(rejected.stage,'demand-rejected');assert.equal(rejected.released,false);
 const broken=await run(async q=>{if(q.op==='cdsSnapshot')throw Error('offline');return {ok:true};},{rounds:1,delayMs:0});
 assert.equal(broken.stage,'request-error');assert.equal(broken.released,true);
 console.log('Combined RPM diagnostics source/units/lease/release/invalid PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});
