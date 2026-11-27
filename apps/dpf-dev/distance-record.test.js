'use strict';
const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path');
const {create,createMass}=require('./distance-record');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dpf-distance-'));
try{
  const h=create(dir);
  assert.strictEqual(h.maxKm,0);
  assert.strictEqual(h.scale(350,null),400); // average sets the initial scale
  assert.strictEqual(h.observe(352.5),true);
  assert.strictEqual(h.maxKm,352.5);
  assert.strictEqual(h.scale(350,352.5),400);
  assert.strictEqual(h.observe(430.2),true); // exceeds old limit, increase scale
  assert.strictEqual(h.scale(350,430.2),500);
  assert.strictEqual(h.observe(12),false); // new regeneration cannot erase record
  assert.strictEqual(h.maxKm,430.2);
  assert.strictEqual(h.observe(NaN),false);
  assert.strictEqual(h.observe(-1),false);
  assert.strictEqual(h.observe(100001),false);
  const reloaded=create(dir);
  assert.strictEqual(reloaded.maxKm,430.2); // survived restart
  assert.strictEqual(reloaded.scale(350,12),500);
  const m=createMass(dir);
  assert.strictEqual(m.scale('SOOT'),50);
  assert.strictEqual(m.scale('ASH'),50);
  assert.strictEqual(m.observe('SOOT',0),false);
  assert.strictEqual(m.observe('SOOT',28),true);
  assert.strictEqual(m.scale('SOOT'),35);
  assert.strictEqual(m.scale('ASH'),50);
  assert.strictEqual(m.observe('ASH',27.3),true);
  assert.strictEqual(m.scale('ASH'),35);
  assert.strictEqual(m.observe('SOOT',2),false);
  assert.strictEqual(m.observe('SOOT',NaN),false);
  assert.strictEqual(m.observe('ASH',-1),false);
  assert.strictEqual(m.observe('ASH',1001),false);
  assert.strictEqual(m.observe('SOOT',42),true);
  assert.strictEqual(m.scale('SOOT'),55);
  const restored=createMass(dir);
  assert.strictEqual(restored.scale('SOOT'),55);
  assert.strictEqual(restored.scale('ASH'),35);
  assert.strictEqual(restored.observe('SOOT',10),false);
  assert.strictEqual(create(dir).maxKm,430.2);
  console.log('DPF persistent adaptive distance and mass scales verified');
}finally{
  fs.rmSync(dir,{recursive:true,force:true});
}
