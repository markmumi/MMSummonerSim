// Tiny zero-dependency test runner.
//   node test/run.js
// Collects test(name, fn) registrations from the *.test.js files, runs them, prints a summary,
// and exits non-zero on any failure (so it can gate a deploy).

const fs = require('fs');
const path = require('path');

let _suite = '';
const _results = [];

function describe(name, fn) { _suite = name; fn(); _suite = ''; }
function test(name, fn) {
  const full = _suite ? `${_suite} › ${name}` : name;
  try { fn(); _results.push({ name: full, ok: true }); }
  catch (e) { _results.push({ name: full, ok: false, err: e }); }
}

function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }
function eq(actual, expected, msg) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${msg ? msg + ': ' : ''}expected ${e}, got ${a}`);
}
function includes(arr, val, msg) {
  if (!arr.includes(val)) throw new Error(`${msg ? msg + ': ' : ''}expected [${arr}] to include ${val}`);
}

global.describe = describe;
global.test = test;
global.assert = assert;
global.eq = eq;
global.includes = includes;

// Load every *.test.js in this directory.
const dir = __dirname;
for (const f of fs.readdirSync(dir)) {
  if (f.endsWith('.test.js')) require(path.join(dir, f));
}

const passed = _results.filter((r) => r.ok).length;
const failed = _results.filter((r) => !r.ok);
for (const r of _results) console.log(`${r.ok ? '  ✓' : '  ✗'} ${r.name}`);
if (failed.length) {
  console.log('\nFailures:');
  for (const r of failed) console.log(`  ✗ ${r.name}\n      ${r.err.message}`);
}
console.log(`\n${passed}/${_results.length} passed${failed.length ? `, ${failed.length} FAILED` : ''}`);
process.exit(failed.length ? 1 : 0);
