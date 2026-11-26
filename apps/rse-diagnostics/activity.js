'use strict';
const fs=require('fs'),crypto=require('crypto');
const protocols=['tcp','tcp6','udp','udp6','unix'];
// Hash socket identity locally; never retain addresses, paths or payloads.
function sample(io=fs){
 const p={},n={},s={};let skipped=0,procReadable=false,netReadable=false;
 try{const ids=io.readdirSync('/proc').filter(x=>/^\d+$/.test(x));procReadable=true;skipped+=Math.max(0,ids.length-2048);
 for(const id of ids.slice(0,2048)){try{const raw=io.readFileSync('/proc/'+id+'/stat','utf8'),end=raw.lastIndexOf(')'),name=raw.slice(raw.indexOf('(')+1,end),f=raw.slice(end+2).trim().split(/\s+/),ticks=Number(f[11])+Number(f[12]);if(end<0||!Number.isSafeInteger(ticks)||!/^\d+$/.test(f[19])||!/^[\w. -]{1,64}$/.test(name))throw Error();p[id+':'+f[19]]=[name,ticks];}catch(_){skipped++;}}}catch(_){}
 try{const lines=io.readFileSync('/proc/net/dev','utf8').split('\n').slice(2);netReadable=true;for(const line of lines){const m=line.match(/^\s*([\w.-]{1,32}):\s*(.*)$/);if(!m)continue;const f=m[2].trim().split(/\s+/),rx=Number(f[0]),tx=Number(f[8]);if(Number.isSafeInteger(rx)&&Number.isSafeInteger(tx))n[m[1]]=[rx,tx];}}catch(_){}
 for(const k of protocols){try{const rows=io.readFileSync('/proc/net/'+k,'utf8').trim().split('\n').slice(1);if(rows.length>20000)throw Error();s[k]=new Set(rows.map(line=>{const f=line.trim().split(/\s+/);const identity=k==='unix'?[f[6],f[7]||'']:[f[1],f[2],f[3],f[9]];return crypto.createHash('sha256').update(identity.join('|')).digest('hex').slice(0,24);}));}catch(_){s[k]=null;}}
 return {p,n,s,skipped,procReadable,netReadable,at:Date.now()};
}
function diff(a,b){
 const cpu={},net={},sockets={};let started=0,ended=0;
 for(const [id,v] of Object.entries(b.p)){const old=a.p[id];if(!old){started++;continue;}const d=v[1]-old[1];if(d>0)cpu[v[0]]=(cpu[v[0]]||0)+d;}
 for(const id of Object.keys(a.p))if(!b.p[id])ended++;
 for(const [k,v] of Object.entries(b.n)){const old=a.n[k];if(old&&v[0]>=old[0]&&v[1]>=old[1])net[k]=[v[0]-old[0],v[1]-old[1]];}
 for(const k of protocols){const x=a.s[k],y=b.s[k];sockets[k]=x&&y?[...y].filter(v=>!x.has(v)).length:null; if(x&&y)sockets[k]=[sockets[k],[...x].filter(v=>!y.has(v)).length];}
 return {ms:b.at-a.at,cpu:Object.entries(cpu).sort((a,b)=>b[1]-a[1]).slice(0,12),net,sockets,started,ended,skipped:a.skipped+b.skipped,procReadable:a.procReadable&&b.procReadable,netReadable:a.netReadable&&b.netReadable};
}
module.exports={sample,diff};
