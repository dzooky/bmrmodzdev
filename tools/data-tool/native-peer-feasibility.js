'use strict';
// Passive local ABI survey, no process enumeration, no native code execution.
// The Linux SO_PEERCRED host prototype is not shipped or executed on MGU.
const fs=require('fs'),os=require('os');
function inspect(options){
 const opts=options||{},io=opts.fs||fs,proc=opts.process||process,system=opts.os||os;
 let elf=null;
 try{
  const fd=io.openSync('/proc/self/exe','r');
  try{
   const bytes=Buffer.alloc(32),count=io.readSync(fd,bytes,0,bytes.length,0);
   if(count>=20&&bytes[0]===0x7f&&bytes.toString('ascii',1,4)==='ELF'){
    const little=bytes[5]===1,big=bytes[5]===2;
    const machine=(little||big)?(little?bytes.readUInt16LE(18):bytes.readUInt16BE(18)):0;
    elf={classBits:bytes[4]===1?32:bytes[4]===2?64:0,
      endian:little?'little':big?'big':'unknown',
      machine:machine===40?'arm':machine===183?'aarch64':
        machine===3?'x86':machine===62?'x86_64':'other'};
   }
  }finally{io.closeSync(fd);}
 }catch(_){}
 const p=proc.versions||{};
 const nodeMajor=Number(String(p.node||'').split('.')[0]);
 const abi=Number(p.modules);
 const napi=Number(p.napi);
 const arch=String(proc.arch||'unknown');
 const platform=String(proc.platform||'unknown');
 return {ok:true,mode:'passive-native-peer-feasibility',
   hostPrototype:'linux-ci-only',mgubinaryInstalled:false,
   nativePeerAdapterLoaded:false,kernelPeerProvenOnMgu:false,
   packageIdentityVerified:false,productionAccessEnabled:false,
   nodeMajor:Number.isSafeInteger(nodeMajor)&&nodeMajor>0?nodeMajor:null,
   nodeModuleAbi:Number.isSafeInteger(abi)&&abi>0?abi:null,
   nodeNapiVersion:Number.isSafeInteger(napi)&&napi>0?napi:null,
   processArch:['arm','arm64','x64','ia32'].indexOf(arch)>=0?arch:'other',
   linuxPlatform:platform==='linux',
   elfReadable:!!elf,elfClassBits:elf?elf.classBits:null,
   elfEndian:elf?elf.endian:null,elfMachine:elf?elf.machine:null,
   kernelMajor:Number(String(system.release()).split('.')[0])||null};
}
module.exports={inspect};
