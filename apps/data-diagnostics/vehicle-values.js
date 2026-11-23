'use strict';
// Mirrors source semantics from OSA transmission.js and Climate Comfort
// seat-temperature.js. Returns only derived measurements, never raw UDS.
const EGS_INDEX='0F25D0';
function identification(reply){
  const u=reply&&reply.uds;
  if(!reply||!reply.ok||!Array.isArray(u)||u.length<6||
    u[0]!==0x62||u[1]!==0xF1||u[2]!==0x50)return null;
  if(!u.slice(3,6).every(x=>Number.isInteger(x)&&x>=0&&x<=255))return null;
  return u.slice(3,6).map(x=>x.toString(16).padStart(2,'0')).join('').toUpperCase();
}
function transmission(reply,identity){
  if(identity!==EGS_INDEX)return null;
  const u=reply&&reply.uds;
  if(!reply||!reply.ok||!Array.isArray(u)||u.length!==4||
    u[0]!==0x62||u[1]!==0x60||u[2]!==0x00||
    !Number.isInteger(u[3])||u[3]<0||u[3]>255)return null;
  return u[3]-40;
}
function footwell(reply){
  const u=reply&&reply.uds;
  if(!reply||!reply.ok||!Array.isArray(u)||u.length!==19||
    u[0]!==0x62||u[1]!==0xD8||u[2]!==0xD7)return null;
  const out={};
  for(const [key,offset] of Object.entries({frontLeft:3,frontRight:4,rearLeft:8,rearRight:9})){
    const n=u[3+offset];
    if(!Number.isInteger(n)||n<0||n>255){out[key]=null;continue;}
    const value=n<128?n:n-256;
    out[key]=value>=-40&&value<127?value:null;
  }
  return out;
}
function engineCds(reply){
  if(!reply||!reply.ok||!reply.fields||!reply.values)return null;
  const out={};
  for(const key of ['oil','coolant','rpm']){
    const v=reply.values[key];
    // Match OSA's kit/runtime/car.js CDS scaling: temperature raw - 48;
    // engine RPM raw * 0.25. Never interpret raw signal bytes as units.
    const valid=reply.fields[key]&&reply.fields[key].valid===true&&
      Number.isInteger(v)&&v>=0&&v<=65535&&
      (key==='rpm'?v!==65535:v!==255);
    out[key]=valid?(key==='rpm'?v*0.25:v-48):null;
  }
  return out;
}
module.exports={identification,transmission,footwell,engineCds,EGS_INDEX};
