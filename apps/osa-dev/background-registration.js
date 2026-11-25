'use strict';
const net=require('net');
const {warmupLabel}=require('./cluster-locales');
const appId='osa-dev',ruleId='oil-warm',field='engine.oilTemperature';
function request(msg){return new Promise((resolve,reject)=>{
 const s=net.createConnection('/run/bmrmodz-background-tool/ctl.sock');let data='',done=false;
 function finish(e,v){if(done)return;done=true;s.destroy();if(e)reject(e);else resolve(v);}
 s.setTimeout(3000);s.on('timeout',()=>finish(Error('BG timeout')));s.on('error',finish);s.on('end',()=>finish(Error('BG closed')));
 s.on('connect',()=>s.write(JSON.stringify(msg)+'\n'));s.setEncoding('utf8');s.on('data',x=>{data+=x;if(data.length>20000)return finish(Error('Oversized reply'));const i=data.indexOf('\n');if(i>=0){try{finish(null,JSON.parse(data.slice(0,i)));}catch(e){finish(e);}}});
});}
function desired(s){
 if(!s.enabled)return {api:1,op:'unregister',appId,ruleId};
 if(!Number.isFinite(s.target)||s.target<60||s.target>100)throw Error('Invalid oil target');
 return {api:1,op:'register',appId,rule:{api:1,appId,ruleId,fields:[{name:field,freshnessMs:5000}],condition:{field,op:'gte',value:s.target},rearm:{field,op:'lte',value:s.target-2},trigger:'rising',actions:[{type:'notification',name:'kombi',payload:{durationMs:4000,ttlMs:10000,segments:[{text:warmupLabel(s.language)+' ',color:'#ffffff',blinkMs:0},{text:String(s.target)+' °C',color:'#ffb547',blinkMs:0}]}}]}};
}
function create(log,get,send=request){let busy=false,accepted='';
 async function sync(){if(busy)return;busy=true;try{const msg=desired(get()),key=JSON.stringify(msg);if(key===accepted)return;const reply=await send(msg);if(!reply||!reply.ok)throw Error(reply&&reply.error||'Registration rejected');accepted=key;log.info('OSA BG '+msg.op+' accepted');}catch(e){log.warn('OSA BG registration: '+e.message);}finally{busy=false;}}
 return {sync};
}
function start(log,get,settings){if(process.env.MGU_RENDERD_SOCKET&&/mgu-emu-/.test(process.env.MGU_RENDERD_SOCKET))return;const c=create(log,get);settings.onChange(()=>c.sync());c.sync();setInterval(()=>c.sync(),1000).unref();}
module.exports={desired,create,start};
