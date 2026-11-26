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
  cv.text('Read-only. Data Tool requests are processed on demand.',75,200,25,theme.text,{literal:true});
  cv.text('No background vehicle polling or vehicle controls.',75,250,24,theme.dim,{literal:true});
  return ctx.ui.image('MAIN_GFX',cv);
 });
}});
