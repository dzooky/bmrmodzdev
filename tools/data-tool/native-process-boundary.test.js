'use strict';
const assert=require('assert'),fs=require('fs'),net=require('net'),os=require('os'),path=require('path');
const {run,unpack}=require('./native-process-boundary');
const EventEmitter=require('events');
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
  assert.strictEqual(typeof value.sameUidAsService,'boolean');
  assert.strictEqual(typeof value.peerCgroupReadable,'boolean');
  assert.strictEqual(typeof value.peerProcStatReadable,'boolean');
  assert.strictEqual(value.installedPackageIdentityVerified,false);
  assert.strictEqual(value.processInstanceVerified,false);
  assert.strictEqual(value.observationOnly,true);
  assert.strictEqual(value.applicationIdentityVerified,false);
  assert.strictEqual(value.packageIdentityVerified,false);
  assert.strictEqual(value.productionAccessEnabled,false);
  assert.deepStrictEqual(fs.readdirSync(dir).sort(),['ctl.sock']);
  // Node 8: the inherited socket may keep ChildProcess 'close' pending even
  // though the helper already exited and its stdout reached EOF.
  const fakeSpawn=()=>{
   const child=new EventEmitter();
   child.stdout=new EventEmitter();
   child.killed=false;
   child.kill=()=>{child.killed=true;};
   process.nextTick(()=>{
    child.stdout.emit('data',JSON.stringify({ok:true,mode:'passive-process-boundary',
      ok:true,kernelPeerObserved:true,applicationIdentityVerified:false,
      installedPackageIdentityVerified:false,processInstanceVerified:false,observationOnly:true,
      productionAccessEnabled:false})+'\\n');
    child.emit('exit',0);
    child.stdout.emit('end');
    // Deliberately NO 'close' event.
   });
   return child;
  };
  const simulated=await run(client,dir,{spawn:fakeSpawn,timeoutMs:300});
  assert.strictEqual(simulated.ok,true,JSON.stringify(simulated));
  assert.strictEqual(simulated.stage,'kernel-peer-observed');
  assert.strictEqual(simulated.installedPackageIdentityVerified,false);
  assert.deepStrictEqual(fs.readdirSync(dir).sort(),['ctl.sock']);
  const fakeHang=()=>{
   const child=new EventEmitter();child.stdout=new EventEmitter();
   child.killed=false;child.kill=()=>{child.killed=true;};return child;
  };
  const timed=await run(client,dir,{spawn:fakeHang,timeoutMs:25});
  assert.strictEqual(timed.ok,false);
  assert.strictEqual(timed.stage,'timeout-after-spawn');
  assert.deepStrictEqual(fs.readdirSync(dir).sort(),['ctl.sock']);
  const denied=await run({},dir);
  assert.strictEqual(denied.ok,false);
  assert.strictEqual(denied.stage,'unsupported');
  console.log('MGU native process-boundary probe: accepted FD3, no raw IDs and no app authorization PASS');
 }finally{
  if(client)client.destroy();
  if(server)await new Promise(resolve=>server.close(resolve));
  try{fs.unlinkSync(address);}catch(_){}
  fs.rmdirSync(dir);
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
