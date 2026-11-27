'use strict';
// Strict legacy backend adapter for isolated OSA Engine Diagnostics uploads.
const {upload}=require('./upload');
const PREFIX='osa_engine';
const num=v=>typeof v==='number'&&Number.isFinite(v)?v:null;
const str=v=>typeof v==='string'?v.replace(/[\x00-\x1f\x7f]/g,' ').slice(0,120):'';
const flag=v=>v===true;
function measurement(v){
 if(!v||typeof v!=='object')return null;
 const x={raw:num(v.raw),value:num(v.value)};
 if(typeof v.at==='string')x.at=str(v.at);
 if(typeof v.sampledAt==='string')x.sampledAt=str(v.sampledAt);
 if(Number.isFinite(v.ageMs))x.ageMs=v.ageMs;
 return x;
}
function source(s,name){
 const v=s&&typeof s==='object'?s:{},values={},events={};
 for(const k of ['oil','coolant','rpm']){
  values[k]=measurement(v.values&&v.values[k]);
  events[k]=Number.isInteger(v.events&&v.events[k])&&v.events[k]>=0?Math.min(v.events[k],100000):null;
 }
 return {source:name,status:['complete','partial','missing'].includes(v.status)?v.status:'missing',
  subscribed:flag(v.subscribed),available:flag(v.available),values,events,
  invalid:Array.isArray(v.invalid)?v.invalid.filter(x=>['oil','coolant','rpm'].includes(x)).slice(0,3):[],
  errors:Array.isArray(v.errors)?v.errors.slice(0,8).map(str):[]};
}
function build(report){
 if(!report||report.schema!==1||report.application!=='osa-engine-diagnostics'||!report.native||!report.tool||!report.comparison)
  throw Error('Invalid osa_engine report');
 const native=source(report.native,'native'),tool=source(report.tool,'data-tool'),comparison={};
 for(const k of ['oil','coolant','rpm']){
  const r=report.comparison[k]||{};
  comparison[k]={native:num(r.native),tool:num(r.tool),delta:num(r.delta),
   state:['both','native-only','tool-only','neither'].includes(r.state)?r.state:'neither'};
 }
 const details={version:str(report.version),startedAt:str(report.startedAt),finishedAt:str(report.finishedAt),
  readOnly:true,testOrder:['native','data-tool'],native,tool,comparison};
 const complete=native.status==='complete'&&tool.status==='complete';
 const detail=[PREFIX,'native='+native.status,'tool='+tool.status,
  ...['oil','coolant','rpm'].map(k=>k+':'+comparison[k].state)].join(' ');
 return {schema:1,application:'bmrmodz-data-diagnostics',runMode:PREFIX+'_compare',
  startedAt:details.startedAt,finishedAt:details.finishedAt,deviceVerified:false,
  totals:{pass:complete?1:0,fail:complete?0:1,skip:0},
  results:[{id:'cdsStream',label:PREFIX+' CDS comparison',status:complete?'PASS':'FAIL',
   durationMs:0,detail:detail.slice(0,160)}],
  notes:{osa_engine_report:details}};
}
function send(report,dataDir,options){return upload(build(report),dataDir,options);}
module.exports={build,send,PREFIX};
