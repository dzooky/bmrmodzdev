'use strict';
// Explicit manual HTTPS upload of sanitized diagnostic reports to the configured server.
// Never auto-send; do not include vehicle identifiers or authentication secrets.
const fs=require('fs'),path=require('path'),https=require('https'),dns=require('dns'),net=require('net');
const HOST='dzooky.eu',ENDPOINT='/bmrmodz.php';
// MGU's OAP resolver may not see the Wi-Fi DNS servers. Prefer the uplink lease
// when available, otherwise use the default resolver, preserving TLS validation.
function uplinkLookup(dataDir){
  return (hostname,opts,cb)=>{
    let lease=null;
    for(const f of [path.join(dataDir,'uplink.json'),'/run/mgu-uplink/lease.json']){
      try{const candidate=JSON.parse(fs.readFileSync(f,'utf8'));if(Array.isArray(candidate.dns)){lease=candidate;break;}}catch(_){}
    }
    const servers=lease?lease.dns.filter(ip=>net.isIP(ip)):[];
    if(!servers.length)return dns.lookup(hostname,opts,cb);
    const resolver=new dns.Resolver();
    resolver.setServers(servers);
    const timer=setTimeout(()=>resolver.cancel(),6000);
    resolver.resolve4(hostname,(error,addresses)=>{
      clearTimeout(timer);
      if(error||!addresses||!addresses.length)return cb(error||new Error('No DNS address'));
      if(opts.all)return cb(null,addresses.map(address=>({address,family:4})));
      cb(null,addresses[0],4);
    });
  };
}
function upload(report,dataDir,options){
  const opts=options||{};
  if(!report||report.schema!==1||report.application!=='bmrmodz-data-diagnostics'||!Array.isArray(report.results))
    return Promise.reject(new Error('Invalid diagnostic report'));
  // Only allowlisted fields; do not transmit any future accidental vehicle fields.
  const allowed=['schema','application','runMode','startedAt','finishedAt','totals','results',
    'controlsTested','signalPermissionsVerified','deviceVerified','notes'];
  const safe={};
  allowed.forEach(key=>{if(Object.prototype.hasOwnProperty.call(report,key))safe[key]=report[key];});
  // Whitelist each result property too.
  safe.results=report.results.map(item=>({
    id:String(item.id||''),label:String(item.label||''),status:String(item.status||''),
    durationMs:Number(item.durationMs)||0,detail:String(item.detail||'').slice(0,160)
  }));
  const body=JSON.stringify(safe);
  if(Buffer.byteLength(body)>32768)return Promise.reject(new Error('Diagnostic report exceeds 32 KB'));
  return new Promise((resolve,reject)=>{
    let finished=false,buffer='';
    const done=(error,response)=>{
      if(finished)return;finished=true;
      if(error)reject(error);else resolve(response);
    };
    const req=(opts.https||https).request({
      hostname:HOST,port:443,path:ENDPOINT,method:'POST',agent:false,
      lookup:uplinkLookup(dataDir),timeout:12000,
      headers:{'Content-Type':'application/json','Accept':'application/json',
        'Content-Length':Buffer.byteLength(body)}
    },response=>{
      const status=Number(response.statusCode)||0;
      const type=String(response.headers&&response.headers['content-type']||'unknown')
        .split(';')[0].trim().toLowerCase().slice(0,36)||'unknown';
      const meta='HTTP '+status+' '+type;
      let size=0;
      function preview(value){
        // Never display raw HTML, control characters, or long server replies.
        return String(value).replace(/<[^>]*>/g,' ').replace(/&(?:nbsp|amp|lt|gt|quot|#39);/gi,' ')
          .replace(/[\x00-\x1f\x7f]/g,' ').replace(/\s+/g,' ').trim().slice(0,38);
      }
      function fail(reason){
        return done(new Error(meta+': '+reason));
      }
      response.setEncoding('utf8');
      response.on('data',part=>{
        if(finished)return;
        size+=Buffer.byteLength(part,'utf8');
        if(size>4096){
          const hint=preview(buffer+String(part).slice(0,256));
          fail('Reply >4 KB'+(hint?' '+hint:''));
          response.destroy();
          return;
        }
        buffer+=part;
      });
      response.on('end',()=>{
        if(finished)return;
        let answer;
        try{answer=JSON.parse(buffer);}
        catch(_){return fail('Non-JSON reply'+(preview(buffer)?' '+preview(buffer):''));}
        if(status!==201||!answer||answer.ok!==true||!/^([0-9a-f]{24})$/.test(answer.id||'')){
          const reason=answer&&typeof answer.error==='string'?preview(answer.error):'Upload rejected';
          return fail(reason||'Upload rejected');
        }
        done(null,{ok:true,id:answer.id});
      });
      response.on('error',error=>done(error));
    });
    req.on('timeout',()=>req.destroy(new Error('Upload timeout')));
    req.on('error',done);
    req.end(body);
  });
}
module.exports={upload,HOST,ENDPOINT};
