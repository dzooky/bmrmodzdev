'use strict';
const assert=require('assert'),path=require('path'),{EventEmitter}=require('events');
const {start}=require('./headless');
const processRef=new EventEmitter();
let started=0,stopped=0,created=null;
const result=start({signals:{},log:{info(){},warn(){throw Error('unexpected warning');}},
 dataDir:'/tmp/native-provider-test',processRef,
 create:params=>{created=params;return {start(){started++;},close(){stopped++;}};}});
assert.equal(result.ok,true);
assert.equal(started,1);
assert.equal(created.socket,path.join('/tmp/native-provider-test','bmrmodz-cc-native.sock'));
assert.deepStrictEqual(created.signals,{});
processRef.emit('exit');
assert.equal(stopped,1);
const bad=start({log:{warn(){}},create:()=>({start(){throw Error('unsupported RHMI');}})});
assert.equal(bad.ok,false);assert.equal(bad.stage,'start-failed');
console.log('Native OAP headless bootstrap without RHMI, cleanup, failure isolation PASS');
