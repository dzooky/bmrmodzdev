'use strict';
// Isolated, read-only parser for observed VehicleInformation SOME/IP values.
// No subscription, ECU request or public Data Tool field is enabled here.
// Never infer selector D from wheel speed, engine RPM or guessed numeric gear.
const VALID=Object.freeze(['P','R','N','D']);
const STAGES=Object.freeze({P:'P',R:'R',N:'N',D:'D',1:'P',2:'R',3:'N',4:'D'});
function decodeStage(value){
 const key=(typeof value==='number'&&Number.isInteger(value)||typeof value==='string')?String(value):'';
 return Object.prototype.hasOwnProperty.call(STAGES,key)?STAGES[key]:null;
}
function decodeSelection(value){
 // DataPowerTrain2.statusGearSelectionDrive: N=1,R=2,P=3,NP=4,
 // numbered engaged gears 5..13; NP is intrinsically ambiguous.
 if(typeof value==='string'){
  if(value==='N')return 'N';
  if(value==='R')return 'R';
  if(value==='P')return 'P';
  if(value==='NP')return null;
  if(/^_[1-9]$/.test(value))return 'D';
  return null;
 }
 if(!Number.isInteger(value))return null;
 if(value===1)return 'N';
 if(value===2)return 'R';
 if(value===3)return 'P';
 if(value>=5&&value<=13)return 'D';
 return null;
}
function createGearState({now=Date.now,maxAgeMs=5000}={}){
 if(!Number.isInteger(maxAgeMs)||maxAgeMs<100||maxAgeMs>30000)throw Error('Invalid gear freshness');
 const observations=new Map();
 function update(source,payload,at=now()){
  if(source!=='statusGearboxDrive'&&source!=='DataPowerTrain2')return false;
  if(!Number.isFinite(at)||!payload||typeof payload!=='object'||Array.isArray(payload))return false;
  const stage=source==='statusGearboxDrive'
   ?decodeStage(payload.statusActualStageDrive):decodeSelection(payload.statusGearSelectionDrive);
  // Invalid observation must invalidate the corresponding source, never reuse D.
  if(observations.has(source)&&at<observations.get(source).at)return false;
  observations.set(source,{stage,at});
  return stage!==null;
 }
 function snapshot(at=now()){
  if(!Number.isFinite(at))return {valid:false,stage:null,source:'none'};
  const live=[];
  for(const [source,o] of observations){
   if(o.at<=at&&at-o.at<=maxAgeMs)live.push({source,stage:o.stage});
  }
  if(!live.length)return {valid:false,stage:null,source:'none'};
  // If two simultaneously fresh feeds disagree or either explicitly reports
  // invalid, fail closed rather than selecting an arbitrary winner.
  if(live.some(o=>!o.stage)||new Set(live.map(o=>o.stage)).size>1)
   return {valid:false,stage:null,source:'conflict'};
  return {valid:true,stage:live[0].stage,source:live.length===2?'both':live[0].source};
 }
 return {update,snapshot};
}
module.exports={decodeStage,decodeSelection,createGearState,VALID};
