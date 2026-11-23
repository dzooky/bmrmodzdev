'use strict';
const assert=require('assert');
const {inspect}=require('./native-peer-feasibility');
function fixture(arch,machine){
 const header=Buffer.alloc(32);header[0]=0x7f;header.write('ELF',1,'ascii');
 header[4]=2;header[5]=1;header.writeUInt16LE(machine,18);
 const io={openSync:p=>{assert.strictEqual(p,'/proc/self/exe');return 7;},
  readSync:(fd,target)=>{assert.strictEqual(fd,7);header.copy(target);return header.length;},
  closeSync:fd=>assert.strictEqual(fd,7)};
 const result=inspect({fs:io,process:{platform:'linux',arch,
   versions:{node:'12.22.12',modules:'72',napi:'8'}},
   os:{release:()=> '5.4.0-test'}});
 assert.strictEqual(result.ok,true);
 assert.strictEqual(result.elfReadable,true);
 assert.strictEqual(result.elfMachine,machine===183?'aarch64':'arm');
 assert.strictEqual(result.nodeMajor,12);
 assert.strictEqual(result.nodeModuleAbi,72);
 assert.strictEqual(result.nodeNapiVersion,8);
 assert.strictEqual(result.productionAccessEnabled,false);
 assert.strictEqual(result.packageIdentityVerified,false);
 assert.strictEqual(result.mgubinaryInstalled,false);
 assert.strictEqual(result.kernelPeerProvenOnMgu,false);
 assert.strictEqual(JSON.stringify(result).includes('test'),false);
}
fixture('arm64',183);
fixture('arm',40);
const denied=inspect({fs:{openSync(){throw Error('permission denied');}},
 process:{platform:'linux',arch:'arm',versions:{}},os:{release:()=>''}});
assert.strictEqual(denied.elfReadable,false);
assert.strictEqual(denied.productionAccessEnabled,false);
console.log('MGU ABI flags: ELF parsing and absent /proc fallback passed');
