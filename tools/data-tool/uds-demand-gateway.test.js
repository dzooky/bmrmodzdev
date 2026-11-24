'use strict';
const assert=require('assert');
const {createDemandGateway}=require('./uds-demand-gateway');
const {createScheduler}=require('./uds-demand-scheduler');
const {build}=require('./dpf-demand-profile');
async function main(){
 const profile=build('0F1FE8'),field=profile.fields[0],other=profile.fields[1];
 const grant=Symbol('dpf-dev'),second=Symbol('second-test'),packages=new Map([['dpf-dev',grant],['second-test',second]]);
 let now=100000,reads=0;
 const scheduler=createScheduler({definitions:profile.definitions,grants:new Map([[grant,new Set([field])],[second,new Set([field])]]),now:()=>now,
  read:async(ecu,did)=>{reads++;return {ok:true,at:new Date(now).toISOString(),uds:[0x62,did>>8,did&255,0,1]};}});
 const peerA={},peerB={},unknown={};
 let revoked=false;
 const trustedVerifier=async peer=>{
  if(peer!==peerA&&peer!==peerB)return null;
  return {kernelPeerVerified:true,packageVerified:true,processInstanceVerified:true,isolationBoundaryVerified:true,
   packageId:peer===peerA?'dpf-dev':'second-test',revoked:peer===peerA&&revoked};
 };
 const gateway=createDemandGateway({scheduler,grants:packages,trustedVerifier});
 const closed=createDemandGateway({scheduler,grants:packages});
 const demand={op:'demand',fields:[field],freshnessMs:5000,leaseMs:15000};
 assert.strictEqual((await closed.dispatch(peerA,demand)).ok,false);
 assert.strictEqual((await gateway.dispatch(unknown,demand)).ok,false);
 assert.strictEqual((await gateway.dispatch(unknown,{...demand,packageId:'dpf-dev'})).ok,false);
 assert.strictEqual((await gateway.dispatch(peerA,{...demand,fields:[other]})).ok,false);
 assert.strictEqual((await gateway.dispatch(peerA,{...demand,capability:'dpf-dev'})).ok,false);
 assert.strictEqual(reads,0);
 assert.strictEqual((await gateway.dispatch(peerA,demand)).ok,true);
 assert.strictEqual((await gateway.dispatch(peerB,demand)).ok,true);
 assert.strictEqual((await gateway.dispatch(peerA,{op:'snapshot'})).fields[field].valid,false);
 assert.strictEqual(reads,0);
 assert.strictEqual(await scheduler.tick(),true);
 assert.strictEqual(await scheduler.tick(),false);
 assert.strictEqual(reads,1);
 assert.strictEqual((await gateway.dispatch(peerA,{op:'snapshot'})).fields[field].valid,true);
 assert.strictEqual((await gateway.dispatch(peerB,{op:'snapshot'})).fields[field].valid,true);
 revoked=true;
 assert.strictEqual((await gateway.dispatch(peerA,{op:'snapshot'})).ok,false);
 assert.strictEqual((await gateway.dispatch(peerA,demand)).ok,false);
 assert.strictEqual((await gateway.dispatch(peerB,{op:'release'})).ok,true);
 now+=16000;
 assert.strictEqual(await scheduler.tick(),false);
 assert.strictEqual(reads,1);
 assert.strictEqual(gateway.productionReady,false);
 scheduler.close();
 console.log('Private UDS demand gateway: default deny, peer-only grants, shared read, passive snapshots and lease expiry passed');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
