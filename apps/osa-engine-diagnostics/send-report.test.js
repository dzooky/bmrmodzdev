'use strict';
const assert=require('assert'),EventEmitter=require('events');
const {build,send}=require('./send-report');
const sample={schema:1,application:'osa-engine-diagnostics',version:'0.1.1',
 startedAt:'2026-11-27T14:40:00Z',finishedAt:'2026-11-27T14:40:15Z',
 native:{status:'complete',subscribed:true,available:true,
  values:{oil:{raw:128,value:80,at:'2026-11-27'},coolant:{raw:130,value:82},rpm:{raw:3200,value:800}},
  events:{oil:2,coolant:2,rpm:3},errors:[]},
 tool:{status:'partial',subscribed:true,available:true,
  values:{oil:{raw:128,value:80,ageMs:200,sampledAt:'2026-11-27'},coolant:null,rpm:{raw:3200,value:800}},
  events:{oil:9,coolant:9,rpm:9},invalid:['coolant'],errors:['NO_CDS_SAMPLE']},
 comparison:{oil:{native:80,tool:80,delta:0,state:'both'},coolant:{native:82,tool:null,delta:null,state:'native-only'},
  rpm:{native:800,tool:800,delta:0,state:'both'}},vin:'PRIVATE_VIN',deviceToken:'PRIVATE_TOKEN'};
(async()=>{
 const payload=build(sample);
 assert.equal(payload.application,'bmrmodz-data-diagnostics');
 assert.equal(payload.runMode,'osa_engine_compare');
 assert.equal(payload.results[0].id,'cdsStream');
 assert(payload.results[0].detail.startsWith('osa_engine'));
 assert.equal(payload.notes.osa_engine_report.native.values.oil.raw,128);
 assert.equal(payload.notes.osa_engine_report.tool.invalid[0],'coolant');
 assert(!JSON.stringify(payload).includes('PRIVATE_'));
 const id='0123456789abcdef01234567';
 let body=null;
 const https={request(options,callback){
  assert.equal(options.hostname,'dzooky.eu');assert.equal(options.path,'/bmrmodz.php');
  assert.equal(options.method,'POST');assert.equal(options.port,443);
  const req=new EventEmitter();
  req.end=value=>{body=JSON.parse(value);
   const response=new EventEmitter();response.statusCode=201;response.headers={'content-type':'application/json'};response.setEncoding=()=>{};
   process.nextTick(()=>{callback(response);response.emit('data',JSON.stringify({ok:true,id}));response.emit('end');});
  };req.destroy=e=>req.emit('error',e);return req;
 }};
 const result=await send(sample,'/unused',{https});
 assert.equal(result.id,id);
 assert.equal(body.runMode,'osa_engine_compare');
 assert.equal(body.notes.osa_engine_report.comparison.coolant.state,'native-only');
 assert(!JSON.stringify(body).includes('PRIVATE_'));
 assert.throws(()=>build({...sample,application:'bad'}),/Invalid osa_engine report/);
 const reject={request(options,callback){
  const req=new EventEmitter();
  req.end=()=>{const r=new EventEmitter();r.statusCode=422;r.headers={'content-type':'application/json'};r.setEncoding=()=>{};
   process.nextTick(()=>{callback(r);r.emit('data',JSON.stringify({ok:false,error:'unsupported report'}));r.emit('end');});};
  req.destroy=e=>req.emit('error',e);return req;
 }};
 await assert.rejects(send(sample,'/unused',{https:reject}),/HTTP 422/);
 console.log('osa_engine prefix, complete sanitized JSON, manual HTTPS upload, server ID and rejection PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});
