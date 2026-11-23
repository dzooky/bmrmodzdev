'use strict';
const assert=require('assert');
const manifest=require('./data-manifest.json');
assert.strictEqual(manifest.schema,1);
assert.strictEqual(manifest.mode,'experimental-test-only');
assert.deepStrictEqual(Object.keys(manifest.consumers).sort(),['diagnostics','diagnostics-secondary']);
for(const consumer of Object.values(manifest.consumers)){
  assert.ok(consumer.leaseMs>=1000&&consumer.leaseMs<=3000);
  assert.ok(Array.isArray(consumer.fields)&&consumer.fields.length>0);
  assert.ok(consumer.fields.every(x=>Object.prototype.hasOwnProperty.call(manifest.signals,x)));
}
assert.deepStrictEqual(manifest.consumers['diagnostics-secondary'].fields,['rpm','coolant']);
assert.ok(!Object.keys(manifest.consumers).some(x=>['dpf','osa','cc'].includes(x)));
console.log('Data manifest: test-only consumer profiles and signal allowlist passed');
