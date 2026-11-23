'use strict';
const assert=require('assert');
const {createBroker}=require('./data-broker');
const {DEFINITIONS,describe,decodeCds}=require('./data-catalog');
const now=Date.parse('2026-11-23T18:32:32.000Z');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const dpf=Symbol('trusted-dpf'),osa=Symbol('trusted-osa'),cc=Symbol('trusted-cc');
const grants=new Map([
 [dpf,new Set(['dpf.soot','dpf.ash','dpf.distanceSinceRegen','dpf.averageDistance'])],
 [osa,new Set(['engine.oilTemperature','engine.coolantTemperature','engine.rpm','transmission.oilTemperature'])],
 [cc,new Set(['engine.rpm','climate.frontLeftFootwell','climate.frontRightFootwell','climate.rearLeftFootwell','climate.rearRightFootwell'])]
]);
function response(ecu,did){
 const payload={
 '18:61776':[0x0F,0x1F,0xE8], // DDE F150 B57
 '24:61776':[0x0F,0x25,0xD0], // EGS F150
 '18:17598':[0x03,0xE8], // soot 1000 raw
 '18:17597':[0x02,0x00], // ash 512 raw
 '18:17599':[0,0,0xC3,0x50], // since 50 km
 '18:19247':[0,0,0xEA,0x60], // avg 60 km
 '24:24576':[56], // ATF 16C
 '120:55511':Array(16).fill(10) // IHKA D8D7
 };
 const key=ecu+':'+did;
 if(!payload[key])return {ok:false};
 const p=payload[key].slice();
 if(ecu===120){p[3]=20;p[4]=21;p[8]=22;p[9]=23;}
 return {ok:true,uds:[0x62,did>>8,did&255,...p],at:new Date(now).toISOString()};
}
async function main(){
 let sent=0,active=0,starts=0,releases=0;
 const cds={
   demand(){starts++;active++;return {ok:true};},
   snapshot(){return {ok:true,fields:{oil:{valid:true,ageMs:40},coolant:{valid:true,ageMs:70},rpm:{valid:true,ageMs:10}},
      values:{oil:58,coolant:64,rpm:4000}};},
   release(){releases++;active--;return {ok:true};}
 };
 const broker=createBroker({grants,cds,now:()=>now,read:async(ecu,did)=>{sent++;await sleep(12);return response(ecu,did);}});
 assert.strictEqual((await broker.get(['dpf.soot'],Symbol('forged'))).ok,false);
 assert.strictEqual((await broker.get(['dpf.soot'], 'trusted-dpf')).ok,false);
 assert.strictEqual((await broker.get(['transmission.oilTemperature'],dpf)).ok,false);
 assert.strictEqual((await broker.get(['engine.rpm'],dpf)).ok,false);
 assert.strictEqual(sent,0);
 assert.strictEqual((await broker.get(['dpf.soot','dpf.soot'],dpf)).ok,false);
 assert.strictEqual((await broker.get(['dpf.regeneration'],dpf)).ok,false);
 assert.strictEqual((await broker.get(['dpf.soot','custom.ecu'],dpf)).ok,false);
 const [first,second]=await Promise.all([
   broker.get(['dpf.soot','dpf.ash','dpf.distanceSinceRegen','dpf.averageDistance'],dpf),
   broker.get(['dpf.soot'],dpf)
 ]);
 assert.strictEqual(first.ok,true);
 assert.strictEqual(second.ok,true);
 assert.strictEqual(first.results['dpf.soot'].value,15.26);
 assert.strictEqual(first.results['dpf.distanceSinceRegen'].value,50);
 assert.strictEqual(first.results['dpf.averageDistance'].value,60);
 assert.strictEqual(sent,5,'one identity + four unique DPF reads for simultaneous clients');
 assert.ok(broker.stats().coalesced>=2);
 const atf=await broker.get(['transmission.oilTemperature'],osa);
 assert.strictEqual(atf.results['transmission.oilTemperature'].value,16);
 const temperatures=await broker.get(['engine.oilTemperature','engine.coolantTemperature','engine.rpm'],osa);
 assert.deepStrictEqual(temperatures.results['engine.oilTemperature'].value,10);
 assert.strictEqual(temperatures.results['engine.coolantTemperature'].value,16);
 assert.strictEqual(temperatures.results['engine.rpm'].value,1000);
 assert.strictEqual(starts,1);assert.strictEqual(releases,1);assert.strictEqual(active,0);
 const foot=await broker.get(['climate.frontLeftFootwell','climate.frontRightFootwell','climate.rearLeftFootwell','climate.rearRightFootwell'],cc);
 assert.deepStrictEqual(Object.values(foot.results).map(x=>x.value),[20,21,22,23]);
 assert.strictEqual(decodeCds(255,DEFINITIONS['engine.oilTemperature']),null);
 assert.strictEqual(decodeCds(65535,DEFINITIONS['engine.rpm']),null);
 assert.strictEqual(describe().productionAccessEnabled,false);
 const stale=createBroker({grants,now:()=>now+11000,read:async(e,d)=>response(e,d)});
 const old=await stale.get(['dpf.soot'],dpf);
 assert.strictEqual(old.results['dpf.soot'].valid,false,'stale UDS must not appear live');
 const invalidCds=createBroker({grants,now:()=>now,cds:{
   demand:()=>({ok:true}),
   snapshot:()=>({fields:{rpm:{valid:false,ageMs:3000}},values:{rpm:1000}}),
   release:()=>({ok:true})
 },read:async()=>({ok:false})});
 assert.strictEqual((await invalidCds.get(['engine.rpm'],osa)).results['engine.rpm'].valid,false);
 // Two consumers share one CDS lease and cannot release it while another request is active.
 let releaseCount=0,demandCount=0;
 const shared=createBroker({grants,now:()=>now,read:async()=>({ok:false}),cds:{
   demand:async()=>{demandCount++;await sleep(15);return {ok:true};},
   snapshot:()=>({fields:{rpm:{valid:true,ageMs:0}},values:{rpm:800}}),
   release:()=>{releaseCount++;return {ok:true};}
 }});
 const [c1,c2]=await Promise.all([shared.get(['engine.rpm'],osa),shared.get(['engine.rpm'],cc)]);
 assert.strictEqual(c1.results['engine.rpm'].value,200);
 assert.strictEqual(c2.results['engine.rpm'].value,200);
 assert.strictEqual(demandCount,1);assert.strictEqual(releaseCount,1);
 console.log('Data Broker: named data, 3 scoped grants, DDE/EGS/IHKA/CDS decoding, dedupe, freshness, concurrent lease and fail-closed passed');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
