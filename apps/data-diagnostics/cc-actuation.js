'use strict';
// Manual, foreground-only OAP TASU proof. This does NOT give the Data Tool an
// actuator API: its ctl.sock is mode 0666 and is NOT an authorized control path.
// No automatic actions, arbitrary ECU parameters, raw UDS API or background runs.
const {Diag,replyTo}=require('./kit/diag');
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const CASES=Object.freeze({
 frontHeat:{label:'Front left heating',kind:'seat',ecu:0x78,button:0x1b,offset:19,belt:'frontLeft'},
 frontVent:{label:'Front right ventilation',kind:'seat',ecu:0x78,button:0x1e,offset:22,belt:'frontRight'},
 rearHeat:{label:'Rear left heating',kind:'seat',ecu:0x78,button:0x22,offset:23,belt:'rearLeft'},
 wheelHeat:{label:'Steering wheel heating',kind:'wheel',ecu:0x40,belt:'frontLeft'}
});
const hex=a=>Array.isArray(a)?a.map(v=>v.toString(16).padStart(2,'0').toUpperCase()).join(' '):'—';
function decodeSeat(reply,offset){
 if(!Array.isArray(reply)||reply[0]!==0x62||reply[1]!==0xd8||reply[2]!==0xdb)return null;
 const n=reply[3+offset];return Number.isInteger(n)&&n>=0&&n<=3?n:null;
}
function decodeWheel(reply){
 if(!Array.isArray(reply)||reply.length<8||reply[0]!==0x62||reply[1]!==0xd0||reply[2]!==0x74||
   (reply[3]!==0&&reply[3]!==1)||(reply[7]!==0&&reply[7]!==1))return null;
 return {on:reply[3]===1,fitted:reply[7]===1};
}
function stageError(e){
 return String(e&&e.message||e).replace(/[\r\n\t]/g,' ').slice(0,120);
}
async function run(id,options){
 const opts=options||{},spec=CASES[id],now=opts.now||Date.now;
 const out={id,source:'diagnostics-oap-native',toolActuationVerified:false,
  startedAt:new Date(now()).toISOString(),finishedAt:null,status:'FAIL',stage:'unstarted',
  before:null,after:null,restored:null,steps:[],error:null};
 function add(stage,fields){out.stage=stage;out.steps.push(Object.assign({at:new Date(now()).toISOString(),stage},fields||{}));}
 if(!spec){out.error='unknown-test-id';return out;}
 // Caller must confirm parking, equipment and a latched occupant belt on screen.
 // This is operator confirmation, NOT a verified transmission/speed read.
 if(opts.confirmed!==true){out.stage='not-confirmed';out.status='SKIP';return out;}
 const Diagnostic=opts.Diag||Diag,sleep=opts.pause||pause,log=opts.log||{info(){},warn(){}};
 let diag,seatAttempt=false,wheelAttempt=false;
 try{
  add('native-init');
  diag=new Diagnostic(opts.signals,log);diag.quiet=true;diag.busyLog=false;
  await diag.init();
  if(!diag.p)throw Error('native-proxy-unavailable');
  const req=async(ecu,sid,data,stage)=>{
   add(stage,{ecu,sid,request:hex([sid].concat(data))});
   let reply;
   try{reply=await diag.physical(ecu,sid,data,1500,replyTo(sid,data),
    {maxRetries:0,callTimeoutMs:2000,hardTimeoutMs:3500});}
   catch(e){add(stage+'-error',{error:stageError(e)});throw e;}
   add(stage+'-reply',{response:hex(reply)});
   if(!reply)throw Error(stage+':timeout');
   if(reply[0]===0x7f)throw Error(stage+':NRC-'+(reply[2]===undefined?'unknown':reply[2].toString(16).toUpperCase()));
   if(!replyTo(sid,data)(reply))throw Error(stage+':bad-echo');
   return reply;
  };
  if(spec.kind==='seat'){
   const level=async stage=>decodeSeat(await req(0x78,0x22,[0xd8,0xdb],stage),spec.offset);
   const before=await level('read-before');
   out.before=before;
   if(before===null)throw Error('seat-level-invalid');
   if(before!==0){out.status='SKIP';add('already-on',{level:before});return out;}
   const payload=[1,0xa1,0x26,spec.button];
   // Once press is attempted release + STOP run in finally, regardless of timeout.
   seatAttempt=true;
   await req(0x78,0x31,payload.concat(1),'press');
   await sleep(300);
   await req(0x78,0x31,payload.concat(0),'release');
   for(const delay of [350,500,700]){
    await sleep(delay);
    out.after=await level('read-after');
    if(out.after!==null&&out.after!==0)break;
   }
   if(out.after===null||out.after===0)throw Error('seat-did-not-activate');
   out.status='PASS';add('verified-on',{level:out.after});
  }else{
   const wheel=async stage=>decodeWheel(await req(0x40,0x22,[0xd0,0x74],stage));
   const before=await wheel('read-before');out.before=before;
   if(!before)throw Error('wheel-state-invalid');
   if(!before.fitted){out.status='SKIP';add('not-fitted');return out;}
   if(before.on){out.status='SKIP';add('already-on');return out;}
   wheelAttempt=true;
   await req(0x40,0x2e,[0xd0,0x74,30],'wheel-on-30s');
   for(const delay of [350,500,800]){
    await sleep(delay);out.after=await wheel('read-after');
    if(out.after&&out.after.on)break;
   }
   if(!out.after||!out.after.on)throw Error('wheel-did-not-activate');
   out.status='PASS';add('verified-on-30s');
  }
 }catch(e){out.status='FAIL';out.error=stageError(e);add('failed',{error:out.error});}
 finally{
  if(diag&&diag.p){
   const cleanup=async (ecu,sid,data,name)=>{
    try{
     add(name,{request:hex([sid].concat(data))});
     const r=await diag.physical(ecu,sid,data,1500,replyTo(sid,data),{maxRetries:0,hardTimeoutMs:3500,callTimeoutMs:2000});
     add(name+'-reply',{response:hex(r),ok:!!r&&r[0]!==0x7f&&replyTo(sid,data)(r)});
    }catch(e){add(name+'-error',{error:stageError(e)});}
   };
   if(seatAttempt){
    await cleanup(0x78,0x31,[1,0xa1,0x26,spec.button,0],'cleanup-release');
    await cleanup(0x78,0x31,[2,0xa1,0x26],'cleanup-stop');
   }
   // Wheel command uses the OEM 30-second auto-expiry; no replay of unknown
   // original state. Do not send an unverified second command on failure.
   try{if(diag.p.shutdown)await Promise.resolve(diag.p.shutdown());}catch(e){add('shutdown-error',{error:stageError(e)});}
  }
  out.finishedAt=new Date(now()).toISOString();
  if(wheelAttempt)add('wheel-auto-expiry',{seconds:30});
 }
 return out;
}
module.exports={run,CASES,decodeSeat,decodeWheel};
