'use strict';
const assert=require('assert'),EventEmitter=require('events');
const {upload,HOST,ENDPOINT}=require('./upload');
const result={schema:1,application:'bmrmodz-data-diagnostics',startedAt:'2026-11-22T22:00:00Z',
 finishedAt:'2026-11-22T22:01:00Z',results:[{id:'dde',label:'DDE / DPF',status:'PASS',durationMs:12,detail:'Matching UDS response received'}],
 totals:{pass:1,fail:0,skip:0},deviceVerified:false,vin:'SHOULD_NEVER_LEAVE_MGU'};
const reportId='0123456789abcdef01234567';
let calls=0,body='';
const fake={
 request(options,callback){
  calls++;
  assert.strictEqual(options.hostname,HOST);
  assert.strictEqual(options.path,ENDPOINT);
  assert.strictEqual(HOST,'dzooky.eu');
  assert.strictEqual(ENDPOINT,'/bmrmodz.php');
  assert.strictEqual(options.port,443);
  assert.strictEqual(options.timeout,12000);
  assert.strictEqual(options.headers['Content-Type'],'application/json');
  assert.strictEqual(Object.hasOwn(options.headers,'X-BMRMODZ-Token'),false);
  assert.strictEqual(typeof options.lookup,'function');
  assert.strictEqual(options.method,'POST');
  const req=new EventEmitter();
  req.end=content=>{
   body=content;
   const res=new EventEmitter();res.statusCode=201;res.setEncoding=()=>{};
   process.nextTick(()=>{
    callback(res);res.emit('data',JSON.stringify({ok:true,id:reportId}));res.emit('end');
   });
  };
  req.destroy=error=>req.emit('error',error);
  return req;
 }
};
async function main(){
 const answer=await upload(result,'/unused',{https:fake});
 assert.strictEqual(answer.id,reportId);
 assert.strictEqual(calls,1);
 assert.strictEqual(body.includes('SHOULD_NEVER_LEAVE_MGU'),false);
 assert.strictEqual(JSON.parse(body).results[0].id,'dde');
 const focused={...result,totals:{pass:17,fail:1,skip:4},
 someipTimings:{environmentMs:540,nativeLoadMs:241,cdsStreamMs:1930,unknownMs:500,configMs:-1},results:[
   {id:'service',label:'Service',status:'PASS',detail:'Service available'},
   {id:'dde',label:'DDE / DPF',status:'FAIL',detail:'No matching response; shortTASU reject 3'},
   {id:'egs',label:'EGS / transmission',status:'PASS',detail:'Matching response'},
   {id:'ihka',label:'IHKA',status:'PASS',detail:'Successful'},
   {id:'someipEnvironment',label:'SOME/IP environment',status:'PASS',durationMs:540,detail:'Catalog yes'},
   {id:'someipLoad',label:'SOME/IP native',status:'PASS',durationMs:241,detail:'Native loaded'},
   {id:'cdsStream',label:'CDS',status:'FAIL',durationMs:1930,detail:'Unexpected stream failure'},
   {id:'someipConfig',label:'SOME/IP config',status:'SKIP',detail:'Expected skip'}
 ]};
 await upload(focused,'/unused',{https:fake});
 const transmitted=JSON.parse(body);
 assert.strictEqual(transmitted.totals.pass,17);
 assert.strictEqual(transmitted.totals.fail,1);
 assert.strictEqual(Object.hasOwn(transmitted,'someipTimings'),false);
 assert.deepStrictEqual(Object.keys(transmitted).sort(),
   ['schema','application','startedAt','finishedAt','totals','results','deviceVerified'].sort());
 assert.strictEqual(transmitted.results.find(x=>x.id==='someipEnvironment').durationMs,540);
 assert.strictEqual(transmitted.results.find(x=>x.id==='someipLoad').durationMs,241);
 assert.deepStrictEqual(transmitted.results.map(x=>x.id),['dde','egs','someipEnvironment','someipLoad','cdsStream']);
 assert.ok(transmitted.results[0].detail.includes('shortTASU reject 3'));
 assert.strictEqual(transmitted.results.some(x=>x.id==='ihka'||x.id==='service'),false);

 const before={...result,snapshotPhase:'before',
  dpfSnapshot:{ok:true,engine:'B57',values:{soot:3.91,ash:1.83,since:120,average:340},
    vin:'PRIVATE_TEST_MARKER'}};
 await upload(before,'/unused',{https:fake});
 const dpfPayload=JSON.parse(body);
 assert.strictEqual(dpfPayload.results[0].id,'dde');
 assert.ok(dpfPayload.results[0].detail.startsWith('DPF B57 S=3.91g A=1.83g D=120km AVG=340km'));
 assert.strictEqual(Object.hasOwn(dpfPayload,'dpfSnapshot'),false);
 assert.strictEqual(Object.hasOwn(dpfPayload,'snapshotPhase'),false);
 assert.strictEqual(body.includes('PRIVATE_TEST_MARKER'),false);
 const measured={...before,results:[
  {id:'dde',label:'DDE',status:'PASS',detail:'Matching response'},
  {id:'egs',label:'EGS',status:'PASS',detail:'Matching response'},
  {id:'cdsStream',label:'CDS',status:'PASS',detail:'Shared CDS refreshed'}],
  vehicleSnapshot:{transmissionOil:61,engine:{oil:90,coolant:85,rpm:750},
   footwell:{frontLeft:18,frontRight:19,rearLeft:17,rearRight:16},
   forbiddenId:'PRIVATE_TEST_MARKER'}};
 await upload(measured,'/unused',{https:fake});
 const vehiclePayload=JSON.parse(body);
 assert.ok(vehiclePayload.results.find(x=>x.id==='egs').detail.includes('ATF=61C'));
 assert.ok(vehiclePayload.results.find(x=>x.id==='egs').detail.includes('IHKA FL=18'));
 assert.ok(vehiclePayload.results.find(x=>x.id==='cdsStream').detail.includes('CDS oil=90C'));
 assert.strictEqual(Object.hasOwn(vehiclePayload,'vehicleSnapshot'),false);
 assert.strictEqual(body.includes('PRIVATE_TEST_MARKER'),false);
 const gateway={...result,
  notes:['Broker IPC: PASS (synthetic broker plus local socket only; production authorization not verified).'],
  results:[{id:'brokerGateway',label:'Broker test',status:'FAIL',detail:'Test incomplete'},
   {id:'dde',label:'DDE',status:'PASS',detail:'Read succeeded'}]};
 await upload(gateway,'/unused',{https:fake});
 const gatewayPayload=JSON.parse(body);
 assert.strictEqual(gatewayPayload.notes.length,1);
 assert.strictEqual(gatewayPayload.notes[0].startsWith('Broker IPC: PASS'),true);
 assert.strictEqual(gatewayPayload.results.some(x=>x.id==='brokerGateway'),false,
   'Strict upload backend must not receive a new test row');
 const malicious={...before,dpfSnapshot:{ok:true,engine:'B57',
  values:{soot:'12;123',ash:1,since:100,average:200}}};
 await upload(malicious,'/unused',{https:fake});
 assert.strictEqual(JSON.parse(body).results[0].detail,'Matching UDS response received');
 await assert.rejects(upload({},'/unused',{https:fake}),/Invalid diagnostic report/);
 assert.strictEqual(calls,6);
 // Simulate common hosting error pages and a response larger than the 4 KB cap.
 async function rejectReply(status,contentType,payload,pattern){
   const backend={request(options,callback){
     const req=new EventEmitter();
     req.end=()=>{
       const res=new EventEmitter();
       res.statusCode=status;res.headers={'content-type':contentType};res.setEncoding=()=>{};
       res.destroy=()=>res.emit('error',new Error('stream closed'));
       process.nextTick(()=>{callback(res);res.emit('data',payload);res.emit('end');});
     };
     req.destroy=e=>req.emit('error',e);
     return req;
   }};
   await assert.rejects(upload(result,'/unused',{https:backend}),pattern);
 }
 await rejectReply(403,'application/json',JSON.stringify({ok:false,error:'HTTPS required'}),/HTTP 403 application\/json: HTTPS required/);
 await rejectReply(404,'text/html','<html><body>Not Found</body></html>',/HTTP 404 text\/html: Non-JSON reply Not Found/);
 await rejectReply(200,'text/html','<html><body>'+('A'.repeat(4400))+'</body></html>',/HTTP 200 text\/html: Reply >4 KB/);
 console.log('Data Diagnostics: HTTPS upload status, content type, sanitized preview and reply cap passed');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
