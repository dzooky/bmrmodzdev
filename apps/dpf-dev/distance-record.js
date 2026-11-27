'use strict';
// Highest valid distance-from-last-regeneration observed by this installation.
// DDE supplies the live distance; only the historical maximum is stored here.
const fs=require('fs'),path=require('path');
function create(dataDir,log){
  const file=path.join(dataDir,'dpf-distance-record.json');
  let maxKm=0;
  try {
    const saved=JSON.parse(fs.readFileSync(file,'utf8'));
    if(saved&&saved.schema===1&&Number.isFinite(saved.maxKm)&&saved.maxKm>=0&&saved.maxKm<=100000)
      maxKm=saved.maxKm;
  } catch(e) { if(e.code!=='ENOENT'&&log)log.warn('DPF distance record load: '+e.message); }
  function observe(km){
    if(!Number.isFinite(km)||km<0||km>100000||km<=maxKm)return false;
    maxKm=km;
    const tmp=file+'.tmp';
    try{
      fs.writeFileSync(tmp,JSON.stringify({schema:1,maxKm})+'\n');
      fs.renameSync(tmp,file);
    }catch(e){
      if(log)log.warn('DPF distance record save: '+e.message);
      try{fs.unlinkSync(tmp);}catch(ignore){}
    }
    return true;
  }
  function scale(averageKm,currentKm){
    // Average is a useful starting reference, not a regeneration limit.
    // Keep 10% headroom and round upwards to a readable 50 km scale.
    const base=Math.max(100,maxKm,Number.isFinite(averageKm)?averageKm:0,
      Number.isFinite(currentKm)?currentKm:0);
    return Math.ceil(base*1.1/50)*50;
  }
  return {observe,scale,get maxKm(){return maxKm;}};
}
// Mass records are independent of distance and of each other. No diagnostic threshold implied.
function createMass(dataDir,log){
  const file=path.join(dataDir,'dpf-mass-record.json');
  const maxima={SOOT:null,ASH:null};
  const valid=value=>Number.isFinite(value)&&value>=0&&value<=1000;
  try{
    const saved=JSON.parse(fs.readFileSync(file,'utf8'));
    if(saved&&saved.schema===1)for(const key of Object.keys(maxima))
      if(valid(saved[key])&&saved[key]>0)maxima[key]=saved[key];
  }catch(e){if(e.code!=='ENOENT'&&log)log.warn('DPF mass record load: '+e.message);}
  function observe(key,value){
    if(!Object.prototype.hasOwnProperty.call(maxima,key)||!valid(value)||value===0||
       (maxima[key]!==null&&value<=maxima[key]))return false;
    maxima[key]=value;
    const tmp=file+'.tmp';
    try{
      fs.writeFileSync(tmp,JSON.stringify({schema:1,...maxima})+'\n');
      fs.renameSync(tmp,file);
    }catch(e){
      if(log)log.warn('DPF mass record save: '+e.message);
      try{fs.unlinkSync(tmp);}catch(ignore){}
    }
    return true;
  }
  function scale(key){
    const value=maxima[key];
    return valid(value)&&value>0?Math.max(5,Math.ceil(value*1.2/5)*5):50;
  }
  return {observe,scale};
}
module.exports={create,createMass};
