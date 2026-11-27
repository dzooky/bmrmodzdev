'use strict';
const mgu=require('./kit/mgu'),path=require('path');
const signals=require('./kit/signals'),headless=require('./headless');
// Bootstrap the fixed read-only socket independently of the RHMI start(ctx)
// callback. BMW autostart CONFIG_STATE may provide no rhmiApplication.
headless.start({signals,log:mgu.log,dataDir:path.resolve(__dirname,'../../data'),processRef:process});
const locales=require('./locales'),idriveLanguage=require('./kit/idrive-language');
mgu.run({start(ctx){
 let language='en';
 const closeScreen=()=>ctx.ui.close('MAIN');
 ctx.ui.onClick('BTN_CLOSE',closeScreen);
 ctx.hideButton('BTN_CLOSE');
 idriveLanguage.watch(ctx,value=>{
  language=Object.prototype.hasOwnProperty.call(locales,value)?value:'en';
  ctx.ui.text('BTN_CLOSE',locales[language][5]);
 });
 ctx.loop('MAIN',1,()=>{
  const theme=ctx.theme(),cv=ctx.canvas(1600,520).clear(theme.bg);
  const words=locales[language];
  function line(text,y,size,color,font){
   const opts={literal:true,align:'center',font:font||'label'};
   const width=cv.textWidth(text,size,opts);
   cv.text(text,800,y,width>1460?size*1460/width:size,color,opts);
  }
  line(words[0],145,54,theme.text,'bold');
  line(words[1],215,33,theme.text);
  line(words[2],265,33,theme.text);
  line(words[3],315,33,theme.dim);
  line(words[4]+' '+ctx.spec.version,365,23,theme.dim);
  if(ctx.display.own()){
   cv.roundRect(600,400,400,76,12,theme.accent);
   line(words[5],448,32,theme.text,'bold');
   cv.target(600,400,400,76,closeScreen,'close',12);
  }
  return ctx.ui.image('MAIN_GFX',cv);
 });
}});
