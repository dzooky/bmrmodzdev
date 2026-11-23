'use strict';
// Explicit diagnostic-only synthetic exercise. Never reads vehicle or starts CDS.
// Measures data policy, concurrent broker requests and fail-closed IPC dispatch.
const {createBroker}=require('./data-broker');
const {createGateway}=require('./broker-gateway');
const {DEFINITIONS}=require('./data-catalog');
async function run(){
 const dpf=Symbol('synthetic-dpf'),osa=Symbol('synthetic-osa'),cc=Symbol('synthetic-cc');
 const grants=new Map([
  [dpf,new Set(Object.keys(DEFINITIONS).filter(x=>x.startsWith('dpf.')))],
  [osa,new Set(['transmission.oilTemperature','engine.oilTemperature','engine.coolantTemperature','engine.rpm'])],
  [cc,new Set(['engine.rpm','climate.frontLeftFootwell','climate.frontRightFootwell'])]
 ]);
 const time=Date.now(), at=new Date(time).toISOString();
 let reads=0,demand=0,release=0;
 const broker=createBroker({grants,now:()=>time,
  read:async(ecu,did)=>{
   reads++;
   const payload=ecu===0x12&&did===0xF150?[0x0F,0x1F,0xE8]:
    ecu===0x18&&did===0xF150?[0x0F,0x25,0xD0]:
    ecu===0x12&&did===0x44BE?[0,100]:
    ecu===0x18&&did===0x44BD?[0,120]:
    ecu===0x18&&did===0x44BF?[0,0,0,20]:
    ecu===0x18&&did===0x4B2F?[0,0,0,100]:
    ecu===0x18&&did===0x6000?[56]:
    ecu===0x78&&did===0xD8D7?Array(16).fill(20):null;
   return payload?{ok:true,uds:[0x62,did>>8,did&255,...payload],at}:{ok:false};
  },
  cds:{demand:()=>{demand++;return {ok:true};},
   snapshot:()=>({fields:{oil:{valid:true,ageMs:50},coolant:{valid:true,ageMs:50},rpm:{valid:true,ageMs:50}},
    values:{oil:58,coolant:64,rpm:4000}}),
   release:()=>{release++;return {ok:true};}}
 });
 // Resolver in this test is an in-process stand-in for future OS-proven package identity.
 // It is intentionally never supplied by service.js on a vehicle.
 const gateway=createGateway(broker,peer=>peer&&peer.testVerified===true?
  {verified:true,capability:peer.testCapability}:{verified:false});
 const before=reads;
 const rejected=await gateway.dispatch({testVerified:false,testCapability:dpf},
  {op:'getData',fields:['dpf.soot'],consumer:'dpf',uid:0});
 const inaccessible=await gateway.dispatch({testVerified:true,testCapability:dpf},
  {op:'getData',fields:['engine.rpm']});
 const [d1,d2,eg,cl]=await Promise.all([
   gateway.dispatch({testVerified:true,testCapability:dpf},{op:'getData',fields:['dpf.soot']}),
   gateway.dispatch({testVerified:true,testCapability:dpf},{op:'getData',fields:['dpf.soot']}),
   gateway.dispatch({testVerified:true,testCapability:osa},{op:'getData',fields:['engine.rpm','engine.oilTemperature']}),
   gateway.dispatch({testVerified:true,testCapability:cc},{op:'getData',fields:['engine.rpm','climate.frontLeftFootwell']})
 ]);
 const disabled=createGateway(broker);
 const stillClosed=await disabled.dispatch({testVerified:true,testCapability:dpf},
  {op:'getData',fields:['dpf.soot']});
 const passed=rejected.ok===false&&inaccessible.ok===false&&
   d1.ok===true&&d2.ok===true&&
   d1.results['dpf.soot'].valid===true&&
   d1.results['dpf.soot'].value===d2.results['dpf.soot'].value&&
   eg.ok===true&&eg.results['engine.rpm'].value===1000&&
   eg.results['engine.oilTemperature'].value===10&&
   cl.ok===true&&cl.results['engine.rpm'].value===1000&&
   cl.results['climate.frontLeftFootwell'].valid===true&&
   demand===1&&release===1&&reads-before===3&&
   broker.stats().coalesced>=1&&stillClosed.ok===false;
 return {ok:passed,mode:'synthetic-only',vehicleReads:0,productionAccessEnabled:false,
  trustedIdentityVerified:false,unauthorizedDenied:rejected.ok===false&&inaccessible.ok===false,
  scopedFields:eg.ok===true&&cl.ok===true&&d1.ok===true,
  sharedUds:broker.stats().coalesced>=1,sharedCds:demand===1&&release===1,
  gatewayFailClosed:stillClosed.ok===false};
}
module.exports={run};
