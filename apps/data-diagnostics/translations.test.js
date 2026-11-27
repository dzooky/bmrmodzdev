'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path');
const {catalogs,t}=require('./translations'),spec=require('./app.json');
assert.deepStrictEqual(Object.keys(catalogs),['en']);
assert.deepStrictEqual(spec.settings.find(s=>s.key==='language').options.map(a=>a[0]),['en']);
for(const [key,value] of Object.entries(catalogs.en))assert.ok(typeof value==='string'&&value.trim(),key);
assert.deepStrictEqual(Object.keys(spec.signals),["de.bmw.infotainment.climate.Climate","de.bmw.infotainment.climate.climatemaster.ClimateMaster","de.bmw.infrastructure.DriverSelectionModule"]);
assert.equal(spec.version,'0.2.10');
assert.equal(spec.mguInternet,true);
assert.deepStrictEqual(spec.screens[0].buttons,[]);
assert.equal(spec.requires['bmrmodz-data-tool'],undefined);
assert.equal(spec.requires['data-native-provider'],undefined);
for(const key of ['Climate Comfort Rules','Driver seat heating','Driver seat ventilation','Steering wheel heating','UNKNOWN','Read status','Send report','Catalog discovery only - rule values not yet verified','Report save failed','Sending','Report sent','Send failed'])assert.ok(catalogs.en[key],key);
const main=fs.readFileSync(path.join(__dirname,'main.js'),'utf8');
assert.ok(main.includes('rules.sample(ctx.signals,'));
assert.ok(main.includes("runMode:'cc-rules-catalog-0.2.10'"));
assert.ok(main.includes("G.frame(cv,theme,[word('Climate Comfort Rules')],0,[])"));
for(const token of ['ccActuation','requestHeating','client.request','nativeFront','oemWheelOn'])assert.ok(!main.includes(token),token);
console.log('CC rules single screen, English catalog and no actuator permissions PASS');

for(const v of Object.values(spec.signals)){assert.ok(!v._methods);for(const [k,s] of Object.entries(v))if(!k.startsWith('_'))assert.equal(s,'r');}

for(const d of spec.config.ccRuleGetters){assert.equal(spec.signals[d.interface][d.field],'r');assert.equal(spec.signals[d.interface]._instances,d.instance);}
