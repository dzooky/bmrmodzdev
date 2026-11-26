'use strict';
// MGU autostart may be CONFIG_STATE with no RHMI application, so this service
// deliberately starts before mgu.run and never depends on screen visibility.
// No ECU reads occur until a client requests ccNativeSnapshot.
const path=require('path'),bridge=require('./bridge');
function start(options){
 const opts=options||{},log=opts.log||{info(){},warn(){}};
 const dataDir=opts.dataDir||path.resolve(__dirname,'../../data');
 const service=(opts.create||bridge.create)({signals:opts.signals,log,
  socket:path.join(dataDir,'bmrmodz-cc-native.sock')});
 try{
  service.start();
  log.info('Data Native Provider read-only IPC listening (headless capable)');
 }catch(e){
  log.warn('Data Native Provider IPC: '+String(e&&e.message||e));
  return {ok:false,stage:'start-failed'};
 }
 // main app owns the process; on native process exit clean up its stale socket.
 if(opts.processRef&&typeof opts.processRef.once==='function')
  opts.processRef.once('exit',()=>{try{service.close();}catch(_){}});
 return {ok:true,service};
}
module.exports={start};
