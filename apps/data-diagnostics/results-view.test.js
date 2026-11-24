'use strict';
const assert=require('assert');
const {drawFocusedResults}=require('./results-view');
const theme={ok:'ok',crit:'crit',dim:'dim',text:'text',warn:'warn'};
function render(results){
 const calls=[];
 drawFocusedResults({},theme,{results},(_,text,x,y,size,color,opts)=>calls.push({text,x,y,size,opts}),x=>x,()=>{});
 return calls;
}
const sample={id:'processBoundary',status:'PASS',packageSurvey:{available:true,layout:true,uidMatches:true,sourceProtected:true,protectionReason:'protected',evidence:{ownerMatch:'match',peerWrite:'mode-risk',ownerAccount:'other-account'},candidate:'data-diagnostics',processStable:true},detail:'Kernel peer /proc: cgroup readable, separate yes, same UID no, process stat readable; installed package NOT verified; production OFF'};
const input=[sample,{id:'dde',status:'PASS'},{id:'egs',status:'FAIL'},{id:'nativePeer',status:'PASS',detail:'old historical entry'}];
const saved=JSON.stringify(input), rows=render(input);
assert.strictEqual(JSON.stringify(input),saved);
for(const text of ['Process boundary','PASS','FAIL','Owner consistency','match','Peer write mode','mode-risk','Package identity NOT verified','Production access OFF','Not tested'])assert.ok(rows.some(r=>r.text===text),text);
assert.ok(!rows.some(r=>r.text.includes('old historical')));
assert.ok(rows.every(r=>r.y>=115&&r.y<=495&&r.x>=24&&r.x<=1576));
for(const x of [55,760,840,1545]){
 const lines=rows.filter(r=>r.x===x).sort((a,b)=>a.y-b.y);
 for(let i=1;i<lines.length;i++)assert.ok(lines[i].y-lines[i-1].y>=Math.max(lines[i].size,lines[i-1].size));
}
assert.ok(render([]).some(r=>r.text==='unknown'));
assert.ok(render([{id:'processBoundary',status:'SKIP'}]).some(r=>r.text==='SKIP'));
console.log('Focused results: bounds, spacing, missing data, unchanged report passed');
