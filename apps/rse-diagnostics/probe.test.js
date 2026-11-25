'use strict';
const assert=require('assert'),{snapshot,events}=require('./probe');
const io={readdirSync(p){if(p==='/proc')return ['1','2','3','net'];if(p==='/sys/class/net')return ['eth0','lo'];throw Error();},readFileSync(p){if(p==='/proc/1/comm')return 'weather\n';if(p==='/proc/2/comm')return 'unrelated\n';if(p==='/proc/net/tcp')return 'header\nrow\n';throw Error();}};
const s=snapshot(io);assert.deepStrictEqual(s.processes,['weather']);assert.equal(s.procSkipped,1);assert.equal(s.sockets.tcp,1);assert.equal(s.sockets.udp,null);assert.equal(events.length,10);assert.equal(snapshot({readdirSync(){throw Error();},readFileSync(){throw Error();}}).procReadable,false);console.log('RSE probe PASS');
