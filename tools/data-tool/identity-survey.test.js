'use strict';
const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path'),net=require('net');
const {inspectService,identity}=require('./identity-survey');
const socket=path.join(os.tmpdir(),'bmrmodz-identity-'+process.pid+'.sock');
const server=net.createServer();
server.listen(socket,()=>{
  try{
    const survey=inspectService(socket);
    assert.strictEqual(survey.ok,true);
    assert.strictEqual(survey.mode,'passive-observation');
    assert.strictEqual(survey.peerIdentityVerified,false);
    assert.strictEqual(survey.productionAccessEnabled,false);
    assert.strictEqual(survey.diagnosticSocket.present,true);
    assert.strictEqual(survey.identity.uid,process.getuid());
    assert.strictEqual(survey.identity.gid,process.getgid());
    const unavailable=inspectService('/path/does/not/exist');
    assert.strictEqual(unavailable.diagnosticSocket.present,false);
    assert.strictEqual(identity({process:{}}).uid,null);
    const mock=inspectService(socket,{process:{getuid:()=>77,getgid:()=>88,versions:{node:'18.0.0'}},socketPrototype:{getPeerCredentials:()=>{}}});
    assert.strictEqual(mock.identity.uid,77);
    assert.strictEqual(mock.nativePeerCredentialMethod,true);
    assert.strictEqual(mock.peerIdentityVerified,false);
    console.log('Data Tool identity: safe self metadata, socket metadata and unverified peer capability passed');
  }finally{server.close();try{fs.unlinkSync(socket);}catch(_){}}
});
