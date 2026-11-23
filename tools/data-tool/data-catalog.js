'use strict';
// Internal-only named data catalog. No public API and no arbitrary ECU/DID input.
// Source definitions are taken from current DPF/OSA/Climate Comfort implementations.
const DEFINITIONS=Object.freeze({
 'dpf.soot':{source:'uds',ecu:0x12,did:0x44BE,profile:'dde',length:2,factor:0.01525902,unit:'g'},
 'dpf.ash':{source:'uds',ecu:0x12,did:0x44BD,profile:'dde',length:2,factor:0.01525902,unit:'g'},
 'dpf.distanceSinceRegen':{source:'uds',ecu:0x12,did:0x44BF,profile:'dde',length:4,factor:0.001,unit:'km'},
 'dpf.averageDistance':{source:'uds',ecu:0x12,profile:'dde',unit:'km',variants:{
   '0F1FE8':{did:0x4B2F,length:4,factor:0.001},
   '0F2678':{did:0x44C7,length:2,factor:1}
 }},
 'transmission.oilTemperature':{source:'uds',ecu:0x18,did:0x6000,profile:'egs',length:1,offset:-40,unit:'C'},
 'climate.frontLeftFootwell':{source:'uds',ecu:0x78,did:0xD8D7,profile:'ihka',index:6,unit:'C'},
 'climate.frontRightFootwell':{source:'uds',ecu:0x78,did:0xD8D7,profile:'ihka',index:7,unit:'C'},
 'climate.rearLeftFootwell':{source:'uds',ecu:0x78,did:0xD8D7,profile:'ihka',index:11,unit:'C'},
 'climate.rearRightFootwell':{source:'uds',ecu:0x78,did:0xD8D7,profile:'ihka',index:12,unit:'C'},
 'engine.oilTemperature':{source:'cds',field:'oil',unit:'C',factor:1,offset:-48,invalid:255},
 'engine.coolantTemperature':{source:'cds',field:'coolant',unit:'C',factor:1,offset:-48,invalid:255},
 'engine.rpm':{source:'cds',field:'rpm',unit:'rpm',factor:0.25,offset:0,invalid:65535}
});
function decode(reply,definition,identity){
 if(!reply||reply.ok!==true||!Array.isArray(reply.uds))return null;
 const u=reply.uds;
 if(definition.profile==='egs'&&identity!=='0F25D0')return null;
 if(definition.profile==='dde'&&identity!=='0F1FE8'&&identity!=='0F2678')return null;
 const variant=definition.variants&&definition.variants[identity];
 if(definition.variants&&!variant)return null;
 const spec=variant||definition, did=spec.did;
 if(!Number.isInteger(did)||u.length!==(spec.length+3)||u[0]!==0x62||
    u[1]!==(did>>8)||u[2]!==(did&255)||
    !u.every(x=>Number.isInteger(x)&&x>=0&&x<=255))return null;
 if(definition.profile==='ihka'){
   // IHKA DID D8D7 has 16 data bytes and 3-byte UDS header.
   // Indices are the complete UDS response positions.
   // Other fields in this reply are not temperature measurements.
   return null;
 }
 let raw=0;for(const byte of u.slice(3))raw=raw*256+byte;
 return {value:Math.round((raw*(spec.factor||1)+(spec.offset||0))*100)/100,unit:definition.unit};
}
function decodeFootwell(reply,definition){
 const u=reply&&reply.uds;
 if(!reply||!reply.ok||!Array.isArray(u)||u.length!==19||
   u[0]!==0x62||u[1]!==0xD8||u[2]!==0xD7||!u.every(x=>Number.isInteger(x)&&x>=0&&x<=255))return null;
 const raw=u[definition.index],value=raw<128?raw:raw-256;
 return value>=-40&&value<127?{value,unit:'C'}:null;
}
function decodeIdentity(reply,ecu){
 const u=reply&&reply.uds;
 if(!reply||!reply.ok||!Array.isArray(u)||u.length<6||
   u[0]!==0x62||u[1]!==0xF1||u[2]!==0x50||
   !u.slice(3,6).every(x=>Number.isInteger(x)&&x>=0&&x<=255))return null;
 const id=u.slice(3,6).map(x=>x.toString(16).padStart(2,'0')).join('').toUpperCase();
 return ecu===0x12?(['0F1FE8','0F2678'].includes(id)?id:null):
   ecu===0x18?(id==='0F25D0'?id:null):null;
}
function decodeCds(value,definition){
 if(!Number.isInteger(value)||value<0||value>65535||value===definition.invalid)return null;
 return {value:value*definition.factor+definition.offset,unit:definition.unit};
}
function describe(){
 return {mode:'internal-only',productionAccessEnabled:false,fields:Object.keys(DEFINITIONS),
   security:'Named fields never authorize clients; IPC is disabled until trusted identity is proven',
   transport:'UDS read-only + demand-driven CDS; no controls, no background polling'};
}
module.exports={DEFINITIONS,decode,decodeFootwell,decodeIdentity,decodeCds,describe};
