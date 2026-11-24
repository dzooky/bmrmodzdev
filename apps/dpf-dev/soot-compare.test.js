'use strict';
const assert=require('assert');
const {compare,decode}=require('./soot-compare');
(async()=>{
 const old=Date.now()-1500;
 const legacy={value:2000*0.01525902,at:old};
 let calls=0;
 const good=await compare(legacy,async(ecu,did,opts)=>{
  calls++;assert.deepStrictEqual([ecu,did],[0x12,0x44BE]);
  assert.strictEqual(opts.withMeta,true);
  return {uds:[0x62,0x44,0xBE,0x07,0xD0],at:new Date().toISOString(),cached:false};
 });
 assert.strictEqual(calls,1);
 assert.strictEqual(good.ok,true);
 assert.ok(Math.abs(good.difference)<0.00001);
 assert.ok(good.legacyAgeMs>=1400&&good.legacyAgeMs<4000);
 assert.ok(good.toolAgeMs<3000);
 const noLegacy=await compare(null,async()=>{throw Error('Unexpected Tool read');});
 assert.strictEqual(noLegacy.reason,'NO_RECENT_SAMPLE');
 const stale=await compare({value:15,at:Date.now()-40000},async()=>{throw Error('Unexpected read');});
 assert.strictEqual(stale.reason,'NO_RECENT_SAMPLE');
 const invalid=await compare({value:15,at:Date.now()},async()=>({uds:[0x62,0x44,0xBE,4],at:new Date().toISOString()}));
 assert.strictEqual(invalid.reason,'INVALID_TOOL_SAMPLE');
 const fails=await compare({value:15,at:Date.now()},async()=>{throw Error('Tool unavailable');});
 assert.strictEqual(fails.reason,'TOOL_READ_FAILED');
 assert.strictEqual(decode([0x62,0x44,0xBE,0,100]),100*0.01525902);
 assert.strictEqual(decode([0x7f,0x44,0xBE,0,100]),null);
 // Verify the existing socket client preserves the legacy array contract
 // and exposes validated response metadata only for the explicit comparison.
 const net=require('net'),os=require('os'),path=require('path'),fs=require('fs');
 const sock=path.join(os.tmpdir(),'dpf-soot-compare-'+process.pid+'.sock');
 const server=net.createServer(conn=>{
  conn.once('data',buf=>{
   const req=JSON.parse(String(buf).trim());
   assert.deepStrictEqual(req,{op:'read',ecu:0x12,did:0x44BE});
   conn.end(JSON.stringify({ok:true,ecu:0x12,did:0x44BE,
    uds:[0x62,0x44,0xBE,0x07,0xD0],at:'2026-11-24T14:30:00.000Z',cached:true})+'\\n');
  });
 });
 await new Promise(resolve=>server.listen(sock,resolve));
 try{
  const client=require('./data-tool-read');
  const normal=await client.request(0x12,0x44BE,{socket:sock});
  assert.deepStrictEqual(normal,[0x62,0x44,0xBE,0x07,0xD0]);
  const meta=await client.request(0x12,0x44BE,{socket:sock,withMeta:true});
  assert.deepStrictEqual(meta,{uds:normal,at:'2026-11-24T14:30:00.000Z',cached:true});
 }finally{await new Promise(resolve=>server.close(resolve));try{fs.unlinkSync(sock);}catch(e){if(e.code!=='ENOENT')throw e;}}
 console.log('DPF DEV one-shot SOOT compare: valid, stale, invalid and unavailable cases PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});
