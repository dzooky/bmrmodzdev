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
  assert.strictEqual(ENDPOINT,'/brmmodz.php');
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
 await assert.rejects(upload({},'/unused',{https:fake}),/Invalid diagnostic report/);
 assert.strictEqual(calls,1);
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
