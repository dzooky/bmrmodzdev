'use strict';
// Single central KOMBI layer; does not guarantee restoration of factory BC slots.
const net=require('net'),fs=require('fs'),path=require('path');
const SOCKET=process.env.BMRMODZ_NOTIFICATION_SOCKET||'/run/bmrmodz-notification/ctl.sock';
const RENDERER=process.env.BMRMODZ_CLUSTER_RENDER_SOCKET||'/dev/shm/cluster-render/render.sock';
const WIDTH=430,HEIGHT=76,MAX_REQUEST=256*1024;
function packet(type,body){
  const header=Buffer.alloc(5);header.writeUInt32LE(body.length+1,0);header[4]=type;
  return Buffer.concat([header,body]);
}
function command(value){return packet(0x4a,Buffer.from(JSON.stringify(value)));}
function frame(pixels,id){
  const body=Buffer.alloc(14+pixels.length);body.writeUInt32LE(1,0);body.writeUInt32LE(id,4);
  pixels.copy(body,14);return packet(0x46,body);
}
function valid(req){
  if(!req||req.op!=='show'||req.target!=='kombi')return 'Unsupported target or operation';
  if(typeof req.app!=='string'||!/^[a-z][a-z0-9_-]{0,31}$/.test(req.app))return 'Invalid app';
  if(!Number.isInteger(req.durationMs)||req.durationMs<500||req.durationMs>15000)return 'Invalid duration';
  if(!Number.isInteger(req.blinkMs)||req.blinkMs<0||req.blinkMs>3000)return 'Invalid blink interval';
  if(!Number.isInteger(req.repeat)||req.repeat<1||req.repeat>10)return 'Invalid repeat count';
  if(!Number.isInteger(req.repeatIntervalMs)||req.repeatIntervalMs<0||req.repeatIntervalMs>60000)return 'Invalid repeat interval';
  if(req.durationMs*req.repeat+req.repeatIntervalMs*(req.repeat-1)>120000)return 'Notification too long';
  if(typeof req.rgba!=='string'||req.rgba.length!==Math.ceil(WIDTH*HEIGHT*4/3)*4)return 'Invalid frame size';
  if(!/^[A-Za-z0-9+/]+={0,2}$/.test(req.rgba))return 'Invalid frame encoding';
  return null;
}
function serve(options){
  options=options||{};
  const target=options.socket||SOCKET,renderer=options.renderer||RENDERER;
  let active=null,closing=false,releasing=false;
  const queue=[],seen=new Map(),stats={accepted:0,submitted:0,failed:0,expired:0};
  function drain(){if(closing||active||releasing)return;while(queue.length){const item=queue.shift();if(item.expires<=Date.now()){stats.expired++;continue;}show(item.req,result=>{if(result.ok)stats.submitted++;else stats.failed++;},item.render);return;}}
  function enqueue(req,reply){
    if(req.api!==1||req.target!=='kombi'||typeof req.app!=='string'||!/^[a-z][a-z0-9_-]{0,31}$/.test(req.app)||typeof req.id!=='string'||!/^[a-zA-Z0-9_-]{1,64}$/.test(req.id)||!Number.isInteger(req.durationMs)||req.durationMs<500||req.durationMs>15000||!Number.isInteger(req.ttlMs)||req.ttlMs<1000||req.ttlMs>60000)return reply({ok:false,error:'Invalid text request'});
    const now=Date.now(),key=req.app+':'+req.id;for(const [k,v] of seen)if(v<=now)seen.delete(k);
    if(seen.has(key))return reply({ok:true,status:'duplicate'});
    if(queue.length>=16||seen.size>=256)return reply({ok:false,error:'queue full'});
    let render;try{render=require('./text-renderer').prepare(req.segments);}catch(e){return reply({ok:false,error:e.message});}
    seen.set(key,now+Math.max(req.ttlMs,req.durationMs)+60000);queue.push({req,render,expires:now+req.ttlMs});stats.accepted++;reply({ok:true,status:'queued'});drain();
  }
  function release(){
    const current=active;active=null;if(!current)return;
    releasing=true;
    const released=()=>{releasing=false;drain();};
    current.timers.forEach(clearTimeout);
    if(!current.socket.destroyed){
      try{current.socket.write(command({op:'drop',ref:1}));current.socket.end();}
      catch(err){current.socket.destroy();}
      const forced=setTimeout(()=>current.socket.destroy(),1000);forced.unref();
      current.socket.once('close',()=>clearTimeout(forced));
    }
    if(current.socket.destroyed)setImmediate(released);else current.socket.once('close',released);
  }
  function show(req,reply,render){
    if(active||releasing||(!render&&queue.length))return reply({ok:false,error:'busy'});
    const error=render?null:valid(req);if(error)return reply({ok:false,error});
    const pixels=render?render.frameAt(0):Buffer.from(req.rgba,'base64');
    if(pixels.length!==WIDTH*HEIGHT*4)return reply({ok:false,error:'Invalid decoded frame'});
    const socket=net.createConnection(renderer),session={socket,timers:[],replied:false,frame:0};
    active=session;
    function respond(value){if(!session.replied){session.replied=true;reply(value);}}
    function after(ms,fn){const timer=setTimeout(fn,ms);timer.unref();session.timers.push(timer);}
    function draw(data){
      if(active!==session||socket.destroyed)return;
      if(socket.writableLength>WIDTH*HEIGHT*8||socket.bufferSize>WIDTH*HEIGHT*8){stats.failed++;release();return;}
      session.frame=(session.frame+1)>>>0;socket.write(frame(data,session.frame));
    }
    const deadline=setTimeout(()=>{
      respond({ok:false,error:'Renderer timeout'});if(active===session)release();
    },3000);
    deadline.unref();session.timers.push(deadline);
    socket.once('connect',()=>{
      clearTimeout(deadline);if(active!==session)return socket.destroy();
      socket.write(command({op:'hello',app:'bmrmodz-notification',proto:1}));
      socket.write(command({op:'layer',ref:1,kind:'image',target:'panel',class:'overlay',
        x:745,y:539,w:WIDTH,h:HEIGHT,iw:WIDTH,ih:HEIGHT,exclusive:0,contend:0}));
      if(render){
        const started=Date.now();draw(pixels);
        function advance(){if(active!==session)return;const elapsed=Date.now()-started;if(elapsed>=req.durationMs)return release();draw(render.frameAt(elapsed));after(Math.max(1,Math.min(req.durationMs,render.nextAt(elapsed))-elapsed),advance);}
        after(Math.min(req.durationMs,render.nextAt(0)),advance);
        respond({ok:true,status:'sent_to_renderer',target:'kombi'});return;
      }
      const transparent=Buffer.alloc(pixels.length);
      for(let i=0;i<req.repeat;i++){
        const start=i*(req.durationMs+req.repeatIntervalMs);
        after(start,()=>draw(pixels));
        if(req.blinkMs){
          for(let offset=req.blinkMs;offset<req.durationMs;offset+=req.blinkMs)
            after(start+offset,((on)=>()=>draw(on?pixels:transparent))(Math.floor(offset/req.blinkMs)%2===0));
        }
        if(i+1<req.repeat)after(start+req.durationMs,()=>draw(transparent));
      }
      const total=req.repeat*req.durationMs+(req.repeat-1)*req.repeatIntervalMs;
      after(total,()=>{if(active===session)release();});
      respond({ok:true,status:'sent_to_renderer',target:'kombi'});
    });
    socket.on('data',()=>{});
    socket.once('error',err=>{
      respond({ok:false,error:'Renderer unavailable: '+(err.code||err.message)});
      if(active===session)release();
    });
    socket.once('close',()=>{
      if(active===session){respond({ok:false,error:'Renderer disconnected'});release();}
    });
  }
  try{fs.mkdirSync(path.dirname(target));}catch(err){if(err.code!=='EEXIST')throw err;}
  try{fs.unlinkSync(target);}catch(err){if(err.code!=='ENOENT')throw err;}
  const server=net.createServer(client=>{
    client.setTimeout(4000,()=>client.destroy());
    client.setEncoding('utf8');let buffer='',processed=false;
    client.on('data',chunk=>{
      if(processed)return;buffer+=chunk;
      if(buffer.length>MAX_REQUEST){processed=true;client.end(JSON.stringify({ok:false,error:'Request too large'})+'\n');return;}
      const n=buffer.indexOf('\n');if(n<0)return;processed=true;let req;
      try{req=JSON.parse(buffer.slice(0,n));}
      catch(err){client.end(JSON.stringify({ok:false,error:'Invalid JSON'})+'\n');return;}
      const reply=value=>{if(!client.destroyed)client.end(JSON.stringify(value)+'\n');};
      if(req&&req.op==='status')return reply({ok:true,active:!!active||releasing,target:'kombi',hudSupported:false,queued:queue.length,stats:Object.assign({},stats)});
      if(req&&req.op==='showText')return enqueue(req,reply);
      show(req,reply);
    });
    client.on('error',()=>{});
  });
  server.maxConnections=16;
  server.listen(target,()=>fs.chmodSync(target,0o666));
  function close(){
    if(closing)return;closing=true;release();server.close();
    try{fs.unlinkSync(target);}catch(err){if(err.code!=='ENOENT')throw err;}
  }
  if(options.signals!==false){process.on('SIGINT',close);process.on('SIGTERM',close);}
  return {server,close};
}
if(require.main===module)serve();
module.exports={serve,valid,WIDTH,HEIGHT};
