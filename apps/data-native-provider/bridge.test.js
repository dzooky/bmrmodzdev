'use strict';
const assert=require('assert'),fs=require('fs'),net=require('net'),os=require('os'),path=require('path');
const {create,normalizeGear}=require('./bridge');
function query(socket){return new Promise((resolve,reject)=>{
 const c=net.createConnection(socket);let text='';
 c.on('connect',()=>c.write('{"op":"ccNativeSnapshot"}\n'));
 c.on('data',data=>{text+=String(data);if(text.indexOf('\n')>=0)resolve(JSON.parse(text.split('\n')[0]));});
 c.on('error',reject);c.on('end',()=>{});
});}
(async()=>{
 assert.equal(normalizeGear({ok:true,selector:'D'}).value,'D');
 assert.equal(normalizeGear({ok:false,selector:'P'}).valid,false);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cc-provider-')),socket=path.join(dir,'bridge.sock');
 let t=1000,reads=0;
 const agent=create({socket,now:()=>t,front:async()=>{reads++;return {frontLeft:{valid:true,value:'latched'},frontRight:{valid:true,value:'unlatched'}};},
 gear:async()=>({ok:true,selector:'P'})});
 try{
  const server=agent.start();
  await new Promise(resolve=>server.once('listening',resolve));
  assert.equal(fs.statSync(socket).mode&0o777,0o600);
  const x=await query(socket);assert.equal(x.fields.frontLeft.value,'latched');assert.equal(x.fields.gear.value,'P');
  const y=await query(socket);assert.equal(y.fields.gear.valid,true);assert.equal(reads,1);
  t=4000;assert.equal((await query(socket)).fields.frontRight.value,'unlatched');assert.equal(reads,2);
  console.log('Autostart OAP on-demand source, socket permissions and cache PASS');
 }finally{agent.close();await new Promise(resolve=>setTimeout(resolve,10));try{fs.unlinkSync(socket);}catch(_){}fs.rmdirSync(dir);}
})().catch(e=>{console.error(e);process.exitCode=1;});
