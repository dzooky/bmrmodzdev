'use strict';
// Reproduce installer service-health conditions: boot with no CDS/UDS activity,
// and failure of the optional secure socket must not prevent legacy status.
const assert=require('assert'),fs=require('fs'),net=require('net'),os=require('os'),path=require('path');
const {spawn}=require('child_process');
const SERVICE=path.join(__dirname,'service.js');
function probe(socket){
  return new Promise((resolve,reject)=>{
    const client=net.createConnection(socket);let buffer='';
    client.setTimeout(2000,()=>client.destroy(Error('health timeout')));
    client.on('connect',()=>client.write(JSON.stringify({op:'status'})+'\n'));
    client.on('data',data=>{buffer+=data.toString();if(buffer.includes('\n')){
      try{resolve(JSON.parse(buffer.split('\n')[0]));}catch(e){reject(e);}client.end();
    }});
    client.on('error',reject);
  });
}
async function check(extraEnv){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'bmrmodz-tool-health-'));
  const socket=path.join(dir,'ctl.sock');
  const child=spawn(process.execPath,[SERVICE],{
    env:Object.assign({},process.env,extraEnv,{BMRMODZ_DATA_SOCKET:socket}),
    stdio:['ignore','ignore','pipe']
  });
  let errorText='';
  child.stderr.on('data',d=>errorText+=d.toString());
  try{
    let status;
    for(let attempt=0;attempt<40;attempt++){
      if(child.exitCode!==null)throw Error('Service exited: '+errorText);
      try{status=await probe(socket);break;}catch(_){await new Promise(r=>setTimeout(r,50));}
    }
    assert.ok(status,'status socket did not become healthy: '+errorText);
    assert.strictEqual(status.version,'0.1.64');
    assert.strictEqual(status.ok,true);
    assert.strictEqual(status.stats.sent,0);
    assert.strictEqual(child.exitCode,null);
    const security=await new Promise((resolve,reject)=>{
      const c=net.createConnection(socket);let raw='';
      c.on('connect',()=>c.write(JSON.stringify({op:'securityCheck'})+'\n'));
      c.on('data',d=>{raw+=d.toString();if(raw.includes('\n')){c.end();resolve(JSON.parse(raw.split('\n')[0]));}});
      c.on('error',reject);
    });
    assert.strictEqual(security.productionAccessEnabled,false);
    assert.strictEqual(security.secureSocket.present,false);
    // Regression: real MGU cannot bind a second temporary Unix socket.
    // Test the broker over the original healthy ctl.sock, with no extra bind.
    const socketsBefore=fs.readdirSync(dir).sort();
    const broker=await new Promise((resolve,reject)=>{
      const c=net.createConnection(socket);let raw='';
      c.setTimeout(3000,()=>c.destroy(Error('broker test timeout')));
      c.on('connect',()=>c.write(JSON.stringify({op:'brokerSelfTest'})+'\n'));
      c.on('data',d=>{raw+=d.toString();if(raw.includes('\n')){
        c.end();try{resolve(JSON.parse(raw.split('\n')[0]));}catch(error){reject(error);}
      }});
      c.on('error',reject);
    });
    assert.strictEqual(broker.ok,true);
    assert.strictEqual(broker.broker.ok,true);
    assert.strictEqual(broker.broker.vehicleReads,0);
    assert.strictEqual(broker.ipc.mode,'existing-diagnostic-connection');
    assert.strictEqual(broker.ipc.transportConfirmed,true);
    assert.strictEqual(broker.ipc.productionDataGatewayEnabled,false);
    assert.deepStrictEqual(fs.readdirSync(dir).sort(),socketsBefore,
      'Manual broker check must not create a second socket');
    assert.strictEqual((await probe(socket)).stats.sent,0);
  }finally{
    child.kill('SIGTERM');
    await new Promise(resolve=>{if(child.exitCode!==null||child.signalCode!==null)return resolve();child.once('exit',resolve);setTimeout(resolve,1000).unref();});
    try{fs.unlinkSync(socket);}catch(_){}
    fs.rmdirSync(dir);
  }
}
async function main(){
  await check({BMRMODZ_SECURE_IPC_EXPERIMENT:'0'});
  // Uncreatable optional secure socket: must not break the original tool.
  await check({BMRMODZ_SECURE_IPC_EXPERIMENT:'1',BMRMODZ_SECURE_IPC_SOCKET:'/dev/null/uncreatable.sock'});
  await check({BMRMODZ_SECURE_IPC_EXPERIMENT:'1',BMRMODZ_SECURE_IPC_TARGET_UID:'invalid'});
  console.log('Data Tool health: normal service startup and optional secure endpoint failure passed');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
