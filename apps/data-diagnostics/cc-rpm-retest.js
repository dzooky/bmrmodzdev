'use strict';
// On-demand RPM proof using the existing CDS engine diagnostics-secondary lease.
// No new SOME/IP manifest, ECU DID, vehicle control or persistent polling.
const sleepDefault=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function run(request,opts){
 const settings=opts||{},sleep=settings.sleep||sleepDefault;
 const rounds=settings.rounds||12,delayMs=settings.delayMs===undefined?500:settings.delayMs;
 const report={ok:false,stage:'no-fresh-rpm',source:'CDS.statusEngineSpeed2.actualValueRPMEngineCrankshaft',
  raw:null,rpm:null,samples:0,distinctSamples:0,minRpm:null,maxRpm:null,
  ageMs:null,workerReady:false,workerRunning:false,workerError:null,
  error:null,released:false,reference:'diagnostics-secondary'};
 const seen=new Set();let granted=false;
 try{
  for(let i=0;i<rounds;i++){
   // Diagnostics lease is 3 seconds. Renew explicitly, never use status to renew.
   if(i%3===0){
    const demand=await request({op:'cdsDemand',consumer:'diagnostics-secondary'},{timeoutMs:3000});
    if(!demand||demand.ok!==true){report.stage='demand-rejected';report.error=String(demand&&(demand.error||demand.stage)||'no reply').slice(0,100);break;}
    granted=true;
   }
   const snap=await request({op:'cdsSnapshot',consumer:'diagnostics-secondary'},{timeoutMs:3000});
   if(!snap||snap.ok!==true){report.stage='snapshot-error';report.error=String(snap&&(snap.error||snap.stage)||'no reply').slice(0,100);break;}
   report.workerReady=!!snap.ready;report.workerRunning=!!snap.running;
   report.workerError=snap.error?String(snap.error).slice(0,100):null;
   const field=snap.fields&&snap.fields.rpm,raw=snap.values&&snap.values.rpm;
   if(field&&field.valid===true&&Number.isInteger(raw)&&raw>=0&&raw<65535){
    const rpm=raw*0.25;
    report.raw=raw;report.rpm=rpm;
    report.ageMs=Number.isFinite(field.ageMs)?field.ageMs:null;
    report.samples++;
    // Increment only if sample age is different from the last observed sample;
    // repeated reads of the same cache do not count as new measurements.
    const age=report.ageMs===null?'no-age':String(Date.now()-report.ageMs);
    if(!seen.has(age)){seen.add(age);report.distinctSamples++;}
    report.minRpm=report.minRpm===null?rpm:Math.min(report.minRpm,rpm);
    report.maxRpm=report.maxRpm===null?rpm:Math.max(report.maxRpm,rpm);
   }
   if(i+1<rounds)await sleep(delayMs);
  }
  if(report.stage==='no-fresh-rpm'){
   if(report.samples===0)report.stage=report.workerError?'worker-error':'no-fresh-rpm';
   else if(report.raw===0)report.stage='zero-rpm';
   else {report.ok=true;report.stage='rpm-sample';}
  }
 }catch(e){report.stage='request-error';report.error=String(e&&e.message||e).slice(0,100);}
 finally{
  if(granted)try{const release=await request({op:'cdsRelease',consumer:'diagnostics-secondary'},{timeoutMs:3000});report.released=!!(release&&release.ok);}catch(e){report.error=(report.error||'')+' release: '+String(e&&e.message||e).slice(0,60);}
 }
 return report;
}
module.exports={run};
