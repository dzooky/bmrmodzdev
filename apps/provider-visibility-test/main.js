'use strict';
const fs=require('fs'),path=require('path'),mgu=require('./kit/mgu'),signals=require('./kit/signals');
const iface='com.harman.infotainment.systemfunctions.tasu.tasu.InternalTasu';
const report={startedAt:new Date().toISOString(),nativeModule:signals.hasNative(),configPresent:false};
try{signals.loadConfig(iface);report.configPresent=true;}catch(e){report.configError=String(e.message);}
try{fs.writeFileSync(path.resolve(__dirname,'../../data/visibility-test.json'),JSON.stringify(report),{mode:0o600});}catch(e){mgu.log.warn('Visibility test report: '+e.message);}
mgu.log.info('Visibility test '+JSON.stringify(report));
mgu.run({start(ctx){ctx.loop('MAIN',1,()=>{const t=ctx.theme(),c=ctx.canvas(1600,520).clear(t.bg);['This application is still in development phase and not ready for public use.','We still working on it and will be available soon.','Thank you','Native module: '+report.nativeModule+' / TASU config: '+report.configPresent].forEach((s,i)=>c.text(s,60,90+i*65,24,t.text,{literal:true}));return ctx.ui.image('MAIN_GFX',c);});}});
