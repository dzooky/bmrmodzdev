'use strict';
// Read-only network checks from inside the OAP application process.
// No shell commands, no vehicle identifiers, no MAC addresses, no background polling.
const os=require('os'),fs=require('fs'),net=require('net');
const HOST='dzooky.eu',PORT=443;
function interfaces(osApi){
  try{
    const all=(osApi||os).networkInterfaces();
    const found=[];
    for(const [name,items] of Object.entries(all)){
      for(const item of items||[]){
        if((item.family==='IPv4'||item.family===4)&&!item.internal)
          found.push(name+'='+item.address);
      }
    }
    return {status:found.length?'PASS':'FAIL',detail:found.length?found.slice(0,3).join(', ').slice(0,150):'No non-loopback IPv4 interface visible'};
  }catch(e){return {status:'FAIL',detail:'Interfaces: '+String(e.code||e.message).slice(0,110)};}
}
function route(fsApi){
  let raw;
  try{raw=(fsApi||fs).readFileSync('/proc/net/route','utf8');}
  catch(e){return {status:'FAIL',detail:'Route table: '+String(e.code||e.message).slice(0,110)};}
  const rows=raw.trim().split(/\r?\n/).slice(1).map(s=>s.trim().split(/\s+/));
  const usable=rows.filter(x=>x.length>=8&&((parseInt(x[3],16)||0)&1)!==0);
  const def=usable.find(x=>x[1]==='00000000'&&x[7]==='00000000');
  return {status:def?'PASS':'FAIL',detail:def?'Default route via '+def[0]+' (gateway '+def[2]+')':'No default route; entries='+usable.length};
}
function tcp(netApi,timeoutMs){
  return new Promise(resolve=>{
    let done=false,socket;
    const finish=(status,detail)=>{
      if(done)return;done=true;
      if(socket)socket.destroy();
      resolve({status,detail:detail.slice(0,150)});
    };
    try{
      socket=(netApi||net).createConnection({host:HOST,port:PORT});
      socket.once('connect',()=>finish('PASS','Connected '+HOST+':'+PORT));
      socket.once('error',e=>finish('FAIL',HOST+':'+PORT+' '+String(e.code||e.message||'ERROR')));
      socket.setTimeout(timeoutMs||4000,()=>finish('FAIL',HOST+':'+PORT+' ETIMEDOUT'));
    }catch(e){finish('FAIL','TCP: '+String(e.code||e.message));}
  });
}
async function check(id,dependencies){
  const d=dependencies||{};
  if(id==='networkInterfaces')return interfaces(d.os);
  if(id==='networkRoute')return route(d.fs);
  if(id==='networkTcp')return tcp(d.net,d.timeoutMs);
  throw new Error('Unknown network check');
}
module.exports={check,interfaces,route,tcp};
