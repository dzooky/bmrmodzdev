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
vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'welcome-preview.js'), 'utf8'), context);
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

const current = '0.1.90';
const fresh = settings();
const welcome = start(fresh, { version: current, existing: false });
assert.strictEqual(view(welcome).labels[0], 'Welcome to DPF Status');
assert.strictEqual(view(start(fresh, { version: current, existing: true })).labels[0], 'Welcome to DPF Status');
view(welcome).actions['notice-next']();
assert.strictEqual(start(fresh, { version: current, existing: true }).active(), false);
assert.strictEqual(start(fresh, { version: '0.1.91', existing: true }).active(), false);

const legacy = settings({ previewWelcome: 'welcome' });
const update = start(legacy, { version: current, existing: true });
assert.strictEqual(view(update).labels[0], "What's New");
assert(view(update).labels.includes('See About for full details.'));
view(update).actions['notice-next']();
assert.strictEqual(start(legacy, { version: current, existing: true }).active(), false);

const skipped = settings();
assert.strictEqual(view(start(skipped, { version: '0.1.91', existing: true })).labels[0], "What's New");
assert.strictEqual(start(settings(), { version: '0.1.89', existing: true }).active(), false);

const previewSettings = settings({ previewWelcome: 'update' });
const preview = start(previewSettings);
const popUp = view(preview);
assert.strictEqual(popUp.labels[0], "What's New");
popUp.actions['notice-next']();
assert.strictEqual(previewSettings.get('previewWelcome'), 'dashboard');
assert.strictEqual(preview.active(), false);

console.log('DPF DEV welcome, upgrades, acknowledgment, and preview dismissal passed.');
