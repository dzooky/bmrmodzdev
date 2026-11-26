'use strict';
const fs=require('fs'),{sample,diff}=require('./activity');
const steps=['Turn both rear screens OFF','Turn left rear screen ON','Open rear Apps menu','Open Weather on left rear','Close rear Weather','Open Weather on left rear again','Open Weather on right rear too','Change city on left rear','Close Weather on both rear screens','Turn both rear screens OFF'];
// Each step: start a five-second idle reference, then action window with manual confirmation.
function create(file,io=fs,observe=sample){
 let report={schema:1,version:'0.1.2',events:[]},state='Ready',start=null,baseline=null,phaseAt=0,blocked=false;
 try{const r=JSON.parse(io.readFileSync(file,'utf8'));if(r.schema!==1||r.version!=='0.1.2'||!Array.isArray(r.events)||r.events.length>steps.length||r.events.some((e,i)=>e.event!==steps[i]))throw Error();report=r;}catch(e){if(e.code!=='ENOENT'){state='Invalid';blocked=true;}}
 if(report.events.length===steps.length)state='Complete';
 function tick(now=Date.now()){
 if(state==='Baseline'&&now-phaseAt>=5000){baseline=observe();state='Action';phaseAt=now;}
 }
 function press(now=Date.now()){
 if(blocked||state==='Complete')return;
 if(state==='Ready'){start=observe();phaseAt=now;state='Baseline';return;}
 if(state!=='Action'||now-phaseAt<5000)return;
 const end=observe(),event={event:steps[report.events.length],at:new Date(now).toISOString(),idle:diff(start,baseline),action:diff(baseline,end)};
 const next={...report,events:report.events.concat(event)};
 try{io.writeFileSync(file+'.tmp',JSON.stringify(next),{mode:0o600});io.renameSync(file+'.tmp',file);report=next;state=report.events.length===steps.length?'Complete':'Ready';}catch(_){state='Save failed';}
 }
 return {tick,press,get report(){return report;},get state(){return state;},get phaseAt(){return phaseAt;}};
}
module.exports={steps,create};
