'use strict';
const assert=require('assert'),{create,delta,readCounters,neighbors,names}=require('./focused');
let saved,clock=0;const io={readFileSync(){if(!saved)throw Object.assign(Error(),{code:'ENOENT'});return saved;},writeFileSync(p,s){saved=s;},renameSync(){}};
const observe=()=>({p:{},n:{},s:{},skipped:0,procReadable:true,netReadable:true,at:clock});
const counters=()=>({vlan77:[clock,2*clock]});
const opts={observe,counters,peers:()=>({vlan77:1})},s=create('x',io,opts);
for(let step=0;step<4;step++){s.press(clock);assert.equal(s.state,'WAIT');for(let i=0;i<5;i++){clock+=1000;s.tick(clock);}assert.equal(s.state,'ACTION');for(let i=0;i<20;i++){clock+=1000;s.tick(clock);}assert.equal(s.state,step===3?'Complete':'Done');assert.equal(s.report.events[step].series.length,25);assert.deepStrictEqual(s.report.events[step].series[0].bytes[0],[1000,2000]);}
assert.equal(create('x',io,opts).state,'Complete');assert.equal(s.report.events.length,4);assert(JSON.stringify(s.report).length<30000);
assert.deepStrictEqual(delta({vlan77:[2,3]},{vlan77:[1,4]}),[null,null,null,null]);
assert.deepStrictEqual(neighbors({readFileSync:()=> 'header\n1 2 3 4 5 vlan77\n'}),{vlan77:1});
assert.deepStrictEqual(readCounters({readFileSync:()=> 'h\nh\n vlan77: 12 0 0 0 0 0 0 0 34 0 0 0 0 0 0 0\n'}),{vlan77:[12,34]});
console.log('focused PASS');
