'use strict';
const fs=require('fs');
const terms=/weather|rse|rear|display|hmi/i;
const events=['Rear screens off','Left rear on','Rear apps menu','Rear Weather open','Rear Weather closed','Front Weather open','Front and rear Weather','Both rear Weather','Rear city changed','Rear screens off again'];
function snapshot(io=fs){
 const out={processes:[],procReadable:false,procSkipped:0,interfaces:[],interfacesReadable:false,sockets:{}};
 try{
 const pids=io.readdirSync('/proc').filter(x=>/^\d+$/.test(x));out.procReadable=true;
 for(const pid of pids.slice(0,2048)){
 try{const name=io.readFileSync('/proc/'+pid+'/comm','utf8').trim();
 if(terms.test(name)&&/^[\w. -]{1,64}$/.test(name))out.processes.push(name);
 }catch(_){out.procSkipped++;}
 }
 out.procSkipped+=Math.max(0,pids.length-2048);
 }catch(_){}
 try{out.interfaces=io.readdirSync('/sys/class/net').filter(x=>/^[\w.-]{1,32}$/.test(x)).slice(0,64).sort();out.interfacesReadable=true;}catch(_){}
 for(const name of ['tcp','tcp6','udp','udp6','unix']){
 try{const lines=io.readFileSync('/proc/net/'+name,'utf8').trim().split('\n');out.sockets[name]=Math.max(0,lines.length-1);}catch(_){out.sockets[name]=null;}
 }
 out.processes.sort();return out;
}
module.exports={snapshot,events};
