'use strict';
// One-shot DPF DEV comparison: the existing validated legacy SOOT sample
// is captured by the caller. Only one new read is requested via Data Tool.
const DID=0x44BE,ECU=0x12,MAX_LEGACY_AGE_MS=30000,FACTOR=0.01525902;
function decode(uds){
 if(!Array.isArray(uds)||uds.length!==5||uds[0]!==0x62||
    uds[1]!==0x44||uds[2]!==0xBE||!uds.every(b=>Number.isInteger(b)&&b>=0&&b<=255))return null;
 return (uds[3]*256+uds[4])*FACTOR;
}
async function compare(legacy,read,now){
 const captured=Number.isFinite(now)?now:Date.now();
 const legacyAgeMs=legacy&&Number.isFinite(legacy.at)?Math.max(0,captured-legacy.at):null;
 if(!legacy||!Number.isFinite(legacy.value)||legacyAgeMs===null||
    legacyAgeMs>MAX_LEGACY_AGE_MS)return {ok:false,reason:'NO_RECENT_SAMPLE',legacyAgeMs};
 try{
  const tool=await read(ECU,DID,{timeoutMs:15000,withMeta:true});
  const value=decode(tool&&tool.uds);
  const at=tool&&typeof tool.at==='string'?Date.parse(tool.at):NaN;
  if(value===null||!Number.isFinite(at)||at> Date.now()+2000)
   return {ok:false,reason:'INVALID_TOOL_SAMPLE',legacyAgeMs};
  const toolAgeMs=Math.max(0,Date.now()-at);
  return {ok:true,legacyValue:legacy.value,toolValue:value,
   difference:value-legacy.value,legacyAgeMs,toolAgeMs,
   cached:tool.cached===true};
 }catch(_){return {ok:false,reason:'TOOL_READ_FAILED',legacyAgeMs};}
}
module.exports={compare,decode,DID,ECU,MAX_LEGACY_AGE_MS};
