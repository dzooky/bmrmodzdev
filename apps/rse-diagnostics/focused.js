'use strict';
const fs=require('fs');
const {sample,diff}=require('./activity');
const steps=['Turn right rear screen ON (leave Apps closed)','Open Weather on right rear screen','Change city in right rear Weather','Turn right rear screen OFF'];
const WAIT=5000,ACTION=20000,INTERVAL=1000;
const names=['vlan77','vlan144','vlan73','socnet0'];
function readCounters(io=fs){
 const out={};
 try{const lines=io.readFileSync('/proc/net/dev','utf8').split('\n').slice(2);
 for(const line of lines){const m=line.match(/^\s*([\w.-]+):\s*(.*)$/);if(!m||!names.includes(m[1]))continue;const f=m[2].trim().split(/\s+/),v=[Number(f[0]),Number(f[8])];if(f.length>=16&&v.every(x=>Number.isSafeInteger(x)&&x>=0))out[m[1]]=v;}}catch(_){}
 return out;
}
function neighbors(io=fs){
 // Passive IPv4 ARP cache only. Never store addresses or MACs.
 try{const counts={};for(const line of io.readFileSync('/proc/net/arp','utf8').split('\n').slice(1)){const f=line.trim().split(/\s+/);if(names.includes(f[5]))counts[f[5]]=(counts[f[5]]||0)+1;}return counts;}catch(_){return null;}
}
function delta(a,b){return names.map(k=>{const x=a[k],y=b[k];return x&&y&&y.every((v,i)=>v>=x[i])?y.map((v,i)=>v-x[i]):null;});}
function create(file,io=fs,opts={}){
 const observe=opts.observe||(()=>sample(io)),counters=opts.counters||(()=>readCounters(io)),peers=opts.peers||(()=>neighbors(io));
 let report={schema:1,version:'0.1.3',interfaces:names,events:[]},state='Ready',phaseAt=0,lastAt=0,last=null,rows=[],boundary=null,idle=null,neighborStart=null,blocked=false;
 try{const r=JSON.parse(io.readFileSync(file,'utf8'));if(r.schema!==1||r.version!=='0.1.3'||!Array.isArray(r.events)||r.events.length>steps.length||r.events.some((e,i)=>e.event!==steps[i]))throw Error();report=r;}catch(e){if(e.code!=='ENOENT'){state='Invalid';blocked=true;}}
 if(report.events.length===steps.length)state='Complete';
 function press(now=Date.now()){
 if(blocked||!['Ready','Done'].includes(state)||report.events.length>=steps.length)return;
 boundary=observe();neighborStart=peers();last=counters();lastAt=now;phaseAt=now;rows=[];idle=null;state='WAIT';
 }
 function record(now){const current=counters();rows.push({phase:state,ms:now-lastAt,bytes:delta(last,current)});last=current;lastAt=now;}
 function tick(now=Date.now()){
 if(state!=='WAIT'&&state!=='ACTION')return;
 if(now-lastAt>=INTERVAL)record(now);
 if(state==='WAIT'&&now-phaseAt>=WAIT){
 if(now>lastAt)record(now);
 const b=observe();idle=diff(boundary,b);boundary=b;last=counters();lastAt=now;phaseAt=now;state='ACTION';
 }else if(state==='ACTION'&&now-phaseAt>=ACTION){
 if(now>lastAt)record(now);
 const end=observe(),event={event:steps[report.events.length],at:new Date(now).toISOString(),idle,action:diff(boundary,end),series:rows,neighborsBefore:neighborStart,neighborsAfter:peers()};
 const next={...report,events:report.events.concat(event)};
 try{io.writeFileSync(file+'.tmp',JSON.stringify(next),{mode:0o600});io.renameSync(file+'.tmp',file);report=next;state=report.events.length===steps.length?'Complete':'Done';}catch(_){state='Save failed';}
 }
 }
 function remaining(now=Date.now()){return Math.max(0,Math.ceil(((state==='WAIT'?WAIT:ACTION)-now+phaseAt)/1000));}
 return {press,tick,remaining,get report(){return report;},get state(){return state;}};
}
module.exports={steps,create,readCounters,neighbors,delta,names};
