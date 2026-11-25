'use strict';
const {Engine,validate}=require('./engine');
const scopeFor=k=>/^(engine\.|vehicle\.speed$|environment\.outsideTemperature$)/.test(k)?'cds':'dpf';
function createRuntime({store,connect,dispatch,now=Date.now}){
 let busy=false,closed=false,timer=null,error=null,revision=0,attempts=0,failures=0,unsupported=[],ticks=0,lastTick=null;
 const groups=['dpf','cds'].map(scope=>({scope,client:null,lastDemand:'',renewed:0}));
 const engine=new Engine(store.save,async(a,k)=>{attempts++;try{await dispatch(a,k);}catch(e){failures++;throw e;}});
 engine.rules=store.load();
 function request(req,owner){if(closed)throw Error('Closed');if(!req||req.api!==1||typeof owner!=='string'||!/^[a-zA-Z0-9_.-]{1,96}$/.test(owner))throw Error('Unauthorized request');
 if(req.op==='status')return {ok:true,rules:Array.from(engine.rules.values()).filter(x=>x.rule.appId===owner).map(x=>({ruleId:x.rule.ruleId,last:x.last,fired:x.fired})),dataError:error,unsupported:unsupported.slice(),attempts,failures};
 if(req.op==='register'||req.op==='update'){const rule=validate(req.rule);if(rule.appId!==owner)throw Error('Owner mismatch');engine.register(rule);}
 else if(req.op==='unregister'){if(typeof req.ruleId!=='string'||!/^[a-zA-Z0-9_.-]{1,96}$/.test(req.ruleId))throw Error('Invalid rule ID');engine.unregister(owner,req.ruleId);}
 else throw Error('Unknown operation');revision++;return {ok:true};}
 function disconnect(g){if(g.client)g.client.close();g.client=null;g.lastDemand='';g.renewed=0;}
 async function collect(g,desired){
  const requested=Object.keys(desired).filter(k=>scopeFor(k)===g.scope);
  const result={samples:Object.create(null),unsupported:[],error:null};
  if(!requested.length){disconnect(g);return result;}
  try{
   if(!g.client)g.client=await connect('background-tool',undefined,g.scope==='cds'?'cds':undefined);
   if(closed){disconnect(g);return result;}
   const cat=await g.client.request({op:'catalog'});if(!cat.ok)throw Error('Catalog unavailable');
   const supported=new Map(cat.fields.map(x=>[x.name,x.minFreshnessMs])),demand=Object.create(null);
   for(const k of requested)if(supported.has(k)&&desired[k]>=supported.get(k))demand[k]=desired[k];
   result.unsupported=requested.filter(k=>!Object.prototype.hasOwnProperty.call(demand,k));
   const fields=Object.keys(demand).sort();if(!fields.length){disconnect(g);result.error='NO_SUPPORTED_DEMAND';return result;}
   const key=JSON.stringify(fields.map(k=>[k,demand[k]]));
   if(key!==g.lastDemand||now()-g.renewed>=5000){const reply=await g.client.request({op:'demand',fields,freshnessMs:demand});if(!reply.ok)throw Error('Demand rejected');g.lastDemand=key;g.renewed=now();}
   const reply=await g.client.request({op:'snapshot'});if(!reply.ok||!reply.active)throw Error('Snapshot unavailable');
   for(const k of fields){const s=reply.fields[k];if(s)result.samples[k]={valid:s.valid===true,value:g.scope==='cds'?s.value:s.raw,sampledAt:Date.parse(s.sampledAt)};}
  }catch(e){result.error='DATA_UNAVAILABLE';disconnect(g);}
  return result;
 }
 async function tick(){if(busy||closed)return;busy=true;ticks++;lastTick=now();const rev=revision;
 try{const desired=engine.demand();const results=await Promise.all(groups.map(g=>collect(g,desired)));
 const samples=Object.assign(Object.create(null),...results.map(x=>x.samples));
 unsupported=[].concat(...results.map(x=>x.unsupported));const failed=results.find(x=>x.error);error=failed?failed.error:null;
 if(!closed&&rev===revision)await engine.tick(samples,now());
 }catch(e){error='DATA_UNAVAILABLE';}finally{busy=false;}}
 return {request,tick,health(){return {ok:true,api:1,version:'0.1.4',rules:engine.rules.size,fields:Object.keys(engine.demand()).length,connected:groups.some(g=>!!g.client),dataError:error,unsupported:unsupported.length,ticks,lastTick,attempts,failures};},start(){if(!timer&&!closed)timer=setInterval(()=>{tick();},1000);},close(){closed=true;if(timer)clearInterval(timer);groups.forEach(disconnect);}};
}
module.exports={createRuntime};
