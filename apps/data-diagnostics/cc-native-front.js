'use strict';
// Diagnostic-only comparison with the original Climate Comfort TASU path.
// The app declares InternalTasu explicitly. No background polling or Tool writes.
const {Diag,replyTo}=require('./kit/diag');
const SID=0x31,ACSM=0x01;
function resultFor(reply){
 if(!reply)return {state:'unknown',detail:'timeout'};
 if(reply[0]===0x7F&&reply[1]===SID){
  return {state:'unknown',detail:'NRC '+(reply.length>=3?('0'+reply[2].toString(16).toUpperCase()).slice(-2):'unknown')};
 }
 if(reply.length!==5||reply[0]!==0x71||reply[1]!==0x01||
    reply[2]!==0xA0||reply[3]!==0xD2)
  return {state:'unknown',detail:'unexpected-reply'};
 if(reply[4]===0)return {state:'unlatched',detail:'00'};
 if(reply[4]===1)return {state:'latched',detail:'01'};
 return {state:'unknown',detail:'status-'+('0'+reply[4].toString(16).toUpperCase()).slice(-2)};
}
async function run(signals,log,DiagType){
 const output={frontLeft:{state:'unknown',detail:'not-tested'},
  frontRight:{state:'unknown',detail:'not-tested'},transport:'native-InternalTasu'};
 if(!signals)return Object.assign(output,{error:'signals-unavailable'});
 const Diagnostic=DiagType||Diag;
 let diag;
 try{
  diag=new Diagnostic(signals,log);
  diag.quiet=true;
  await diag.init();
  if(!diag.p)return Object.assign(output,{error:'proxy-unavailable'});
  for(const [contact,key] of [[1,'frontLeft'],[2,'frontRight']]){
   const bytes=[0x01,0xA0,0xD2,contact];
   try{
    const reply=await diag.physical(ACSM,SID,bytes,1500,replyTo(SID,bytes),
     {maxRetries:0,hardTimeoutMs:3500});
    output[key]=resultFor(reply);
   }catch(e){output[key]={state:'unknown',detail:String(e.message||e).slice(0,60)};}
  }
 }catch(e){output.error=String(e.message||e).slice(0,80);}
 finally{
  // Release this temporary SOME/IP proxy after the one-click test.
  if(diag&&diag.p&&typeof diag.p.shutdown==='function')
   try{await Promise.resolve(diag.p.shutdown());}catch(_){}
 }
 return output;
}
module.exports={run,resultFor};
