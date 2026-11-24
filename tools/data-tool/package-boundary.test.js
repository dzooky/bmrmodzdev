'use strict';
const assert=require('assert'),fs=require('fs'),net=require('net'),os=require('os'),path=require('path');
const {run,unpack,inspectPeer}=require('./package-boundary');
const mode=0o755,dir={isDirectory:()=>true,isSymbolicLink:()=>false,uid:0,mode};
const content=Buffer.from(JSON.stringify({name:'data-diagnostics'}));
const manifest={isFile:()=>true,isSymbolicLink:()=>false,uid:0,mode:0o644,size:content.length,dev:1,ino:2};
function fixture(options){
 const o=options||{};let statCalls=0;
 return {
  readFileSync(p){
   if(p.endsWith('/stat')){
    statCalls++;const fields=Array(30).fill('0');fields[0]='S';fields[19]=o.changed&&statCalls>1?'21':'20';
    return '42 (node with ) name) '+fields.join(' ');
   }
   return 'Uid:\t123\t'+(o.uid||123)+'\t123\t123\n';
  },
  readlinkSync:()=>o.cwd||'/var/opt/oap_123/data',
  lstatSync:p=>{
   if(p===o.missing)throw Error('private path must not leak');
   if(p.endsWith('package.json'))return {...manifest,...(o.manifest||{})};
   if(p===o.owner)return {...dir,uid:123};
   if(p===o.symlink)return {...dir,isSymbolicLink:()=>true};
   return p.endsWith('/source')&&o.writable?{...dir,mode:0o777}:dir;
  },
  openSync:()=>1,fstatSync:()=>manifest,
  readSync(fd,buf,offset,len){return content.copy(buf,offset,offset,Math.min(content.length,offset+len));},
  closeSync:()=>{}
 };
}
async function main(){
 assert.strictEqual(unpack().readUInt16LE(18),62);
 const peer={pid:42,uid:123};
 const good=inspectPeer(peer,fixture());
 assert.strictEqual(good.ok,true);assert.strictEqual(good.layout,true);assert.strictEqual(good.uidMatches,true);
 assert.strictEqual(good.sourceProtected,true);assert.strictEqual(good.candidate,'data-diagnostics');
 assert.strictEqual(good.packageIdentityVerified,false);assert.strictEqual(good.productionAccessEnabled,false);
 assert.strictEqual(inspectPeer(peer,fixture({changed:true})).stage,'peer-changed');
 assert.strictEqual(inspectPeer(peer,fixture({uid:456})).ok,false);
 const writable=inspectPeer(peer,fixture({writable:true}));
 assert.strictEqual(writable.sourceProtected,false);assert.strictEqual(writable.candidate,'unknown');
 assert.strictEqual(writable.protectionReason,'source-write');
 assert.strictEqual(good.protectionReason,'protected');
 assert.strictEqual(good.metadata.source,'root no-shared-write');
 assert.strictEqual(good.metadata.manifest,'root no-shared-write');
 const mixed=inspectPeer(peer,fixture({owner:'/var',writable:true,manifest:{uid:123}}));
 assert.strictEqual(mixed.protectionReason,'ancestor-owner');
 assert.strictEqual(mixed.metadata.ancestor,'mixed');
 assert.strictEqual(mixed.metadata.source,'root shared-write');
 assert.strictEqual(mixed.metadata.manifest,'peer no-shared-write');
 assert.strictEqual(mixed.candidate,'unknown');
 assert.strictEqual(inspectPeer(peer,fixture({symlink:'/var/opt'})).metadata.source,'unknown');
 for(const [opts,reason] of [[{owner:'/var'},'ancestor-owner'],[{owner:'/var/opt/oap_123'},'app-root-owner'],[{owner:'/var/opt/oap_123/source'},'source-owner'],[{symlink:'/var/opt'},'ancestor-symlink'],[{missing:'/var/opt/oap_123/source'},'source-stat'],[{manifest:{uid:123}},'manifest-owner'],[{manifest:{mode:0o666}},'manifest-write']]){
  const value=inspectPeer(peer,fixture(opts));assert.strictEqual(value.protectionReason,reason);assert.strictEqual(value.sourceProtected,false);assert.strictEqual(value.candidate,'unknown');assert.strictEqual(value.productionAccessEnabled,false);
 }
 assert.strictEqual(inspectPeer(peer,fixture({cwd:'/tmp/data'})).layout,false);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'bmrmodz-package-peer-')),address=path.join(dir,'ctl.sock');
 let client,server;
 try{
  let resolveResult;const result=new Promise(r=>resolveResult=r);
  server=net.createServer(socket=>{run(socket,dir).then(value=>{resolveResult(value);socket.destroy();});});
  await new Promise((r,j)=>{server.once('error',j);server.listen(address,r);});
  client=net.createConnection(address);client.on('error',()=>{});
  const actual=await result;
  assert.strictEqual(actual.ok,true,JSON.stringify(actual));assert.strictEqual(actual.processStable,true);
  assert.strictEqual(actual.packageIdentityVerified,false);assert.strictEqual(actual.productionAccessEnabled,false);
  assert.deepStrictEqual(Object.keys(actual).sort(),['ok','stage','observationOnly','packageIdentityVerified','productionAccessEnabled','layout','uidMatches','sourceProtected','candidate','processStable','protectionReason','metadata'].sort());
  assert.deepStrictEqual(fs.readdirSync(dir),['ctl.sock']);
 }finally{if(client)client.destroy();if(server)await new Promise(r=>server.close(r));try{fs.unlinkSync(address);}catch(_){}fs.rmdirSync(dir);}
 console.log('Package observation: private kernel credentials, stable process, protected candidate and no auth passed');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
