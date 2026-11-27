'use strict';
// Contract draft only. No app is registered or scheduled in the live Tool.
// DPF DEV demands are named/allowlisted, never arbitrary ECU/DID requests.
const {getRead}=require('./profiles');
const profileRows=Object.freeze({
 B57:Object.freeze([
  ['SOOT',0x44BE,2],['ASH',0x44BD,2],['SINCE',0x44BF,4],
  ['AVERAGE',0x4B2F,4],['REQUEST',0x44BB,1],['MODE',0x467E,4],
  ['PRESSURE',0x44EB,2],['TEMP',0x44EF,2],['RUNTIME',0x44B7,4],
  ['LOCK',0x44C2,1],['AVG TEMP',0x4B4A,2],['REMAINING',0x4C78,2]
 ]),
 B47:Object.freeze([
  ['SOOT',0x44BE,2],['ASH',0x44BD,2],['SINCE',0x44BF,4],['AVERAGE',0x44C7,2],
  ['PRESSURE',0x44F8,2],['TEMP',0x434A,2],['RUNTIME',0x44B7,4],['LOCK',0x44C2,1],['SOOT CALCULATED',0x44C1,2]
 ])
});
const IDENTITIES=Object.freeze({'0F1FE8':'B57','0F2678':'B47'});
function build(identity){
 const engine=IDENTITIES[identity],rows=profileRows[engine];
 if(!rows)return null; // Unknown DDE: no demand, no diagnostic guessing.
 const definitions={},freshnessMs={};
 for(const [name,did,length] of rows){
  if(getRead(0x12,did)!=='dde')throw Error('DPF signal not allowlisted');
  const key='dpf.'+engine.toLowerCase()+'.'+name.toLowerCase().replace(/ /g,'_');
  definitions[key]={ecu:0x12,did,length};
  // Desired freshness, not measured ECU cadence. The Tool will pace reads.
  freshnessMs[key]=name==='REQUEST'||name==='MODE'?5000:60000;
 }
 return {engine,definitions,fields:Object.keys(definitions),freshnessMs,
  leaseMs:15000,scope:'foreground-experimental-unwired'};
}
module.exports={build,IDENTITIES};
