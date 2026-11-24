'use strict';
const assert=require('assert');
const {plan}=require('./data-demand-plan');
const {build}=require('../../tools/data-tool/dpf-demand-profile');
for(const identity of ['0F1FE8','0F2678']){
 const app=plan(identity),tool=build(identity);
 assert.ok(app&&tool);
 assert.deepStrictEqual(app.fields,tool.fields);
 assert.deepStrictEqual(app.freshnessMs,tool.freshnessMs);
 assert.strictEqual(app.leaseMs,tool.leaseMs);
 assert.strictEqual(app.activation,'not-connected');
 assert.strictEqual(new Set(app.fields).size,app.fields.length);
 assert.ok(app.overview.every(key=>app.fields.includes(key)));
 assert.ok(app.detail.every(key=>app.fields.includes(key)));
 assert.ok(app.background.every(key=>app.fields.includes(key)));
}
assert.strictEqual(plan('0F1FE8').fields.length,12);
assert.strictEqual(plan('0F2678').fields.length,4);
assert.deepStrictEqual(plan('0F2678').background,[]);
assert.strictEqual(plan('NONEXISTENT'),null);
console.log('DPF DEV declarative future Tool demands: B57/B47 exact agreement, no activation PASS');
