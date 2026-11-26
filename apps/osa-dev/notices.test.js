'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const context = {
    module: { exports: {} },
    require(name) {
        if (name === './kit/canvas') return { withAlpha: color => color };
        if (name === './kit/i18n') return { t: text => text };
        throw new Error('Unexpected import: ' + name);
    },
};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'notices.js'), 'utf8'), context);
const { start } = context.module.exports;

function settings(saved = {}) {
    return {
        get: key => saved[key],
        set: (key, value) => { saved[key] = value; },
        onChange() {},
    };
}

function view(notices) {
    const labels = [], actions = {};
    notices.draw({
        fillRect() {}, roundRect() {}, strokeRoundRect() {}, circle() {},
        text(value) { labels.push(value); },
        textWidth(value) { return value.length; },
        target(x, y, w, h, run, key) { actions[key] = run; },
    }, {}, () => {});
    return { labels, actions };
}

const current = '0.2.70';
const fresh = settings();
const welcome = start(fresh, { version: current, existing: false });
assert.strictEqual(view(welcome).labels[0], 'Welcome to Oil Service Assistant');
assert.strictEqual(view(start(fresh, { version: current, existing: true })).labels[0], 'Welcome to Oil Service Assistant');
view(welcome).actions['notice-next']();
assert.strictEqual(start(fresh, { version: current, existing: true }).active(), false);
assert.strictEqual(start(fresh, { version: '0.2.71', existing: true }).active(), false);

const legacy = settings({ previewNoticeScenario: 'first' });
const update = start(legacy, { version: current, existing: true });
assert.strictEqual(view(update).labels[0], "What's New");
assert(view(update).labels.includes('See About for full details.'));
view(update).actions['notice-next']();
assert.strictEqual(start(legacy, { version: current, existing: true }).active(), false);

const skipped = settings();
assert.strictEqual(view(start(skipped, { version: '0.2.71', existing: true })).labels[0], "What's New");
assert.strictEqual(start(settings(), { version: '0.2.69', existing: true }).active(), false);

const preview = start(settings({ previewNoticeScenario: 'multiple' }));
const first = view(preview);
assert.strictEqual(first.labels[0], 'Important Notice');
first.actions['notice-next']();
const second = view(preview);
assert.strictEqual(second.labels[0], "What's New");
second.actions['notice-previous']();
assert.strictEqual(view(preview).labels[0], 'Important Notice');

console.log('OSA DEV welcome, legacy upgrades, acknowledgment, and preview paging passed.');
