'use strict';
function rear(r){const u=r&&r.ok&&r.uds;if(!Array.isArray(u)||u.length<8||u[0]!==98||u[1]!==64||u[2]!==83)return ['unknown','unknown'];return [5,7].map(i=>u[i]>=130&&u[i]<=150?'latched':u[i]>=20&&u[i]<=50?'unlatched':'unknown');}
async function run(request){
 const belts={frontLeft:'unknown',frontRight:'unknown',rearLeft:'unknown',rearRight:'unknown'},errors=[];
 let sourceAudit=null;
 try{sourceAudit=await request({op:'ccGearSourceAudit'},{timeoutMs:5000});}
 catch(e){sourceAudit={ok:false,bundle:{status:'audit-unavailable'}};}
 let toolConfig={ok:false,stage:'not-tested'};
 let toolNative={ok:false,stage:'not-tested'};
 try{
  const config=await request({op:'ccTasuGenerate'},{timeoutMs:16000});
  toolConfig=config||toolConfig;
  toolNative=config&&config.ok?await request({op:'ccTasuProbe'},{timeoutMs:12000}):
   {ok:false,stage:'config-not-generated',error:config&&(config.error||config.stage)};
 }catch(e){toolNative={ok:false,stage:'tool-native-error',error:String(e.message||e).slice(0,65)};}
 let gearConfig={ok:false,stage:'not-tested'};
 let gear={ok:false,stage:'not-tested'};
 try{const g=await request({op:'ccGearGenerate'},{timeoutMs:16000});gearConfig=g||gearConfig;gear=g&&g.ok?await request({op:'ccGearProbe'},{timeoutMs:8500}):{ok:false,stage:'gear-config',error:g&&(g.error||g.stage)};}catch(e){gear={ok:false,stage:'gear-error',error:String(e.message||e).slice(0,100)};}
 for(const [contact,key] of [[1,'frontLeft'],[2,'frontRight']])try{
  const r=await request({op:'ccFrontContact',contact},{timeoutMs:8500});
  if(r&&r.ok&&['latched','unlatched'].includes(r.state))belts[key]=r.state;
  else errors.push(key+': '+String(r&&r.error||'unknown').slice(0,70));
 }catch(e){errors.push(key+': '+String(e.message||e).slice(0,70));}
 try{const v=rear(await request({op:'read',ecu:1,did:0x4053},{timeoutMs:12000}));belts.rearLeft=v[0];belts.rearRight=v[1];}catch(e){errors.push('Rear: '+String(e.message||e).slice(0,70));}
 return {gear,gearConfig,belts,errors,sourceAudit,toolConfig,toolNative};
}
// All diagnostic facts are collected by the same one-click test. UI detail
// pages only page cached results and never send another vehicle request.
function detailLines(x){
 const a=x&&x.sourceAudit||{},b=a.bundle||{},c=a.catalog||{},modules=b.modules||{};
 const tool=x&&x.toolNative||{},tc=x&&x.toolConfig||{},reads=tool.readings||{};
 const gear=x&&x.gear||{},gc=x&&x.gearConfig||{};
 const fmt=v=>v===true?'yes':v===false?'no':'?';
 const val=v=>String(v===undefined||v===null?'—':v).replace(/[\\r\\n\\t]/g,' ').slice(0,160);
 const contact=k=>{const r=reads[k]||{};return k+': '+val(r.state||'not-received')+' / '+val(r.detail||r.error||'no detail');};
 const details=[
  'Bundle: '+val(b.status)+' / IF='+fmt(modules.IFConfigGenerator)+' ACL='+fmt(modules.AclGenerator)+(b.line?' @'+b.line:''),
  'Catalog: '+val(c.status)+' / VehicleInfo='+fmt(c.vehicleInformationMentioned),
  'Gear signals: Gearbox='+fmt(c.statusGearboxDriveMentioned)+' PowerTrain2='+fmt(c.dataPowerTrain2Mentioned),
  'Gear generator: '+val(gc.stage||'unknown')+' / '+val(gc.error||gc.note||'no detail'),
  'Gear read: '+val(gear.stage)+' / '+val(gear.error||gear.selector||'no detail'),
  'TASU generator: '+val(tc.stage||'unknown')+' / '+val(tc.error||tc.note||'no detail'),
  'Service TASU: '+val(tool.stage)+' / '+val(tool.error||'no detail'),
  contact('frontLeft'),contact('frontRight'),
  'Native/Tool: '+val((x&&x.errors||[]).join('; ')||'no errors'),
  'Rear: '+val(x&&x.belts&&x.belts.rearLeft)+' / '+val(x&&x.belts&&x.belts.rearRight)
 ];
 const wrapped=[];
 details.forEach(line=>{
  const text=String(line);
  for(let i=0;i<text.length;i+=96)wrapped.push(text.slice(i,i+96));
 });
 return wrapped;
}
module.exports={run,rear,detailLines};
