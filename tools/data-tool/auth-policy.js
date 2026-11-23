'use strict';
// Future privileged attestor contract, not a production authenticator.
// UID/GID/PID, app names, JSON fields and filesystem DAC alone NEVER grant data.
// A trusted OS-specific verifier must bind a live peer to an installed package,
// with process start identity/lifetime attested before this can be wired up.
function createPolicy(options){
 const opts=options||{},trustedVerifier=opts.trustedVerifier;
 const grants=opts.grants;
 if(!(grants instanceof Map)||!Array.from(grants.values()).every(v=>typeof v==='symbol'))
  throw Error('Trusted package-to-capability map required');
 async function resolve(peer){
  if(typeof trustedVerifier!=='function')return {verified:false,reason:'attestor-unavailable'};
  let attestation=null;
  try{attestation=await trustedVerifier(peer);}catch(_){return {verified:false,reason:'attestor-failed'};}
  if(!attestation||attestation.kernelPeerVerified!==true||
      attestation.packageVerified!==true||
      attestation.processInstanceVerified!==true||
      attestation.isolationBoundaryVerified!==true||
      attestation.revoked===true||
      typeof attestation.packageId!=='string'||
      !grants.has(attestation.packageId))
    return {verified:false,reason:'not-authorized'};
  return {verified:true,capability:grants.get(attestation.packageId)};
 }
 return {resolve,productionReady:false};
}
module.exports={createPolicy};
