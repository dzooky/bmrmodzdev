'use strict';
// Vehicle-independent activation policy. Does not send vehicle commands.
// BG adapter must supply validated startup, fresh temperatures, belt and gearbox
// signals before this policy can drive any car functions.
const MINUTES=Object.freeze([1,2,3,5]);
const POSITIONS=Object.freeze(['frontLeft','frontRight','rearLeft','rearRight']);
function create({waitMinutes=3}={}){
 if(!MINUTES.includes(waitMinutes))throw Error('Invalid belt waiting interval');
 let active=false,startedAt=null,timerAt=null,deadline=null;
 const rows=new Map(),attempted=new Set(),completed=new Set();
 function start(jobs,at){
  if(active)return false;
  if(!Number.isFinite(at)||!Array.isArray(jobs))throw Error('Invalid cycle');
  const seen=new Set();
  for(const j of jobs){
   if(!j||!(/^(frontLeft|frontRight|rearLeft|rearRight)(Heating|Ventilation)$/.test(j.key)||j.key==='steeringHeating')||
      seen.has(j.key)||!Number.isFinite(j.threshold)||!Number.isInteger(j.level)||j.level<1||j.level>3||
      typeof j.sensor!=='string'||!j.sensor)throw Error('Invalid job');
   if(j.key==='steeringHeating'&&j.level!==1)throw Error('Invalid steering level');
   seen.add(j.key);
  }
  active=true;startedAt=at;timerAt=null;deadline=null;rows.clear();attempted.clear();completed.clear();
  for(const j of jobs)rows.set(j.key,{job:Object.assign({},j),eligible:null});
  return true;
 }
 function stop(){active=false;startedAt=null;timerAt=null;deadline=null;rows.clear();attempted.clear();completed.clear();}
 function tick({at,engineRunning,gear,rpm,temperatures={},belts={}}={}){
  if(!active||engineRunning!==true||!Number.isFinite(at)||at<startedAt)return [];
  const ready=[];
  // The temperature decision is immutable for each function after its first
  // valid reading. Missing readings never become a guessed activation.
  for(const [key,row] of rows){
   if(row.eligible!==null)continue;
   const value=temperatures[row.job.sensor];
   if(!Number.isFinite(value))continue;
   row.eligible=row.job.mode==='Heating'||key==='steeringHeating'
     ?value<=row.job.threshold:value>=row.job.threshold;
  }
  // D and >1000 RPM ONLY start the countdown for unbuckled seats.
  // They are never a gate on already-buckled passengers.
  const waiting=Array.from(rows.values()).some(row=>
   row.eligible===true&&!attempted.has(row.job.key)&&belts[row.job.position]==='unlatched');
  if(deadline===null&&waiting&&gear==='D'&&Number.isFinite(rpm)&&rpm>1000){
   timerAt=at;deadline=at+waitMinutes*60000;
  }
  for(const [key,row] of rows){
   if(row.eligible!==true||attempted.has(key))continue;
   const position=row.job.position;
   if(belts[position]!=='latched')continue; // unknown is not unlatched
   if(deadline!==null&&at>=deadline)continue; // strict expiry
   attempted.add(key); // at-most-once intent, no ambiguous retry
   ready.push(Object.assign({},row.job));
  }
  return ready;
 }
 function acknowledge(key,success){
  if(!attempted.has(key))return false;
  if(success===true)completed.add(key);
  return true;
 }
 function status(){return {active,startedAt,timerAt,deadline,
  eligible:Object.fromEntries(Array.from(rows,([k,r])=>[k,r.eligible])),
  attempted:Array.from(attempted),completed:Array.from(completed)};}
 return {start,stop,tick,acknowledge,status};
}
module.exports={create,MINUTES,POSITIONS};
