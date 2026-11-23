'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path');
const {catalogs,t}=require('./translations');
const spec=require('./app.json');
const keys=Object.keys(catalogs.en).sort();
assert.strictEqual(Object.keys(catalogs).length,1);
const supported=spec.settings.find(s=>s.key==='language').options.map(a=>a[0]);
assert.deepStrictEqual(Object.keys(catalogs).sort(),supported.sort());
for(const [lang,catalog] of Object.entries(catalogs)){
  assert.deepStrictEqual(Object.keys(catalog).sort(),keys,lang+' key mismatch');
  for(const [key,value] of Object.entries(catalog))assert.ok(typeof value==='string'&&value.trim(),lang+' empty '+key);
  assert.ok(t(lang,"What's New"));
  assert.ok(t(lang,'Share'));
}
assert.ok(spec.screens[0].buttons.some(b=>b[0]==='BTN_RUN'));
assert.deepStrictEqual(spec.signals,{});
assert.strictEqual(spec.requires['bmrmodz-data-tool'],'0.1.22');
assert.ok(spec.screens[0].buttons.some(b=>b[0]==='BTN_SEND'));
assert.ok(!spec.screens[0].buttons.some(b=>b[0]==='BTN_EXPORT'));
assert.deepStrictEqual(spec.screens[0].buttons.map(b=>b[0]),['BTN_RUN','BTN_GEN','BTN_SEND']);
assert.ok(t('en','Secure upload'));
assert.ok(t('en','Network diagnostics'));
assert.ok(t('en','HTTPS report upload'));
assert.ok(t('en','MGU internet access'));
assert.ok(t('en','HTTP response diagnostics'));
assert.ok(t('en','Corrected upload endpoint'));
assert.ok(t('en','SOME/IP setup diagnostics'));
assert.ok(t('en','Generate CDS test'));
assert.ok(t('en','Send report button restored'));
assert.ok(t('en','Focused diagnostics'));
assert.ok(t('en','CDS ACL audit'));
assert.ok(t('en','CDS numeric validation'));
assert.ok(t('en','Shared CDS data engine'));
assert.ok(t('en','CDS multi-consumer test'));
assert.ok(t('en','Secure IPC audit'));
assert.ok(t('en','Data Tool startup recovery'));
assert.ok(t('en','Process identity survey'));
assert.ok(t('en','Drivetrain ECU retry test'));
assert.ok(t('en','UDS response tracing'));
assert.ok(t('en','Short TASU envelope audit'));
assert.ok(spec.screens[0].buttons.some(b=>b[0]==='BTN_GEN'));
assert.strictEqual(spec.mguInternet,true,'diagnostics requires MGU Store internet uplink');
const main=fs.readFileSync(path.join(__dirname,'main.js'),'utf8');
for(const text of [
 'This application is still in development phase and not ready for public use.',
 'We still working on it and will be available soon.',
 'Thank you'
])assert.ok(main.includes(text));
assert.ok(main.includes("const pages=['Info','Diagnostics','Results','Share']"));
assert.ok(main.includes("ui.onClick('BTN_SEND'"));
assert.ok(!main.includes("ui.onClick('BTN_EXPORT'"));
assert.ok(!main.includes("ui.onClick('BTN_PREV'"));
assert.ok(!main.includes("ui.onClick('BTN_NEXT'"));
console.log('Data Diagnostics: English-only translations, new app notice, tool-only manifest passed');
