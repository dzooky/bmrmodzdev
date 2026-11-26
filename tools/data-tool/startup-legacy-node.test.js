'use strict';
// Simulate older MGU Node runtimes where Object.fromEntries does not exist.
// Test the actual service factory with no ECU reads and no data demand.
const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path'),net=require('net');
Object.fromEntries=undefined;
const {serve}=require('./service');
const {createApi}=require('./public-api');
const ihka=createApi({scope:'ihka',read:async()=>{throw Error('No ECU reads expected');}});
const client=ihka.connect('cc-dev');
assert.ok(client);
assert.strictEqual(client.request({op:'catalog'}).fields.length,4);
client.close();ihka.close();
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'bmr-data-old-node-'));
const socket=path.join(dir,'ctl.sock');
const service=serve(()=>{throw Error('No transport expected')},socket);
const c=net.createConnection(socket);
let buffer='';
c.setEncoding('utf8');
c.on('connect',()=>c.write(JSON.stringify({op:'status'})+'\n'));
c.on('data',chunk=>{
 buffer+=chunk;
 if(buffer.indexOf('\n')<0)return;
 const reply=JSON.parse(buffer.split('\n')[0]);
 assert.strictEqual(reply.ok,true);
 assert.strictEqual(reply.version,'0.1.65');
 assert.strictEqual(reply.stats.sent,0);
 c.end();service.close();
 try{fs.unlinkSync(socket)}catch(_){}
 fs.rmdirSync(dir);
 console.log('Data Tool startup with Object.fromEntries unavailable PASS');
});
c.on('error',err=>{console.error(err);process.exitCode=1;service.close()});
