'use strict';
// DPF DEV future Tool consumer declaration. This does NOT open a connection or
// run ECU acquisition. Only a trusted broker can turn it into an active demand.
const {B57,B47,forDde}=require('./dde-profiles');
function plan(ddeIdentity){
 const profile=forDde(ddeIdentity);
 if(!profile)return null;
 const engine=ddeIdentity===B57?'b57':ddeIdentity===B47?'b47':null;
 if(!engine)return null;
 const nameToKey=name=>'dpf.'+engine+'.'+name.toLowerCase().replace(/ /g,'_');
 const overview=profile.overview.map(([key])=>nameToKey(key));
 const detail=profile.detail.map(([key])=>nameToKey(key));
 const background=profile.regeneration?['REQUEST','MODE'].map(nameToKey):[];
 const fields=Array.from(new Set(overview.concat(detail)));
 const freshnessMs={};
 for(const key of fields)
  freshnessMs[key]=background.includes(key)?5000:60000;
 return {engine,fields,overview,detail,background,freshnessMs,leaseMs:15000,
  activation:'not-connected',source:'Data Tool managed cache when authenticated gateway exists'};
}
module.exports={plan};
