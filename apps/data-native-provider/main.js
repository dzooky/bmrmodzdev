'use strict';
const mgu=require('./kit/mgu'),path=require('path');
const signals=require('./kit/signals'),headless=require('./headless');
// Bootstrap the fixed read-only socket independently of the RHMI start(ctx)
// callback. BMW autostart CONFIG_STATE may provide no rhmiApplication.
headless.start({signals,log:mgu.log,dataDir:path.resolve(__dirname,'../../data'),processRef:process});
const locales=require('./locales'),idriveLanguage=require('./kit/idrive-language');
mgu.run({start(ctx){
 let language='en';
 idriveLanguage.watch(ctx,value=>{language=Object.prototype.hasOwnProperty.call(locales,value)?value:'en';});
 ctx.loop('MAIN',1,()=>{
  const theme=ctx.theme(),cv=ctx.canvas(1600,520).clear(theme.bg);
  const words=locales[language];
  function line(text,y,size,color,font){
   const opts={literal:true,align:'center',font:font||'label'};
   const width=cv.textWidth(text,size,opts);
   cv.text(text,800,y,width>1460?size*1460/width:size,color,opts);
  }
  line(words[0],185,54,theme.text,'bold');
  line(words[1],260,33,theme.text);
  line(words[2],310,33,theme.text);
  line(words[3],360,33,theme.dim);
  line(words[4]+' '+ctx.spec.version,465,23,theme.dim);
  return ctx.ui.image('MAIN_GFX',cv);
 });
}});
