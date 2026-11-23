'use strict';
const assert=require('assert'),fs=require('fs'),net=require('net'),os=require('os'),path=require('path');
const {run,unpack}=require('./native-peer-runner');
async function main(){
 const bin=unpack();
 assert.strictEqual(bin.readUInt16LE(18),62);
 assert.strictEqual(bin.length<16384,true);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'bmrmodz-native-peer-'));
 const address=path.join(dir,'ctl.sock');
 const before=fs.readdirSync(dir);
 let server,client;
 try{
  let resolveRun,rejectRun;
  const result=new Promise((resolve,reject)=>{resolveRun=resolve;rejectRun=reject;});
  server=net.createServer(async socket=>{
   try{resolveRun(await run(socket,dir));}
   catch(e){rejectRun(e);}
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(address,resolve);});
  client=net.createConnection(address);
  await new Promise((resolve,reject)=>{client.once('connect',resolve);client.once('error',reject);});
  const value=await result;
  assert.strictEqual(value.ok,true,JSON.stringify(value));
  assert.strictEqual(value.stage,'kernel-peer-observed');
  assert.strictEqual(value.kernelPeerObserved,true);
  assert.strictEqual(value.unixSocket,true);
  assert.strictEqual(value.applicationIdentityVerified,false);
  assert.strictEqual(value.packageIdentityVerified,false);
  assert.strictEqual(value.productionAccessEnabled,false);
  assert.deepStrictEqual(fs.readdirSync(dir).sort(),['ctl.sock']);
  const denied=await run({},dir);
  assert.strictEqual(denied.ok,false);
  assert.strictEqual(denied.stage,'unsupported');
  console.log('MGU native probe: statically linked ELF, accepted FD3, cleanup, no app authorization PASS');
 }finally{
  if(client)client.destroy();
  if(server)await new Promise(resolve=>server.close(resolve));
  try{fs.unlinkSync(address);}catch(_){}
  fs.rmdirSync(dir);
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
