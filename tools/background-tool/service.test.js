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

(async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'bt-open-')),socket=path.join(dir,'ctl.sock'),nt=path.join(dir,'nt.sock'),state=path.join(dir,'state.json');let received=[],valid=false;
 const fake=net.createServer(c=>{let raw='';c.on('data',x=>{raw+=x;const n=raw.indexOf('\n');if(n>=0){received.push(JSON.parse(raw.slice(0,n)));c.end('{"ok":true,"status":"queued"}\n');}});});
 await new Promise(r=>fake.listen(nt,r));
 const connect=async()=>({close(){},async request(r){if(r.op==='catalog')return {ok:true,fields:[{name:'dpf.b57.request',minFreshnessMs:5000}]};if(r.op==='snapshot')return {ok:true,active:true,fields:{'dpf.b57.request':{valid,raw:0,sampledAt:new Date().toISOString()}}};return {ok:true};}});
 const make=()=>serve({socket,state,notificationSocket:nt,connect});
 let s=make();
 const ask=req=>new Promise((resolve,reject)=>{const c=net.createConnection(socket);let raw='';c.on('connect',()=>c.write(JSON.stringify(req)+'\n'));c.on('data',x=>raw+=x);c.on('end',()=>resolve(JSON.parse(raw)));c.on('error',reject);});
 const sleep=ms=>new Promise(r=>setTimeout(r,ms));
 const rule={api:1,appId:'example',ruleId:'r',fields:[{name:'dpf.b57.request',freshnessMs:5000}],condition:{field:'dpf.b57.request',op:'gte',value:0},trigger:'once',actions:[{type:'notification',name:'kombi',payload:{durationMs:6000,ttlMs:10000,segments:[{text:'Reference OK',color:'#00FF00',blinkMs:0}]}}]};
 const register={api:1,op:'register',appId:'example',rule};
 const status={api:1,op:'status',appId:'example'};
 const stop=async()=>{const closed=new Promise(r=>s.server.once('close',r));s.close();await closed;};
 try{
 await new Promise(r=>s.server.once('listening',r));
 assert(!(await ask(Object.assign({},register,{appId:'other'}))).ok);
 assert(!(await ask(Object.assign({},register,{appId:'diagnostics'}))).ok);
 assert(!(await ask(Object.assign({},register,{rule:Object.assign({},rule,{actions:[{type:'action',name:'shell',payload:{}}]})}))).ok);
 assert((await ask(register)).ok);
 assert.equal((await ask(status)).rules.length,1);
 assert.equal((await ask({api:1,op:'status',appId:'other'})).rules.length,0);
 await sleep(1250);assert.equal(received.length,0);valid=true;
 await sleep(2300);assert.equal(received.length,1);assert.equal(received[0].app,'example');assert.equal(received[0].op,'showText');
 assert((await ask(register)).ok);assert((await ask(status)).rules[0].fired);
 await stop();s=make();await new Promise(r=>s.server.once('listening',r));
 assert((await ask(status)).rules[0].fired);
 await sleep(1500);assert.equal(received.length,1);
 assert((await ask({api:1,op:'unregister',appId:'example',ruleId:'r'})).ok);assert.equal((await ask(status)).rules.length,0);
 }finally{await stop();await new Promise(r=>fake.close(r));for(const name of fs.readdirSync(dir))fs.unlinkSync(path.join(dir,name));fs.rmdirSync(dir);}
 console.log('Open registration persistence and notification tests passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
