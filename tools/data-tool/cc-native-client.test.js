'use strict';
const assert=require('assert'),fs=require('fs'),net=require('net'),path=require('path'),os=require('os');
const {create,validate}=require('./cc-native-client');
(async()=>{
 const wrong=validate({ok:true,op:'ccNativeSnapshot',fields:{frontLeft:{valid:true,value:'P'},frontRight:{valid:true,value:'latched'},gear:{valid:true,value:'D'}}},1000);
 assert.equal(wrong.fields.frontLeft.valid,false);assert.equal(wrong.fields.frontRight.value,'latched');
 assert.equal(wrong.fields.gear.value,'D');
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'cc-native-reader-')),socket=path.join(root,'native.sock');
 let calls=0;
 const srv=net.createServer(client=>{
  let buf='';
  client.on('data',chunk=>{
   buf+=String(chunk);
   if(buf.indexOf('\n')<0)return;
   calls++;
   client.end(JSON.stringify({ok:true,op:'ccNativeSnapshot',fields:{
    frontLeft:{valid:true,value:'latched'},frontRight:{valid:true,value:'unlatched'},
    gear:{valid:false,value:null}}})+'\n');
  });
 });
 try{
  await new Promise(resolve=>srv.listen(socket,resolve));
  let now=1000;
  const reader=create({locate:()=>({ok:true,socket}),now:()=>now,timeoutMs:1000});
  const [a,b]=await Promise.all([reader.snapshot(),reader.snapshot()]);
  assert.equal(calls,1);assert.equal(a.fields.frontLeft.value,'latched');
  assert.equal(b.fields.frontRight.value,'unlatched');assert.equal(a.fields.gear.valid,false);
  assert.equal((await reader.snapshot()).cached,true);
  now=4000;assert.equal((await reader.snapshot()).ok,true);assert.equal(calls,2);
  assert.equal((await create({locate:()=>({ok:false,stage:'PROVIDER_NOT_INSTALLED'})}).snapshot()).stage,'PROVIDER_NOT_INSTALLED');
  console.log('CC native provider request, coalescing, TTL, invalid and missing stages PASS');
 }finally{await new Promise(resolve=>srv.close(resolve));fs.unlinkSync(socket);fs.rmdirSync(root);}
})().catch(e=>{console.error(e);process.exitCode=1;});
