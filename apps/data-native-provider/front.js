'use strict';
// Same proven foreground TASU command and strict response contract as Diagnostics.
const SID=0x31,ACSM=1;
function decode(value){
 if(!Array.isArray(value)||value.length!==5||value[0]!==0x71||value[1]!==1||
    value[2]!==0xA0||value[3]!==0xD2||(value[4]!==0&&value[4]!==1))return null;
 return value[4]===1?'latched':'unlatched';
}
async function run(signals,log,Diag){
 const out={frontLeft:{valid:false,value:null},frontRight:{valid:false,value:null}};
 const Diagnostic=Diag||require('./kit/diag').Diag;
 let diag=null;
 try{
  diag=new Diagnostic(signals,log);diag.quiet=true;
  await diag.init();
  if(!diag.p)return out;
  for(const [contact,key] of [[1,'frontLeft'],[2,'frontRight']]){
   const data=[1,0xA0,0xD2,contact];
   try{
    const reply=await diag.physical(ACSM,SID,data,1500,u=>
     (u[0]===0x71&&u[1]===1&&u[2]===0xA0&&u[3]===0xD2)||
     (u[0]===0x7F&&u[1]===SID),{maxRetries:0,hardTimeoutMs:3500});
    const value=decode(reply);
    if(value)out[key]={valid:true,value};
   }catch(_){}
  }
 }catch(_){}
 finally{if(diag&&diag.p&&typeof diag.p.shutdown==='function')try{await Promise.resolve(diag.p.shutdown());}catch(_){}}
 return out;
}
module.exports={run,decode};
