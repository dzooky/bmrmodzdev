'use strict';
const assert=require('assert'),{decodeStage,decodeSelection,createGearState}=require('./gear-state');
for(const [raw,expected] of [['P','P'],['R','R'],['N','N'],['D','D'],[1,'P'],[2,'R'],[3,'N'],[4,'D']]){
 assert.strictEqual(decodeStage(raw),expected);
}
for(const raw of [null,undefined,0,5,'4','SPORT','',{},4.5,-1])if(raw!=='4')assert.strictEqual(decodeStage(raw),null);
for(const [raw,expected] of [['N','N'],['R','R'],['P','P'],['NP',null],['_1','D'],['_9','D'],[1,'N'],[2,'R'],[3,'P'],[4,null],[5,'D'],[13,'D']])assert.strictEqual(decodeSelection(raw),expected);
for(const raw of [0,14,99,'G1','_0','_10','D',null,1.5,{},undefined])assert.strictEqual(decodeSelection(raw),null);
let at=1000;const s=createGearState({now:()=>at,maxAgeMs:1000});
assert.deepStrictEqual(s.snapshot(),{valid:false,stage:null,source:'none'});
assert.strictEqual(s.update('unknown',{statusActualStageDrive:4}),false);
assert.strictEqual(s.update('statusGearboxDrive',{statusActualStageDrive:4}),true);
assert.deepStrictEqual(s.snapshot(),{valid:true,stage:'D',source:'statusGearboxDrive'});
assert.strictEqual(s.update('DataPowerTrain2',{statusGearSelectionDrive:3}),true);
assert.deepStrictEqual(s.snapshot(),{valid:false,stage:null,source:'conflict'});
assert.strictEqual(s.update('DataPowerTrain2',{statusGearSelectionDrive:5}),true);
assert.deepStrictEqual(s.snapshot(),{valid:true,stage:'D',source:'both'});
assert.strictEqual(s.update('DataPowerTrain2',{statusGearSelectionDrive:4}),false);
assert.deepStrictEqual(s.snapshot(),{valid:false,stage:null,source:'conflict'});
assert.strictEqual(s.update('DataPowerTrain2',{statusGearSelectionDrive:5},900),false);
assert.deepStrictEqual(s.snapshot(),{valid:false,stage:null,source:'conflict'});
at=2001;assert.deepStrictEqual(s.snapshot(),{valid:false,stage:null,source:'none'});
assert.strictEqual(s.update('statusGearboxDrive',{statusActualStageDrive:1}),true);
assert.strictEqual(s.snapshot().stage,'P');
assert.strictEqual(s.update('statusGearboxDrive',{statusActualStageDrive:999}),false);
assert.strictEqual(s.snapshot().valid,false);
assert.strictEqual(s.update('DataPowerTrain2',{statusGearSelectionDrive:'_1'}),true);
assert.strictEqual(s.snapshot().stage,null); // invalid primary feed still fresh, fail closed
at=3100;assert.strictEqual(s.snapshot().valid,false);
assert.throws(()=>createGearState({maxAgeMs:Infinity}));
console.log('Read-only gearbox selector parser and fail-closed freshness tests passed');
