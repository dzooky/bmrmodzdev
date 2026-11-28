'use strict';
const assert=require('assert');
assert.strictEqual(typeof Object.fromEntries==='function'||Object.fromEntries===undefined,true);
const {create,MINUTES}=require('./activation-plan');
const job=(key,position,mode='Heating',sensor=position,threshold=15)=>({key,position,mode,level:key==='steeringHeating'?1:2,sensor,threshold});
const left=job('frontLeftHeating','frontLeft');
const right=job('frontRightVentilation','frontRight','Ventilation','outside',26);
const wheel=job('steeringHeating','frontLeft','Heating','frontLeft',15);
const input=(at,belts={},more={})=>Object.assign({at,engineRunning:true,gear:'P',rpm:800,belts,temperatures:{frontLeft:10,frontRight:10,outside:30}},more);
const run=(name,fn)=>{fn();console.log('PASS',name);};
run('all allowed wait intervals and rejects arbitrary',()=>{
 assert.deepStrictEqual(Array.from(MINUTES),[1,2,3,4,5]);
 const setting=require('./app.json').settings.find(s=>s.key==='seatBeltCheckMinutes');
 assert.deepStrictEqual(setting.steps,Array.from(MINUTES));
 assert.equal(setting.default,3);
 for(const m of MINUTES)assert(create({waitMinutes:m}));
 assert.throws(()=>create({waitMinutes:10}));
});
run('no activation before explicit engine-start cycle or before running engine',()=>{
 const p=create();assert.deepStrictEqual(p.tick(input(1,{frontLeft:'latched'})),[]);
 p.start([left],0);assert.deepStrictEqual(p.tick(input(1,{frontLeft:'latched'},{engineRunning:false})),[]);
 assert.equal(p.tick(input(2,{frontLeft:'latched'})).length,1);
});
run('buckled passengers act immediately regardless of D or RPM',()=>{
 const p=create();p.start([left,wheel,right],0);
 const x=p.tick(input(100,{frontLeft:'latched',frontRight:'latched'}));
 assert.deepStrictEqual(x.map(y=>y.key).sort(),[left.key,right.key,wheel.key].sort());
 assert.equal(p.status().timerAt,null);
 assert.deepStrictEqual(p.tick(input(200,{frontLeft:'latched'})),[]);
});
run('temperature failure terminates just that function',()=>{
 const p=create();p.start([left,right],0);
 const x=p.tick(input(100,{frontLeft:'latched',frontRight:'latched'},{temperatures:{frontLeft:22,outside:30}}));
 assert.deepStrictEqual(x.map(y=>y.key),[right.key]);assert.equal(p.status().eligible[left.key],false);
 assert.deepStrictEqual(p.tick(input(200,{frontLeft:'latched'},{temperatures:{frontLeft:0,outside:30}})),[]);
});
run('missing or stale-equivalent invalid values never authorize activation',()=>{
 const p=create();p.start([left],0);
 assert.deepStrictEqual(p.tick(input(100,{frontLeft:'latched'},{temperatures:{frontLeft:null}})),[]);
 assert.equal(p.status().eligible[left.key],null);
 assert.equal(p.tick(input(200,{frontLeft:'latched'})).length,1);
});
run('D alone or >1000 RPM alone never starts the timer',()=>{
 const p=create();p.start([left],0);
 p.tick(input(100,{frontLeft:'unlatched'},{gear:'D',rpm:1000}));assert.equal(p.status().deadline,null);
 p.tick(input(200,{frontLeft:'unlatched'},{gear:'P',rpm:2000}));assert.equal(p.status().deadline,null);
 p.tick(input(300,{frontLeft:'unlatched'},{gear:'D',rpm:1001}));assert.equal(p.status().deadline,180300);
});
run('timer starts once and survives P, low RPM and unbuckling',()=>{
 const p=create({waitMinutes:2});p.start([left,right],0);
 p.tick(input(100,{frontLeft:'unlatched',frontRight:'unlatched'},{gear:'D',rpm:1100}));
 p.tick(input(70000,{frontLeft:'unlatched',frontRight:'unlatched'},{gear:'P',rpm:0}));
 assert.equal(p.status().deadline,120100);
 assert.equal(p.tick(input(100000,{frontLeft:'latched',frontRight:'unlatched'},{gear:'P',rpm:0})).length,1);
 assert.deepStrictEqual(p.tick(input(120100,{frontRight:'latched'})),[]);
});
run('belt already latched never needs timer',()=>{
 const p=create();p.start([left],0);
 assert.equal(p.tick(input(10,{frontLeft:'latched'},{gear:null,rpm:null})).length,1);
});
run('unknown belt cannot start timer or activate',()=>{
 const p=create();p.start([left],0);
 assert.deepStrictEqual(p.tick(input(100,{frontLeft:'unknown'},{gear:'D',rpm:2000})),[]);
 assert.equal(p.status().deadline,null);
});
run('one intent per function per cycle, no retry after failure',()=>{
 const p=create();p.start([left],0);
 assert.equal(p.tick(input(100,{frontLeft:'latched'})).length,1);
 assert(p.acknowledge(left.key,false));assert.deepStrictEqual(p.tick(input(200,{frontLeft:'latched'})),[]);
 p.stop();p.start([left],1000);
 assert.equal(p.tick(input(1001,{frontLeft:'latched'})).length,1);
 assert(p.acknowledge(left.key,true));assert.deepStrictEqual(p.status().completed,[left.key]);
});
run('cycle requires explicit end: stop/start cannot be inferred from start-stop RPM',()=>{
 const p=create();p.start([left],0);
 p.tick(input(10,{frontLeft:'latched'}));
 assert.deepStrictEqual(p.tick(input(20,{frontLeft:'latched'},{engineRunning:false})),[]);
 assert.equal(p.start([left],30),false);
 assert.deepStrictEqual(p.tick(input(40,{frontLeft:'latched'})),[]);
});
