'use strict';
const assert=require('assert'),path=require('path'),reader=require('./cc-native-client');
const base='/var/opt/public/oap';
const registry=path.join(base,'oap_12201/security/uids.txt');
const uid=12450,root=path.join(base,'oap_'+uid);
const pkg=path.join(root,'source/package.json'),directory=path.join(root,'data');
const socket=path.join(directory,'bmrmodz-cc-native.sock');
const good={name:'data-native-provider',mguAppStartType:'autostart'};
function stub(options){
 const opts=options||{},suffix=opts.registry===undefined?'12450=data-native-provider\n':opts.registry;
 return {
  lstatSync(name){
   if(name===registry)return {isFile:()=>true,isSymbolicLink:()=>false,size:40,mode:0o100660,uid:12201};
   if(name===pkg)return {isFile:()=>true,isSymbolicLink:()=>false,size:120,mode:0o100640,uid:12201};
   if(name===directory)return {isDirectory:()=>true,isSymbolicLink:()=>false,mode:0o40770,uid:12201,gid:uid};
   if(name===socket)return {isSocket:()=>true,isSymbolicLink:()=>false,mode:0o140600,uid:uid};
   throw Object.assign(Error('Missing'),{code:'ENOENT'});
  },
  readFileSync(name){return name===registry?suffix:JSON.stringify(opts.pkg||good);}
 };
}
assert.deepStrictEqual(reader.locate(stub()),{ok:true,socket,uid});
assert.equal(reader.locate(stub({registry:'12451=data-native-provider\n'})).ok,false);
assert.equal(reader.locate(stub({pkg:{name:'spoof',mguAppStartType:'autostart'}})).ok,false);
assert.equal(reader.locate(stub({pkg:{name:'data-native-provider',mguAppStartType:'manually'}})).ok,false);
console.log('Native OAP registry security/uids.txt and exact provider package checks PASS');
