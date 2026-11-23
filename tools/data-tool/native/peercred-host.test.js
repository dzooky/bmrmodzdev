'use strict';
// Host CI only. Compile native/peercred-probe.c with gcc to a temp binary
// before running this script. No MGU build, installation, or service hooks.
const assert=require('assert'),fs=require('fs'),os=require('os'),net=require('net'),path=require('path');
const {spawn}=require('child_process');
async function main(){
 if(process.platform!=='linux')throw Error('Linux required');
 const binary=process.argv[2];
 if(!binary||!fs.existsSync(binary))throw Error('Native probe binary required');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'bmrmodz-peer-host-'));
 const address=path.join(dir,'peer.sock');
 let resolveResult,rejectResult;
 const completed=new Promise((resolve,reject)=>{resolveResult=resolve;rejectResult=reject;});
 const server=net.createServer(socket=>{
  // Pass the accepted peer socket as FD 3. The service prototype never creates
  // a secondary socket; this standalone CI harness creates its own test pair.
  const child=spawn(binary,[],{stdio:['ignore','pipe','pipe',socket]});
  let out='',err='';
  child.stdout.on('data',v=>{out+=String(v);});
  child.stderr.on('data',v=>{err+=String(v);});
  child.on('error',rejectResult);
  child.on('exit',code=>{
   try{
    assert.strictEqual(code,0,err);
    const result=JSON.parse(out.trim());
    assert.strictEqual(result.ok,true);
    assert.strictEqual(result.unixSocket,true);
    assert.strictEqual(result.kernelPeerObserved,true);
    assert.strictEqual(result.pidPositive,true);
    assert.strictEqual(result.sameUid,true);
    assert.strictEqual(result.applicationIdentityVerified,false);
    assert.strictEqual(result.productionAccessEnabled,false);
    assert.strictEqual(out.includes('uid'),false);
    resolveResult();
   }catch(e){rejectResult(e);}
   socket.destroy();
  });
 });
 try{
  await new Promise((resolve,reject)=>{
   server.once('error',reject);
   server.listen(address,resolve);
  });
  const client=net.createConnection(address);
  client.on('error',rejectResult);
  await completed;
  client.destroy();
 }finally{
  await new Promise(resolve=>server.close(resolve));
  try{fs.unlinkSync(address);}catch(_){}
  fs.rmdirSync(dir);
 }
 console.log('Linux host SO_PEERCRED proof passed: preaccepted FD, kernel peer flags only, no application authorization');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
