'use strict';
const assert=require('assert'),os=require('os'),path=require('path'),fs=require('fs'),net=require('net');
const {createEndpoint,describe,observePeer}=require('./secure-ipc');
function request(socket,payload){
  return new Promise((resolve,reject)=>{
    const client=net.createConnection(socket);
    let data='';
    client.on('connect',()=>client.write(JSON.stringify(payload)+'\n'));
    client.on('data',x=>data+=x.toString());
    client.on('end',()=>{try{resolve(JSON.parse(data.trim()));}catch(e){reject(e);}});
    client.on('error',reject);
  });
}
async function main(){
  const location=path.join(os.tmpdir(),'bmrmodz-secure-'+process.pid,'secure.sock');
  const endpoint=createEndpoint(location);
  await new Promise((resolve,reject)=>{endpoint.server.once('listening',resolve);endpoint.server.once('error',reject);});
  try{
    const stat=describe(location);
    assert.strictEqual(stat.present,true);
    assert.strictEqual(stat.mode,'0600');
    assert.strictEqual(stat.ownerOnly,true);
    assert.strictEqual(stat.dacOwnershipReady,false);
    assert.strictEqual(stat.dacTargetUid,null);
    const fake={statSync:()=>({isSocket:()=>true,mode:0o140600,uid:12252,gid:12252})};
    assert.strictEqual(describe('/fake.sock',fake,12252).dacOwnershipReady,true);
    assert.strictEqual(describe('/fake.sock',fake,12253).dacOwnershipReady,false);
    assert.throws(()=>createEndpoint(location,{targetUid:0}),/Invalid experimental DAC target UID/);
    assert.throws(()=>createEndpoint(location,{targetUid:NaN}),/Invalid experimental DAC target UID/);
    assert.deepStrictEqual(observePeer({},12252),{
      kernelCredentialsAvailable:false,kernelCredentialsObserved:false,dacUidMatch:false,
      applicationIdentityVerified:false,productionAccessEnabled:false
    });
    assert.deepStrictEqual(observePeer({getPeerCredentials:()=>({uid:12252,gid:12252,pid:123})},12252),{
      kernelCredentialsAvailable:true,kernelCredentialsObserved:true,dacUidMatch:true,
      applicationIdentityVerified:false,productionAccessEnabled:false
    });
    assert.strictEqual(observePeer({getPeerCredentials:()=>({uid:12252,gid:12252,pid:123})},12253).dacUidMatch,false);
    assert.strictEqual(observePeer({getPeerCredentials:()=>({uid:'12252',gid:12252,pid:123})},12252).kernelCredentialsObserved,false);
    assert.strictEqual(observePeer({getPeerCredentials:()=>({uid:12252,gid:12252,pid:0})},12252).kernelCredentialsObserved,false);
    assert.strictEqual(observePeer({getPeerCredentials:()=>{throw Error('unavailable');}},12252).kernelCredentialsObserved,false);
    const status=await request(location,{op:'securityStatus',consumer:'osa',uid:12252});
    assert.strictEqual(status.ok,true);
    assert.strictEqual(status.productionAccessEnabled,false);
    assert.strictEqual(status.peerIdentityVerified,false);
    assert.strictEqual(status.peer.applicationIdentityVerified,false);
    assert.strictEqual(status.peer.productionAccessEnabled,false);
    assert.strictEqual(typeof status.peer.kernelCredentialsAvailable,'boolean');
    assert.strictEqual(typeof status.peer.kernelCredentialsObserved,'boolean');
    assert.strictEqual(status.peer.dacUidMatch,false);
    assert.strictEqual(status.consumerAuthentication,'disabled');
    for(const op of ['cdsSnapshot','cdsDemand','cdsRelease','read','getData','someipGenerate','unknown']){
      const answer=await request(location,{op,consumer:'diagnostics',ecu:18,did:17595});
      assert.strictEqual(answer.ok,false,op);
    }
    console.log('Secure IPC: owner-only socket, no peer identity, sensitive calls fail closed passed');
  }finally{
    endpoint.close();
    try{fs.unlinkSync(location);}catch(_){}
    fs.rmdirSync(path.dirname(location));
  }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
