'use strict';
const assert=require('assert'),os=require('os'),path=require('path'),fs=require('fs'),net=require('net');
const {createEndpoint,describe}=require('./secure-ipc');
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
    const status=await request(location,{op:'securityStatus'});
    assert.strictEqual(status.ok,true);
    assert.strictEqual(status.productionAccessEnabled,false);
    assert.strictEqual(status.peerIdentityVerified,false);
    for(const op of ['cdsSnapshot','cdsDemand','cdsRelease','read','someipGenerate','unknown']){
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
