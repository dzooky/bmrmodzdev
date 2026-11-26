'use strict';
// Passive inventory of *structured* attribute names in the installed MGU
// SOME/IP catalog. Mentions are not proof of available instances or samples.
// No generated proxy, ACL update, subscription, or vehicle access.
const FIELD=/^(?:statusGearboxDrive|DataPowerTrain2|statusGearSelectionDrive|statusActualStageDrive|.*(?:GearSelector|GearSelection|TransmissionGear|DriveStage).*)$/i;
function names(x){
 if(Array.isArray(x))return x.map(v=>typeof v==='string'?v:v&&typeof v.name==='string'?v.name:null).filter(Boolean);
 return x&&typeof x==='object'?Object.keys(x):[];
}
function inspect(catalog){
 const queue=[{node:catalog,path:'$',depth:0}],seen=new Set(),matches=[];
 let scan=0,head=0;
 while(head<queue.length&&scan<50000){
  const cur=queue[head++],node=cur.node;
  if(!node||typeof node!=='object'||seen.has(node)||cur.depth>9)continue;
  seen.add(node);scan++;
  const attrs=node.attributes||node.fields||node.properties;
  const found=names(attrs).filter(name=>name.length<=90&&FIELD.test(name)).slice(0,12);
  if(found.length&&matches.length<12){
   const iface=(typeof node.interfaceName==='string'?node.interfaceName:
    typeof node.name==='string'?node.name:cur.path).slice(0,110);
   const instances=names(node.instances||node.instanceMap||node.availableInstances).slice(0,12);
   matches.push({interface:iface,fields:found,instances:instances.map(x=>String(x).slice(0,40)),
    instanceVerified:instances.length>0});
  }
  for(const key of Object.keys(node)){
   const value=node[key];
   if(value&&typeof value==='object')queue.push({node:value,path:cur.path+'.'+key,depth:cur.depth+1});
  }
 }
 return {status:matches.length?'structural-candidates-only':'none-structurally-located',
  candidateCount:matches.length,candidates:matches,scannedNodes:scan,limitHit:head<queue.length,
  availabilityVerified:false,vehicleRequests:0};
}
module.exports={inspect};
