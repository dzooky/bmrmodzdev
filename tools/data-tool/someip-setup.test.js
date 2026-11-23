'use strict';
const assert=require('assert');
const {inspect}=require('./someip-setup');
function fake(files){
 return {statSync(name){if(!files.has(name))throw Object.assign(new Error('ENOENT'),{code:'ENOENT'});return {isFile:()=>true};}};
}
const paths={configPath:'/test/cds.json',catalogPath:'/test/catalog.json',firmwarePath:'/test/AppManagement.js',manifestPath:'/test/manifest.json',uid:1000,gid:1000};
const available=new Set(['/test/catalog.json','/test/AppManagement.js','/test/manifest.json']);
const first=inspect({...paths,fs:fake(available)});
assert.strictEqual(first.ok,true);
assert.strictEqual(first.mode,'passive-only');
assert.strictEqual(first.checks.generatedCdsPresent,false);
assert.strictEqual(first.checks.firmwareAppManagementPresent,true);
assert.strictEqual(first.registration,'not verified');
assert.strictEqual(first.identity.uid,1000);
assert.match(first.next,/has not been generated/);
available.add('/test/cds.json');
const second=inspect({...paths,fs:fake(available)});
assert.strictEqual(second.checks.generatedCdsPresent,true);
assert.strictEqual(second.registration,'not verified');
available.delete('/test/catalog.json');
const third=inspect({...paths,fs:fake(available)});
assert.strictEqual(third.checks.catalogPresent,false);
assert.match(third.next,/catalog missing/);
console.log('Data Tool: passive SOME/IP setup survey passed (no generator, ACL or ECU actions)');
