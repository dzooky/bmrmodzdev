'use strict';
const assert=require('assert'),{load,validate,compare,envelope}=require('./report'),{events}=require('./probe');
const obs={processes:['HmiMain3D','HmiMain3D'],procReadable:true,procSkipped:0,interfaces:['lo'],interfacesReadable:true,sockets:{tcp:2,tcp6:null,udp:0,udp6:0,unix:5321}};
const r={schema:1,version:'0.1.0',events:events.map((event,i)=>({event,at:'2026-11-25T20:00:00.000Z',observation:{...obs,processes:i?['HmiMain3D']:obs.processes,sockets:{...obs.sockets,unix:5321+i}}}))};
assert.equal(load('x',{readFileSync:()=>JSON.stringify(r)}).report.events.length,10);
assert.equal(load('x',{readFileSync:()=>'{'}).state,'Invalid');
assert.equal(load('x',{readFileSync(){throw Object.assign(Error(),{code:'ENOENT'});}}).state,'Missing');
assert.deepStrictEqual(compare(validate(r),1).processRemoved,['HmiMain3D']);assert.equal(compare(r,9).sockets.unix,9);assert.equal(compare(r,1).sockets.tcp6,null);assert.deepStrictEqual(envelope(r).notes.rseReport,r);assert.equal(envelope(r).results.length,0);assert.throws(()=>validate({...r,version:'bad'}));console.log('RSE report PASS');
