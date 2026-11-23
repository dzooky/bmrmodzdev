'use strict';
const assert=require('assert');
const {inspect}=require('./auth-feasibility');
const {createPolicy}=require('./auth-policy');
const {createGateway}=require('./broker-gateway');
async function main(){
 const files={
  '/proc/self/status':'Name:\tnode\nSeccomp:\t2\nNoNewPrivs:\t1\nNSpid:\t321\n',
  '/proc/self/cgroup':'0::/test/sandbox\n',
  '/proc/self/attr/current':'unconfined\n',
  '/proc/self/ns/pid':'pid:[12345]'
 };
 const fake={readFileSync:(f)=>{if(!(f in files))throw Error('not readable');return files[f];}};
 const passive=inspect({fs:fake,socket:{}});
 assert.strictEqual(passive.ok,true);
 assert.strictEqual(passive.nativePeerApiAvailable,false);
 assert.strictEqual(passive.seccompActive,true);
 assert.strictEqual(passive.noNewPrivsEnabled,true);
 assert.strictEqual(passive.appIdentityVerified,false);
 assert.strictEqual(passive.productionAccessEnabled,false);
 assert.strictEqual(passive.securityLabelConfinementObserved,false);
 assert.strictEqual(JSON.stringify(passive).includes('/test/sandbox'),false);
 assert.strictEqual(JSON.stringify(passive).includes('321'),false);
 const empty=inspect({fs:{readFileSync:()=>{throw Error('EACCES');}},socket:{getPeerCredentials(){return {uid:1000};}}});
 assert.strictEqual(empty.procStatusAccessible,false);
 assert.strictEqual(empty.nativePeerApiAvailable,true);
 assert.strictEqual(empty.appIdentityVerified,false);
 const grants=new Map([['dpf.app',Symbol('dpf')],['osa.app',Symbol('osa')]]);
 const noVerifier=createPolicy({grants});
 assert.strictEqual((await noVerifier.resolve({uid:0})).verified,false);
 const spoof=createPolicy({grants,trustedVerifier:async peer=>peer});
 for(const forged of [
  {packageId:'dpf.app',uid:0},
  {packageId:'dpf.app',kernelPeerVerified:true,packageVerified:true,processInstanceVerified:false,isolationBoundaryVerified:true},
  {packageId:'dpf.app',kernelPeerVerified:true,packageVerified:true,processInstanceVerified:true,isolationBoundaryVerified:false},
  {packageId:'evil.app',kernelPeerVerified:true,packageVerified:true,processInstanceVerified:true,isolationBoundaryVerified:true},
  {packageId:'dpf.app',kernelPeerVerified:true,packageVerified:true,processInstanceVerified:true,isolationBoundaryVerified:true,revoked:true}
 ])assert.strictEqual((await spoof.resolve(forged)).verified,false);
 const trusted=createPolicy({grants,trustedVerifier:async peer=>
  peer===approved?{kernelPeerVerified:true,packageVerified:true,processInstanceVerified:true,
   isolationBoundaryVerified:true,packageId:'dpf.app'}:{kernelPeerVerified:false}});
 const approved={source:'test-harness-only'};
 const token=(await trusted.resolve(approved));
 assert.strictEqual(token.verified,true);
 assert.strictEqual(token.capability,grants.get('dpf.app'));
 const broker={get:async(fields,capability)=>{
  assert.strictEqual(capability,grants.get('dpf.app'));
  if(fields.some(field=>field!=='dpf.soot'))return {ok:false,error:'Not authorized'};
  return {ok:true,results:Object.fromEntries(fields.map(field=>[field,{valid:true,value:0}]))};
 }};
 const gateway=createGateway(broker,peer=>trusted.resolve(peer));
 assert.strictEqual((await gateway.dispatch({uid:0,packageId:'dpf.app'}, {op:'getData',fields:['dpf.soot']})).ok,false);
 assert.strictEqual((await gateway.dispatch(approved, {op:'getData',fields:['dpf.soot']})).ok,true);
 assert.strictEqual((await gateway.dispatch(approved,{op:'getData',fields:['engine.rpm']})).ok,false);
 assert.strictEqual(trusted.productionReady,false);
 console.log('Auth feasibility: passive safe flags and kernel+package+process+isolation fail-closed policy passed');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
