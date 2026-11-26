'use strict';
const mgu=require('./kit/mgu'),G=require('./kit/gauges'),path=require('path');
const bridge=require('./bridge');
mgu.run({start(ctx){
 const server=bridge.create({signals:ctx.signals,log:ctx.log,
  socket:path.resolve(process.cwd(),'../data/bmrmodz-cc-native.sock')});
 try{server.start();ctx.log.info('Data Native Provider ready: on-demand only');}
 catch(e){ctx.log.warn('Data Native Provider: '+String(e&&e.message||e));}
 ctx.loop('MAIN',1,()=>{
  const theme=ctx.theme(),cv=ctx.canvas(1600,520).clear(theme.bg);
  G.panel(cv,theme,24,110,1552,370,null);
  cv.text('Data Native Provider',75,100,34,theme.text,{literal:true,font:'bold'});
  ['This application is still in development phase and not ready for public use.',
   'We still working on it and will be available soon.',
   'Thank you'].forEach((line,i)=>cv.text(line,75,180+i*48,22,theme.text,{literal:true}));
  cv.text('Read-only, on-demand source. No vehicle controls.',75,365,22,theme.dim,{literal:true});
  return ctx.ui.image('MAIN_GFX',cv);
 });
}});
