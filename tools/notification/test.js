'use strict';
const assert=require('assert'),fs=require('fs'),net=require('net'),os=require('os'),path=require('path');
const {serve,WIDTH,HEIGHT}=require('./service');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'bmr-notification-'));
const ctl=path.join(dir,'ctl.sock'),renderer=path.join(dir,'render.sock'),packets=[];
const fake=net.createServer(c=>{
  let bytes=Buffer.alloc(0);
  c.on('data',part=>{
    bytes=Buffer.concat([bytes,part]);
    while(bytes.length>=5){
      const length=bytes.readUInt32LE(0)+4;if(bytes.length<length)break;
      const p=bytes.slice(0,length);
      packets.push({type:p[4],value:p[4]===0x4a?JSON.parse(p.slice(5).toString('utf8')):null});
      bytes=bytes.slice(length);
    }
  });
});
function request(payload){return new Promise((resolve,reject)=>{
  const c=net.createConnection(ctl);let data='';
  c.on('connect',()=>c.write(JSON.stringify(payload)+'\n'));
  c.on('data',chunk=>{
    data+=chunk.toString('utf8');const n=data.indexOf('\n');
    if(n>=0){c.destroy();resolve(JSON.parse(data.slice(0,n)));}
  });
  c.on('error',reject);
});}
function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
(async()=>{
  await new Promise(resolve=>fake.listen(renderer,resolve));
  const tool=serve({socket:ctl,renderer,signals:false});
  await new Promise(resolve=>tool.server.once('listening',resolve));
  const data={op:'show',app:'dpf',target:'kombi',durationMs:600,blinkMs:100,repeat:2,repeatIntervalMs:100,rgba:Buffer.alloc(WIDTH*HEIGHT*4).toString('base64')};
  assert.strictEqual((await request(Object.assign({},data,{target:'hud'}))).ok,false);
  assert.strictEqual((await request(data)).status,'sent_to_renderer');
  assert.strictEqual((await request(data)).error,'busy');
  await sleep(1350);
  assert.strictEqual(packets[0].value.op,'hello');
  assert.strictEqual(packets[1].value.op,'layer');
  assert.ok(packets.filter(p=>p.type===0x46).length>=10,'multiple blink frames');
  assert.ok(packets.some(p=>p.value&&p.value.op==='drop'),'renderer drop');
  assert.strictEqual((await request({op:'status'})).active,false);
  const text={api:1,op:'showText',target:'kombi',app:'diagnostics',id:'one',durationMs:600,ttlMs:5000,segments:[{text:'Test: ',color:'#FFFFFF',blinkMs:0},{text:'Slow',color:'#FF3030',blinkMs:250}]};
  assert.strictEqual((await request(text)).status,'queued');
  assert.strictEqual((await request(text)).status,'duplicate');
  assert.strictEqual((await request(Object.assign({},text,{id:'two'}))).status,'queued');
  assert.strictEqual((await request(data)).error,'busy');
  await sleep(1450);
  const status=await request({op:'status'});
  assert.strictEqual(status.stats.accepted,2);
  assert.strictEqual(status.stats.submitted,2);
  assert.strictEqual(status.queued,0);
  assert.strictEqual(status.active,false);
  const render=require('./text-renderer').prepare(text.segments);
  const on=render.frameAt(0),off=render.frameAt(250);
  assert.ok(!on.equals(off));
  assert.ok(off.some(v=>v>0),'static segment remains');
  assert.ok(on.equals(render.frameAt(500)));
  assert.strictEqual(render.nextAt(250),500);
  const manifest=require('./component.json');
  for(const file of manifest.files)assert.ok(fs.existsSync(path.join(__dirname,file.from)),file.from);
  assert.strictEqual(manifest.version,'0.2.1');
  assert.strictEqual(status.version,manifest.version);
  assert.strictEqual(status.rendererCheck.ok,true);
  assert.strictEqual((await request({op:'selfTest'})).rendererCheck.ok,true);
  const invalid=await request(Object.assign({},text,{id:'bad',segments:[]}));
  assert.strictEqual(invalid.code,'TEXT_PREPARE_FAILED');
  const rejected=await request({op:'status'});
  assert.strictEqual(rejected.stats.rejected,1);
  assert.strictEqual(rejected.lastError,'Invalid segments');
  assert.strictEqual(rejected.stats.accepted,2);
  tool.close();await new Promise(resolve=>fake.close(resolve));
  fs.rmSync(dir,{recursive:true,force:true});
  console.log('Notification Tool mocked renderer: passed');
})().catch(error=>{console.error(error);process.exitCode=1;fake.close();});
