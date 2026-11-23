'use strict';
// Verify host-compiled C source and embedded pinned ELF separately.
// Compiler output bytes are not reproducible across arbitrary GCC toolchains.
const assert=require('assert'),net=require('net'),fs=require('fs'),os=require('os'),
 path=require('path'),cp=require('child_process');
const binary=process.argv[2];
if(!binary)throw Error('host-compiled ELF path required');
const embedded=require('../native-process-boundary').unpack();
function inspect(binaryPath){
 const bytes=fs.readFileSync(binaryPath);
 assert.strictEqual(bytes.toString('ascii',1,4),'ELF');
 assert.strictEqual(bytes[4],2);
 assert.strictEqual(bytes[5],1);
 assert.strictEqual(bytes.readUInt16LE(18),62);
 return bytes;
}
const host=inspect(binary);
assert.ok(host.length<16384);
assert.ok(embedded.length<16384);
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'bmrmodz-boundary-source-'));
const address=path.join(dir,'ctl.sock');
const server=net.createServer(socket=>{
 const child=cp.spawn(binary,[],{stdio:['ignore','pipe','ignore',socket]});
 let stdout='';
 child.stdout.on('data',chunk=>{stdout+=chunk.toString();if(stdout.length>1024)child.kill('SIGKILL');});
 child.on('error',error=>{console.error(error);process.exitCode=1;});
 child.on('close',code=>{
  try{
   assert.strictEqual(code,0);
   const v=JSON.parse(stdout.trim());
   assert.strictEqual(v.mode,'passive-process-boundary');
   assert.strictEqual(v.kernelPeerObserved,true);
   assert.strictEqual(v.ok,true);
   assert.strictEqual(typeof v.sameUidAsService,'boolean');
   assert.strictEqual(typeof v.peerCgroupReadable,'boolean');
   assert.strictEqual(typeof v.peerProcStatReadable,'boolean');
   assert.strictEqual(v.installedPackageIdentityVerified,false);
   assert.strictEqual(v.processInstanceVerified,false);
   assert.strictEqual(v.applicationIdentityVerified,false);
   assert.strictEqual(v.productionAccessEnabled,false);
   assert.strictEqual(v.observationOnly,true);
   assert.strictEqual(stdout.includes('pid'),false);
   assert.strictEqual(stdout.includes('uid'),false);
   console.log('Host-compiled process-boundary C source executed safely on accepted FD3');
  }catch(error){console.error(error);process.exitCode=1;}
  socket.destroy();
  server.close(()=>{try{fs.unlinkSync(address);}catch(_){}fs.rmdirSync(dir);});
 });
});
server.listen(address,()=>{const peer=net.createConnection(address);peer.on('error',e=>{console.error(e);process.exitCode=1;});});
