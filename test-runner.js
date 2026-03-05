const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const chordsPath = path.join(__dirname, 'lib', 'chords.js');
let code = fs.readFileSync(chordsPath, 'utf8');
// Remove ESM export keywords so we can evaluate in CommonJS sandbox
code = code.replace(/\bexport\s+/g, '');
// Export symbols for tests
code += '\nmodule.exports = { NOTE_NAMES, CHORD_FORMULAS, buildChord, chordName, randomChord, matchChord };';

const sandbox = { module: { exports: {} }, exports: {}, require, console, setTimeout, setInterval };
vm.createContext(sandbox);
vm.runInContext(code, sandbox);

const chords = sandbox.module.exports;

console.log('Running chords tests...');
assert.deepStrictEqual(chords.buildChord(0, 'maj'), [0,4,7], 'maj triad for C');
const r1 = chords.matchChord([0,4,7], [60,64,67]);
assert.strictEqual(r1.match, true, 'C major should match C4 E4 G4');
const r2 = chords.matchChord([0,4,7], [61,64,67]);
assert.strictEqual(r2.match, false, 'C major should not match with C# present');
console.log('All tests passed.');
