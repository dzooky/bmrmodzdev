'use strict';
const fs=require('fs'),{events}=require('./probe');
const keys=['tcp','tcp6','udp','udp6','unix'];
const count=n=>Number.isSafeInteger(n)&&n>=0;
function validate(r){
 if(!r||r.schema!==1||r.version!=='0.1.0'||!Array.isArray(r.events)||r.events.length<1||r.events.length>10)throw Error('Invalid report');
 const names=(a,re,max)=>{if(!Array.isArray(a)||a.length>max||a.some(x=>typeof x!=='string'||!re.test(x)))throw Error('Invalid names');return a.slice();};
 return {schema:1,version:r.version,events:r.events.map((e,i)=>{
 const o=e.observation;if(e.event!==events[i]||typeof e.at!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(e.at)||!o||typeof o.procReadable!=='boolean'||typeof o.interfacesReadable!=='boolean'||!count(o.procSkipped)||!o.sockets)throw Error('Invalid observation');
 const sockets={};for(const k of keys){const v=o.sockets[k];if(v!==null&&!count(v))throw Error('Invalid count');sockets[k]=v;}
 return {event:e.event,at:e.at,observation:{processes:names(o.processes,/^[\w. -]{1,64}$/,2048),procReadable:o.procReadable,procSkipped:o.procSkipped,interfaces:names(o.interfaces,/^[\w.-]{1,32}$/,64),interfacesReadable:o.interfacesReadable,sockets}};
 })};
}
function load(file,io=fs){try{return {report:validate(JSON.parse(io.readFileSync(file,'utf8'))),state:'Loaded'};}catch(e){return {report:null,state:e.code==='ENOENT'?'Missing':'Invalid'};}}
function subtract(a,b){const rest=b.slice();return a.filter(x=>{const i=rest.indexOf(x);if(i<0)return true;rest.splice(i,1);return false;});}
function compare(r,i){const a=r.events[0].observation,b=r.events[i].observation;const p=a.procReadable&&b.procReadable&&!a.procSkipped&&!b.procSkipped,n=a.interfacesReadable&&b.interfacesReadable;
 return {processAdded:p?subtract(b.processes,a.processes):null,processRemoved:p?subtract(a.processes,b.processes):null,interfaceAdded:n?subtract(b.interfaces,a.interfaces):null,interfaceRemoved:n?subtract(a.interfaces,b.interfaces):null,sockets:Object.fromEntries(keys.map(k=>[k,a.sockets[k]===null||b.sockets[k]===null?null:b.sockets[k]-a.sockets[k]]))};}
function envelope(r){const report=validate(r);return {schema:1,application:'bmrmodz-data-diagnostics',runMode:'rse-diagnostics-0.1.1',results:[],notes:{rseReport:report}};}
module.exports={validate,load,compare,envelope};
