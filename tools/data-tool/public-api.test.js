'use strict';
const assert=require('assert'),{createApi,LIMITS}=require('./public-api');
(async()=>{
 let t=100000,reads=0;
 const api=createApi({identity:'0F1FE8',now:()=>t,read:async(ecu,did)=>{reads++;return {ok:true,uds:[0x62,did>>8,did&255,1],at:new Date(t).toISOString()};}});
 const a=api.connect('dpf-dev'),b=api.connect('third-party'),field='dpf.b57.request';
 const demand={op:'demand',fields:[field],freshnessMs:{[field]:5000}};
 assert.strictEqual(await api.tick(),false);t+=1000;
 assert.strictEqual(a.request({op:'catalog'}).fields.length,12);
 assert.strictEqual(a.request({op:'read',ecu:18,did:1}).ok,false);
 assert.strictEqual(a.request({...demand,freshnessMs:{[field]:1}}).ok,false);
 assert.strictEqual(a.request(demand).ok,true);assert.strictEqual(b.request(demand).ok,true);
 assert.strictEqual(await api.tick(),true);assert.strictEqual(await api.tick(),false);
 assert.strictEqual(reads,1);assert.strictEqual(a.request({op:'snapshot'}).fields[field].raw,1);
 assert.strictEqual(b.request({op:'snapshot'}).fields[field].raw,1);
 a.close();assert.strictEqual(a.request(demand).ok,false);
 t+=6000;assert.strictEqual(await api.tick(),true);assert.strictEqual(reads,2);
 const clients=[];for(let i=1;i<LIMITS.sessions;i++)clients.push(api.connect('same-label'));
 assert.strictEqual(api.connect('overflow'),null);
 for(let i=0;i<11;i++)clients[0].request({op:'catalog'});
 assert.strictEqual(clients[0].request({op:'catalog'}).error,'RATE_LIMIT');
 t+=15001;assert.strictEqual(await api.tick(),false);assert.strictEqual(api.status().sessions,0);
 api.close();assert.strictEqual(api.connect('closed'),null);
 // Idle checks must not consume the global read slot. Two fast fields,
 // simulated 120 s, quarter-second timer and 150 ms ECU response latency.
 let clock=200000;const starts=[],samples={};
 const timing=createApi({identity:'0F1FE8',now:()=>clock,read:async(ecu,did)=>{
  starts.push(clock);clock+=150;
  (samples[did]||(samples[did]=[])).push(clock);
  return {ok:true,uds:[0x62,did>>8,did&255].concat(did===0x467E?[0,0,0,1]:[1]),at:new Date(clock).toISOString()};
 }});
 const c=timing.connect('timing'),d={op:'demand',fields:['dpf.b57.request','dpf.b57.mode'],freshnessMs:{'dpf.b57.request':5000,'dpf.b57.mode':5000}};
 assert.ok(c.request(d).ok);
 for(let i=0;i<480;i++){if(i%20===0)assert.ok(c.request(d).ok);await timing.tick();clock+=250;}
 assert.ok(starts.every((x,i)=>i===0||x-starts[i-1]>=1000));
 for(const row of Object.values(samples)){assert.ok(row.length>=22);assert.ok(row.every((x,i)=>i===0||x-row[i-1]<=5500));}
 assert.strictEqual(Object.keys(samples).length,2);
 timing.close();
 console.log('Public API foundation: limits, shared reads, passive snapshots, expiry and denied operations PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});
