'use strict';
const net=require('net');
const appId='dpf-dev',ruleId='regen',mode='dpf.b57.mode',requestField='dpf.b57.request';
function request(msg){return new Promise((resolve,reject)=>{
 const s=net.createConnection('/run/bmrmodz-background-tool/ctl.sock');let data='',done=false;
 function finish(e,v){if(done)return;done=true;s.destroy();if(e)reject(e);else resolve(v);}
 s.setTimeout(3000);s.on('timeout',()=>finish(Error('BG timeout')));s.on('error',finish);s.on('end',()=>finish(Error('BG closed')));
 s.on('connect',()=>s.write(JSON.stringify(msg)+'\n'));s.setEncoding('utf8');s.on('data',x=>{data+=x;if(data.length>20000)return finish(Error('Oversized reply'));const i=data.indexOf('\n');if(i>=0){try{finish(null,JSON.parse(data.slice(0,i)));}catch(e){finish(e);}}});
});}
function desired(s){
 if(!s.enabled||s.equipment===false)return {api:1,op:'unregister',appId,ruleId};
 if(s.equipment!==true)return null; // Unresolved VO must not erase a durable registration.
 const t=s.translate;
 const action=(label,color,blinkMs,durationMs)=>({type:'notification',name:'kombi',payload:{durationMs,ttlMs:10000,segments:[{text:t('DPF Regeneration:')+' ',color:'#ffffff',blinkMs},{text:t(label),color,blinkMs}]}});
 const inactive={field:mode,op:'bitClear',value:2};
 return {api:1,op:'register',appId,rule:{api:1,appId,ruleId,fields:[{name:requestField,freshnessMs:5000},{name:mode,freshnessMs:5000}],trigger:'state',states:[
  {id:'active',condition:{field:mode,op:'bitSet',value:2},actions:[action('Started','#ff2a2a',500,3000)],repeat:{delayMs:3000,intervalMs:60000,actions:[action('In Progress','#ff2a2a',333,1332)]}},
  {id:'requested',condition:{all:[inactive,{field:requestField,op:'gte',value:4},{field:requestField,op:'lte',value:6}]},actions:[action('Requested','#ffd700',500,3000)]},
  {id:'idle',condition:inactive,from:['active'],actions:[action('Finished','#23dc5a',500,3000)]}
 ]}};
}
function create(log,get,send=request){let busy=false,accepted='';
 async function sync(){if(busy)return;busy=true;try{const msg=desired(get());if(!msg)return;const key=JSON.stringify(msg);if(key===accepted)return;const reply=await send(msg);if(!reply||!reply.ok)throw Error(reply&&reply.error||'Registration rejected');accepted=key;log.info('DPF BG '+msg.op+' accepted');}catch(e){log.warn('DPF BG registration: '+e.message);}finally{busy=false;}}
 return {sync};
}
function start(log,get,settings){if(process.env.MGU_RENDERD_SOCKET&&/mgu-emu-/.test(process.env.MGU_RENDERD_SOCKET))return;const c=create(log,get);settings.onChange(()=>c.sync());c.sync();setInterval(()=>c.sync(),1000).unref();}
module.exports={desired,create,start};
