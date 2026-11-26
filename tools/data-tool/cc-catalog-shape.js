'use strict';
// Exact, passive catalog inspection. A text mention is NOT field/instance proof.
const TARGET='de.bmw.infrastructure.VehicleInformation';
const FIELDS=['statusGearboxDrive','DataPowerTrain2'];
function keys(obj){return obj&&typeof obj==='object'&&!Array.isArray(obj)?Object.keys(obj):[];}
function names(obj){
 if(!obj||typeof obj!=='object')return [];
 if(Array.isArray(obj))return obj.map(x=>typeof x==='string'?x:x&&typeof x.name==='string'?x.name:null).filter(Boolean);
 return keys(obj);
}
function inspect(catalog){
 const seen=new Set(),matches=[],queue=[{node:catalog,path:'$',depth:0}];
 let scanned=0;
 while(queue.length&&scanned<70000){
  const cur=queue.shift(),node=cur.node;
  if(!node||typeof node!=='object'||seen.has(node)||cur.depth>9)continue;
  seen.add(node);scanned++;
  const isExact=cur.path!== '$'&&(
    cur.path.slice(-TARGET.length-1)==='.'+TARGET||
    (typeof node.name==='string'&&node.name===TARGET)||
    (typeof node.interfaceName==='string'&&node.interfaceName===TARGET));
  if(isExact&&matches.length<8){
   const attrs=node.attributes||node.fields||node.properties||null;
   const fieldNames=names(attrs),instances=names(node.instances||node.instanceMap||node.availableInstances);
   const fields={};FIELDS.forEach(f=>fields[f]=fieldNames.includes(f));
   matches.push({path:cur.path.slice(0,100),hasAttributeMap:!!attrs,fields,
     instances:instances.slice(0,16).map(x=>String(x).slice(0,50))});
  }
  for(const key of keys(node)){const v=node[key];if(v&&typeof v==='object')queue.push({node:v,path:cur.path+'.'+key,depth:cur.depth+1});}
  if(Array.isArray(node))for(let i=0;i<node.length;i++){let v=node[i];if(v&&typeof v==='object')queue.push({node:v,path:cur.path+'['+i+']',depth:cur.depth+1});}
 }
 const fieldStates={};FIELDS.forEach(f=>fieldStates[f]=matches.some(m=>m.fields[f]));
 const allFields=FIELDS.every(f=>fieldStates[f]);
 const instance1=matches.some(m=>m.instances.includes('1'));
 return {status:matches.length===0?'interface-not-structurally-located':allFields&&instance1?'candidate-confirmed':'incomplete-or-schema-unknown',
  exactInterfaceMatches:matches.length,fields:fieldStates,instance1,
  candidates:matches,scannedNodes:scanned,limitHit:queue.length>0};
}
module.exports={inspect};
