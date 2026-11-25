'use strict';
const fs=require('fs'),os=require('os'),path=require('path'),net=require('net'),assert=require('assert'),{serve}=require('./service');
(async()=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'bt-')),socket=path.join(dir,'ctl.sock');const s=serve({socket,state:path.join(dir,'state.json'),connect:async()=>{throw Error('Unexpected connection');}});try{await new Promise((resolve,reject)=>{s.server.once('listening',resolve);s.server.once('error',reject);});const ask=req=>new Promise((resolve,reject)=>{const c=net.createConnection(socket);let b='';c.on('connect',()=>c.write(JSON.stringify(req)+'\n'));c.on('data',x=>b+=x);c.on('end',()=>resolve(JSON.parse(b)));c.on('error',reject);});const h=await ask({api:1,op:'status'});assert(h.ok);assert.equal(h.rules,0);assert.equal(h.connected,false);assert.equal((await ask({api:1,op:'register'})).ok,false);}finally{s.close();await new Promise(r=>s.server.once('close',r));for(const name of fs.readdirSync(dir))fs.unlinkSync(path.join(dir,name));fs.rmdirSync(dir);}console.log('Service tests passed');})().catch(e=>{console.error(e);process.exitCode=1;});

(async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'bt-notify-')),socket=path.join(dir,'ctl.sock'),nt=path.join(dir,'nt.sock');let received=[],valid=false;
 const fake=net.createServer(c=>{let raw='';c.on('data',x=>{raw+=x;const n=raw.indexOf('\n');if(n>=0){received.push(JSON.parse(raw.slice(0,n)));c.end(JSON.stringify({ok:true,status:'queued'})+'\n');}});});
 await new Promise(r=>fake.listen(nt,r));
 const s=serve({socket,state:path.join(dir,'state.json'),notificationSocket:nt,armMs:50,connect:async()=>({close(){},async request(r){if(r.op==='catalog')return {ok:true,fields:[{name:'dpf.b57.request',minFreshnessMs:5000}]};if(r.op==='snapshot')return {ok:true,active:true,fields:{'dpf.b57.request':{valid,raw:0,sampledAt:new Date().toISOString()}}};return {ok:true};}})});
 const ask=req=>new Promise((resolve,reject)=>{const c=net.createConnection(socket);let raw='';c.on('connect',()=>c.write(JSON.stringify(req)+'\n'));c.on('data',x=>raw+=x);c.on('end',()=>resolve(JSON.parse(raw)));c.on('error',reject);});
 const sleep=ms=>new Promise(r=>setTimeout(r,ms));
 try{await new Promise(r=>s.server.once('listening',r));
 assert((await ask({api:1,op:'testStart'})).ok);assert.equal(received.length,0);
 await sleep(2200);assert.equal(received.length,0);valid=true;
 await sleep(2200);assert.equal(received.length,1);assert.equal(received[0].op,'showText');assert.equal(received[0].target,'kombi');
 const h=await ask({api:1,op:'status'});assert.equal(h.testHits,1);assert.equal(h.notificationAccepted,1);assert.equal(h.failures,0);
 assert((await ask({api:1,op:'testStop'})).ok);assert.equal((await ask({api:1,op:'status'})).rules,0);
 }finally{s.close();await new Promise(r=>s.server.once('close',r));await new Promise(r=>fake.close(r));for(const name of fs.readdirSync(dir))fs.unlinkSync(path.join(dir,name));fs.rmdirSync(dir);}
 console.log('Background notification integration passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
