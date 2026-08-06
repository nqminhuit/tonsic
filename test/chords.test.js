const test = require('node:test');
const assert = require('node:assert/strict');

const chords = require('../lib/chords');

test('buildChord returns pitch classes for known formulas and defaults unknown types to major', () => {
  assert.deepStrictEqual(chords.buildChord(0, 'maj'), [0, 4, 7]);
  assert.deepStrictEqual(chords.buildChord(2, 'min7'), [2, 5, 9, 0]);
  assert.deepStrictEqual(chords.buildChord(11, 'unknown'), [11, 3, 6]);
});

test('chordName formats major chords without suffix and preserves other suffixes', () => {
  assert.strictEqual(chords.chordName(0, 'maj'), 'C');
  assert.strictEqual(chords.chordName(9, 'min7'), 'Amin7');
});

test('getChordDegrees exposes configured degree labels and falls back to major', () => {
  assert.deepStrictEqual(chords.getChordDegrees('min7'), ['1', 'b3', '5', 'b7']);
  assert.deepStrictEqual(chords.getChordDegrees('unknown'), ['1', '3', '5']);
});

test('notation helpers choose accidental styles and spell note names consistently', () => {
  assert.equal(chords.chooseAccidentalStyle([1, 3, 8, 10], 'auto'), 'flats');
  assert.equal(chords.chooseAccidentalStyle([1, 6], 'auto'), 'sharps');
  assert.equal(chords.chooseAccidentalStyle([0, 5, 7], 'auto'), 'sharps');
  assert.equal(chords.chooseAccidentalStyle([1, 3, 6], 'sharps'), 'sharps');
  assert.equal(chords.chooseAccidentalStyle([1, 3, 6], 'flats'), 'flats');

  assert.equal(chords.noteNameForPitchClass(1, 'auto', [1, 3, 8, 10]), 'Db');
  assert.equal(chords.noteNameForPitchClass(1, 'auto', [1, 6]), 'C#');
  assert.equal(chords.noteNameForPitchClass(-2, 'flats'), 'Bb');
  assert.equal(chords.noteNameForPitchClass(13, 'sharps'), 'C#');
});

test('buildVoicing and getChordInfo return aligned note information', () => {
  assert.deepStrictEqual(chords.buildVoicing(0, 'maj', 4), [60, 64, 67]);

  const info = chords.getChordInfo(10, '7', 3);
  assert.deepStrictEqual(info.pcs, [10, 2, 5, 8]);
  assert.deepStrictEqual(info.names, ['A#', 'D', 'F', 'G#']);
  assert.deepStrictEqual(info.voicing, [58, 62, 65, 68]);
});

test('matchChord normalizes pitch classes, ignores duplicates, and scores extra notes', () => {
  const exact = chords.matchChord([0, 4, 7], [60, 64, 67, 72]);
  assert.equal(exact.match, true);
  assert.equal(exact.score, 100);
  assert.deepStrictEqual(exact.missing, []);
  assert.deepStrictEqual(exact.extra, []);

  const penalized = chords.matchChord([0, 4, 7], [0, 4, 7, 1, 13]);
  assert.equal(penalized.match, false);
  assert.equal(penalized.score, 90);
  assert.deepStrictEqual(penalized.missing, []);
  assert.deepStrictEqual(penalized.extra, [1]);

  const missing = chords.matchChord([0, 4, 7], [-12, 16]);
  assert.equal(missing.match, false);
  assert.equal(missing.score, 67);
  assert.deepStrictEqual(missing.missing, [7]);
  assert.deepStrictEqual(missing.extra, []);
});

test('matchExactVoicing requires exact order and length', () => {
  const exact = chords.matchExactVoicing([60, 64, 67], [60, 64, 67]);
  assert.equal(exact.match, true);
  assert.equal(exact.score, 100);
  assert.equal(exact.matches, 3);
  assert.deepStrictEqual(exact.mismatches, []);

  const reordered = chords.matchExactVoicing([60, 64, 67], [60, 67, 64]);
  assert.equal(reordered.match, false);
  assert.equal(reordered.score, 33);
  assert.deepStrictEqual(reordered.mismatches, [
    { index: 1, expected: 64, played: 67 },
    { index: 2, expected: 67, played: 64 },
  ]);

  const shorter = chords.matchExactVoicing([60, 64, 67], [60, 64]);
  assert.equal(shorter.match, false);
  assert.equal(shorter.score, 67);
  assert.deepStrictEqual(shorter.mismatches, [
    { index: 2, expected: 67, played: undefined },
  ]);
});

test('enabled chord types can be configured and read back', () => {
  const original = chords.getEnabledChordTypes();

  try {
    chords.setEnabledChordTypes(['sus2']);
    assert.deepStrictEqual(chords.getEnabledChordTypes(), ['sus2']);

    const random = chords.randomChord();
    assert.equal(random.type, 'sus2');
    assert.deepStrictEqual(random.pcs, [random.root, (random.root + 2) % 12, (random.root + 7) % 12]);

    chords.setEnabledChordTypes([]);
    assert.deepStrictEqual(chords.getEnabledChordTypes(), ['sus2']);
  } finally {
    chords.setEnabledChordTypes(original);
  }
});

test('randomChord uses the configured pool and can limit extended types', () => {
  const original = chords.getEnabledChordTypes();

  try {
    chords.setEnabledChordTypes(['maj', 'min']);

    for (let i = 0; i < 20; i++) {
      const next = chords.randomChord({ includeExtended: false });
      assert.ok(['maj', 'min'].includes(next.type));
      assert.equal(next.name, chords.chordName(next.root, next.type));
    }
  } finally {
    chords.setEnabledChordTypes(original);
  }
});
