'use strict';
const assert=require('assert'),EventEmitter=require('events');
const {interfaces,route,tcp,check}=require('./network');
async function run(){
 assert.strictEqual(interfaces({networkInterfaces:()=>({lo:[{family:'IPv4',internal:true,address:'127.0.0.1'}],wlan0:[{family:'IPv4',internal:false,address:'192.168.0.201',mac:'hidden'}]})}).status,'PASS');
 assert.strictEqual(interfaces({networkInterfaces:()=>({lo:[{family:'IPv4',internal:true,address:'127.0.0.1'}]})}).status,'FAIL');
 const withLan='Iface Destination Gateway Flags RefCnt Use Metric Mask MTU Window IRTT\nwlan0 00000000 0100A8C0 0003 0 0 0 00000000 0 0 0\n';
 assert.strictEqual(route({readFileSync:()=>withLan}).status,'PASS');
 assert.strictEqual(route({readFileSync:()=>('Iface Destination Gateway Flags RefCnt Use Metric Mask MTU Window IRTT\n')}).status,'FAIL');
 const fake={createConnection(opts){
  assert.strictEqual(opts.host,'dzooky.eu');assert.strictEqual(opts.port,443);
  const s=new EventEmitter();s.destroy=()=>{};s.setTimeout=()=>{};
  process.nextTick(()=>{const e=new Error('unreachable');e.code='ENETUNREACH';s.emit('error',e);});
  return s;
 }};
 const result=await tcp(fake,200);
 assert.strictEqual(result.status,'FAIL');assert.ok(result.detail.includes('ENETUNREACH'));
 assert.strictEqual((await check('networkTcp',{net:fake})).status,'FAIL');
 console.log('Data Diagnostics: network interfaces, route and ENETUNREACH TCP probe passed');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
