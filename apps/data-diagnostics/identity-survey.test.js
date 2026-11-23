'use strict';
const assert=require('assert');
const {inspect}=require('./identity-survey');
const sample=inspect({process:{getuid:()=>1000,getgid:()=>1001},fs:{
  statSync:()=>({isSocket:()=>true,mode:0o140666,uid:0,gid:0})
},socketPrototype:{}});
assert.strictEqual(sample.uid,1000);
assert.strictEqual(sample.gid,1001);
assert.strictEqual(sample.socket.mode,'0666');
assert.strictEqual(sample.authenticated,false);
assert.strictEqual(sample.nativePeerCredentialMethod,false);
const missing=inspect({process:{},fs:{statSync:()=>{throw Error('ENOENT');}}});
assert.strictEqual(missing.socket.present,false);
assert.strictEqual(missing.uid,null);
console.log('Data Diagnostics identity: safe own UID/GID and passive socket metadata passed');
