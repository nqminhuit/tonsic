const assert = require('assert');
const chords = require('./lib/chords');

console.log('Running chords tests...');
assert.deepStrictEqual(chords.buildChord(0, 'maj'), [0, 4, 7], 'maj triad for C');
assert.deepStrictEqual(chords.buildVoicing(0, 'maj', 4), [60, 64, 67], 'C major voicing should start at C4');
assert.deepStrictEqual(chords.getChordDegrees('min7'), ['1', 'b3', '5', 'b7'], 'min7 degree labels should be exposed');

const pitchClassMatch = chords.matchChord([0, 4, 7], [60, 64, 67]);
assert.strictEqual(pitchClassMatch.match, true, 'C major should match C4 E4 G4');

const pitchClassMiss = chords.matchChord([0, 4, 7], [61, 64, 67]);
assert.strictEqual(pitchClassMiss.match, false, 'C major should not match with C# present');

const exactVoicingMatch = chords.matchExactVoicing([60, 64, 67], [60, 64, 67]);
assert.strictEqual(exactVoicingMatch.match, true, 'Exact voicing should match same notes in order');
assert.strictEqual(exactVoicingMatch.score, 100, 'Exact voicing match should score 100');

const exactVoicingMiss = chords.matchExactVoicing([60, 64, 67], [60, 67, 64]);
assert.strictEqual(exactVoicingMiss.match, false, 'Different note order should fail exact voicing');
assert.strictEqual(exactVoicingMiss.mismatches.length, 2, 'Wrong note order should report mismatches');

chords.setEnabledChordTypes(['sus2']);
const random = chords.randomChord();
assert.strictEqual(random.type, 'sus2', 'Random chord should use the enabled chord type pool');

console.log('All tests passed.');
