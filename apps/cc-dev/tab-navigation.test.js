'use strict';
// Regression: G.frame alone draws labels and hit rectangles, but the shared
// display dispatcher needs recorder.tabInfo to resolve taps in non-chrome mode.
const assert=require('assert'),fs=require('fs'),path=require('path');
const main=fs.readFileSync(path.join(__dirname,'main.js'),'utf8');
assert.ok(/cv\.tabInfo\s*=\s*\{\s*tabs:\s*tabs\.slice\(\),\s*sel:\s*selectedTab,\s*badges:\s*\[\]\s*\}/.test(main),
 'CC must set recorder tabInfo before rendering G.frame');
assert.ok(main.indexOf('cv.tabInfo =') < main.indexOf('G.frame(cv, theme, tabs, selectedTab, []);'),
 'tabInfo must be set before rendering tab frames');
assert.ok(/ctx\.onTab\(index\s*=>/.test(main),'CC must dispatch tab selection');
console.log('CC DEV tab navigation integration metadata PASS');
