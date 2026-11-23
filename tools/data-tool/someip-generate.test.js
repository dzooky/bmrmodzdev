'use strict';
const assert=require('assert');
const fs=require('fs');
const {createGenerator,inspect,STAGING}=require('./someip-generate');
assert.ok(STAGING.endsWith('/generator-test'));
const source=fs.readFileSync(require.resolve('./someip-generate'),'utf8');
assert.ok(source.includes("aclRegistered:false"));
assert.ok(source.includes("activeConfigChanged:false"));
assert.ok(source.includes("Staging already exists; no overwrite attempted"));
const generator=createGenerator();
const before=inspect();
assert.strictEqual(before.aclRegistered,false);
assert.strictEqual(before.activeConfigChanged,false);
// CI lacks BMW firmware/catalog. A failed first attempt cannot be repeated.
(async()=>{
 if(fs.existsSync('/etc/oap/someip/someip-interfaces.json')) {
   console.log('BMW catalog exists; skipping live generator invocation in CI');
   return;
 }
 const first=await generator.run();
 assert.strictEqual(first.ok,false);
 assert.strictEqual(first.stage,'precheck');
 const second=await generator.run();
 assert.strictEqual(second.stage,'already-attempted');
 console.log('Data Tool: fixed-path one-shot generator precheck and no-ACL policy passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
