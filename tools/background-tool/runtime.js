'use strict';
const {Engine,validate}=require('./engine');
function createRuntime({store,connect,dispatch,now=Date.now}){
 let client=null,busy=false,closed=false,timer=null,lastDemand='',renewed=0,error=null,revision=0,attempts=0,failures=0,unsupported=[];
 const engine=new Engine(store.save,async(a,k)=>{attempts++;try{await dispatch(a,k);}catch(e){failures++;throw e;}});
 engine.rules=store.load();
 function request(req,owner){if(closed)throw Error('Closed');if(!req||req.api!==1||typeof owner!=='string'||!/^[a-zA-Z0-9_.-]{1,96}$/.test(owner))throw Error('Unauthorized request');
 if(req.op==='status')return {ok:true,rules:Array.from(engine.rules.values()).filter(x=>x.rule.appId===owner).map(x=>({ruleId:x.rule.ruleId,last:x.last,fired:x.fired})),dataError:error,unsupported:unsupported.slice(),attempts,failures};
 if(req.op==='register'||req.op==='update'){const rule=validate(req.rule);if(rule.appId!==owner)throw Error('Owner mismatch');engine.register(rule);}
 else if(req.op==='unregister'){if(typeof req.ruleId!=='string'||!/^[a-zA-Z0-9_.-]{1,96}$/.test(req.ruleId))throw Error('Invalid rule ID');engine.unregister(owner,req.ruleId);}
 else throw Error('Unknown operation');revision++;return {ok:true};}
 function disconnect(){if(client)client.close();client=null;lastDemand='';renewed=0;}
 async function tick(){if(busy||closed)return;busy=true;const rev=revision;
 try{const desired=engine.demand();if(!Object.keys(desired).length){disconnect();error=null;unsupported=[];return;}
 if(!client)client=await connect('background-tool');if(closed){disconnect();return;}
 const cat=await client.request({op:'catalog'});if(!cat.ok)throw Error('Catalog unavailable');
 const supported=new Map(cat.fields.map(x=>[x.name,x.minFreshnessMs])),demand=Object.create(null);
 for(const [k,v] of Object.entries(desired))if(supported.has(k)&&v>=supported.get(k))demand[k]=v;
 unsupported=Object.keys(desired).filter(k=>!Object.prototype.hasOwnProperty.call(demand,k));
 const fields=Object.keys(demand).sort();if(!fields.length){disconnect();error='NO_SUPPORTED_DEMAND';return;}
 if(fields.length>12)throw Error('Demand limit');
 const key=JSON.stringify(fields.map(k=>[k,demand[k]]));
 if(key!==lastDemand||now()-renewed>=5000){const reply=await client.request({op:'demand',fields,freshnessMs:demand});if(!reply.ok)throw Error('Demand rejected');lastDemand=key;renewed=now();}
 const reply=await client.request({op:'snapshot'});if(!reply.ok||!reply.active)throw Error('Snapshot unavailable');
 const samples=Object.create(null);for(const k of fields){const s=reply.fields[k];if(s)samples[k]={valid:s.valid===true,value:s.raw,sampledAt:Date.parse(s.sampledAt)};}
 if(!closed&&rev===revision)await engine.tick(samples,now());error=null;
 }catch(e){error='DATA_UNAVAILABLE';disconnect();}finally{busy=false;}}
 return {request,tick,start(){if(!timer&&!closed)timer=setInterval(()=>{tick();},1000);},close(){closed=true;if(timer)clearInterval(timer);disconnect();}};
}
module.exports={createRuntime};
