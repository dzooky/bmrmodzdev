'use strict';
const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path'),net=require('net');
const {createEndpoint}=require('./secure-ipc');
const {createGateway}=require('./broker-gateway');
const {run}=require('./broker-self-test');
function send(socket,data){
 return new Promise((resolve,reject)=>{
  const c=net.createConnection(socket);let raw='';
  c.setTimeout(2000,()=>c.destroy(Error('timeout')));
  c.on('connect',()=>c.write(data));
  c.on('data',v=>raw+=v);
  c.on('end',()=>{try{resolve(JSON.parse(raw.trim()));}catch(e){reject(e);}});
  c.on('error',reject);
 });
}
async function main(){
 const probeDir=fs.mkdtempSync(path.join(os.tmpdir(),'bmrmodz-ipc-runtime-'));
 let result;
 try{result=await require('./secure-peer-probe').run({socketDirectory:probeDir});}
 finally{fs.rmdirSync(probeDir);}
 assert.strictEqual(result.ok,true,JSON.stringify(result));
 assert.strictEqual(result.failureStage,'none');
 const notDirectory=await require('./secure-peer-probe').run({socketDirectory:'/dev/null'});
 assert.strictEqual(notDirectory.ok,false);
 assert.strictEqual(notDirectory.failureStage,'choose-socket-path');
 const synthetic=await run({});
 assert.strictEqual(synthetic.ok,true,JSON.stringify(synthetic));
 assert.strictEqual(synthetic.vehicleReads,0);
 assert.strictEqual(synthetic.productionAccessEnabled,false);
 assert.strictEqual(synthetic.trustedIdentityVerified,false);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'bmrmodz-broker-gateway-'));
 const socket=path.join(dir,'secure.sock');
 let requested=0;
 const broker={get:async(fields,capability)=>{
  requested++;
  assert.strictEqual(capability,testGrant);
  return {ok:true,mode:'synthetic-only',results:{[fields[0]]:{valid:true,value:1,unit:'g'}}};
 }};
 const testGrant=Symbol('test-app-only');
 const gateway=createGateway(broker,peer=>peer&&peer.syntheticIdentity===true?
  {verified:true,capability:testGrant}:{verified:false});
 // Verify actual socket framing and fail-closed default. A resolver is a local
 // test-only injected function, never a client-supplied package name or UID.
 const endpoint=createEndpoint(socket,{gateway:createGateway(broker)});
 await new Promise((resolve,reject)=>{endpoint.server.once('listening',resolve);endpoint.server.once('error',reject);});
 try{
  const normal=await send(socket,'{"op":"getData","fields":["dpf.soot"],"consumer":"dpf","uid":0}\n');
  assert.strictEqual(normal.ok,false);
  const status=await send(socket,'{"op":"securityStatus"}\n');
  assert.strictEqual(status.ok,true);
  assert.strictEqual(status.productionAccessEnabled,false);
  assert.strictEqual(status.peerIdentityVerified,false);
  const split=await send(socket,'{"op":"getDa'+'ta","fields":["engine.rpm"]}\n');
  assert.strictEqual(split.ok,false);
  assert.strictEqual(requested,0);
  const direct=await gateway.dispatch({syntheticIdentity:true},{op:'getData',fields:['dpf.soot']});
  assert.strictEqual(direct.ok,true);
  const spoof=await gateway.dispatch({}, {op:'getData',fields:['dpf.soot'],syntheticIdentity:true,uid:0});
  assert.strictEqual(spoof.ok,false);
  assert.strictEqual(requested,1);
 }finally{endpoint.close();try{fs.unlinkSync(socket);}catch(_){}fs.rmdirSync(dir);}
 console.log('Secure broker gateway: socket default-deny, synthetic authenticated dispatch, spoofing and multi-consumer self-test passed');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
