'use strict';
function rear(r){const u=r&&r.ok&&r.uds;if(!Array.isArray(u)||u.length<8||u[0]!==98||u[1]!==64||u[2]!==83)return ['unknown','unknown'];return [5,7].map(i=>u[i]>=130&&u[i]<=150?'latched':u[i]>=20&&u[i]<=50?'unlatched':'unknown');}
async function run(request){
 const belts={frontLeft:'unknown',frontRight:'unknown',rearLeft:'unknown',rearRight:'unknown'},errors=[];
 let sourceAudit=null;
 try{sourceAudit=await request({op:'ccGearSourceAudit'},{timeoutMs:5000});}
 catch(e){sourceAudit={ok:false,bundle:{status:'audit-unavailable'}};}
 let toolNative={ok:false,stage:'not-tested'};
 try{
  const config=await request({op:'ccTasuGenerate'},{timeoutMs:16000});
  toolNative=config&&config.ok?await request({op:'ccTasuProbe'},{timeoutMs:12000}):
   {ok:false,stage:'config-not-generated',error:config&&(config.error||config.stage)};
 }catch(e){toolNative={ok:false,stage:'tool-native-error',error:String(e.message||e).slice(0,65)};}
 let gear={ok:false,stage:'not-tested'};
 try{const g=await request({op:'ccGearGenerate'},{timeoutMs:16000});gear=g&&g.ok?await request({op:'ccGearProbe'},{timeoutMs:8500}):{ok:false,stage:'gear-config',error:g&&(g.error||g.stage)};}catch(e){gear={ok:false,stage:'gear-error',error:String(e.message||e).slice(0,100)};}
 for(const [contact,key] of [[1,'frontLeft'],[2,'frontRight']])try{
  const r=await request({op:'ccFrontContact',contact},{timeoutMs:8500});
  if(r&&r.ok&&['latched','unlatched'].includes(r.state))belts[key]=r.state;
  else errors.push(key+': '+String(r&&r.error||'unknown').slice(0,70));
 }catch(e){errors.push(key+': '+String(e.message||e).slice(0,70));}
 try{const v=rear(await request({op:'read',ecu:1,did:0x4053},{timeoutMs:12000}));belts.rearLeft=v[0];belts.rearRight=v[1];}catch(e){errors.push('Rear: '+String(e.message||e).slice(0,70));}
 return {gear,belts,errors,sourceAudit,toolNative};
}
module.exports={run,rear};
