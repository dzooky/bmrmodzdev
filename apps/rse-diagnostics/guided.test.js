'use strict';
const assert=require('assert'),{create,steps}=require('./guided'),{diff}=require('./activity');
let saved;const io={readFileSync(){if(!saved)throw Object.assign(Error(),{code:'ENOENT'});return saved;},writeFileSync(p,s){saved=s;},renameSync(){}};
let i=0;const observe=()=>({p:{'1:2':['hmi',i++]},n:{vlan65:[i*100,i*200]},s:{tcp:new Set(['a']),tcp6:null,udp:null,udp6:null,unix:null},skipped:0,procReadable:true,netReadable:true,at:i*1000});
const s=create('x',io,observe);s.press(0);s.tick(4999);assert.equal(s.state,'Baseline');s.tick(5000);assert.equal(s.state,'Action');s.press(9999);assert.equal(s.report.events.length,0);s.press(10000);assert.equal(s.report.events.length,1);assert.equal(s.report.events[0].action.net.vlan65[0],100);assert.equal(create('x',io,observe).report.events.length,1);assert.equal(steps.length,10);console.log('guided PASS');
