const test = require('node:test');
const assert = require('node:assert/strict');

const chords = require('../lib/chords');

const LETTERS = 'CDEFGAB';
const NATURAL_PCS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
// independent interval table (semitones above the root)
const DEGREE_SEMITONES = { 1: 0, 2: 2, b3: 3, 3: 4, 4: 5, b5: 6, 5: 7, '#5': 8, 6: 9, bb7: 9, b7: 10, 7: 11, 9: 14, 11: 17 };

function names(rootPc, type) {
  return chords.buildChord(rootPc, type).tones.map((tone) => tone.name).join(' ');
}

function alterOf(name) {
  return [...name.slice(1)].reduce((sum, ch) => sum + (ch === '#' ? 1 : -1), 0);
}

test('chords are spelled by interval, not by a single sharps/flats style', () => {
  const golden = [
    [4, 'maj', 'E G# B'],
    [4, '7', 'E G# B D'],
    [11, 'maj7', 'B D# F# A#'],
    [8, 'min', 'G# B D#'],
    [1, 'maj', 'Db F Ab'],
    [10, 'min', 'Bb Db F'],
    [6, 'min', 'F# A C#'],
    [8, '7', 'Ab C Eb Gb'],
    [0, 'dim7', 'C Eb Gb Bbb'],
    [0, '11', 'C G Bb D F'],
    [3, 'maj', 'Eb G Bb'],
    [10, '7', 'Bb D F Ab'],
    [2, 'min7', 'D F A C'],
    [11, 'dim', 'B D F'],
    [0, 'aug', 'C E G#'],
    [0, 'sus2', 'C D G'],
    [0, 'sus4', 'C F G'],
    [9, 'm7b5', 'A C Eb G'],
    [0, '6', 'C E G A'],
    [0, 'min6', 'C Eb G A'],
    [0, 'add9', 'C E G D'],
    [0, '9', 'C E G Bb D'],
    [0, 'maj9', 'C E G B D'],
    [0, 'min9', 'C Eb G Bb D'],
    [1, 'min', 'C# E G#'],
    [5, 'dim', 'F Ab Cb'],
    [7, 'dim7', 'G Bb Db Fb'],
    [11, 'aug', 'B D# F##'],
  ];

  for (const [rootPc, type, expected] of golden) {
    assert.equal(names(rootPc, type), expected, `${rootPc} ${type}`);
  }
});

test('black-key roots use the conventional name when spellings tie', () => {
  assert.equal(chords.buildChord(3, 'min').symbol, 'Ebm');
  assert.equal(chords.buildChord(6, 'maj').symbol, 'F#');
  assert.equal(chords.buildChord(1, '7').symbol, 'Db7');
  assert.equal(chords.buildChord(8, 'min7').symbol, 'G#m7');
  assert.equal(chords.buildChord(10, 'maj').symbol, 'Bb');
  assert.equal(chords.chooseRootName(3, 'maj'), 'Eb');
  assert.equal(chords.chooseRootName(1, 'min'), 'C#');
});

test('every chord type on every root obeys the spelling invariants', () => {
  for (const type of chords.CHORD_TYPE_IDS) {
    const { formula } = chords.getChordType(type);
    for (let rootPc = 0; rootPc < 12; rootPc++) {
      const chord = chords.buildChord(rootPc, type);
      const rootLetter = LETTERS.indexOf(chord.tones[0].name[0]);
      const label = chord.symbol;

      assert.ok(chord.symbol.startsWith(chord.tones[0].name), label);
      assert.equal(chord.tones.length, formula.length, label);

      chord.tones.forEach((tone, i) => {
        const degree = Number(formula[i].replace(/[b#]/g, ''));
        assert.equal(tone.name[0], LETTERS[(rootLetter + degree - 1) % 7], `${label} letter of ${formula[i]}`);
        assert.equal(tone.pc, (rootPc + DEGREE_SEMITONES[formula[i]]) % 12, `${label} pitch of ${formula[i]}`);
        assert.equal(((NATURAL_PCS[tone.name[0]] + alterOf(tone.name)) % 12 + 12) % 12, tone.pc, `${label} name ${tone.name}`);
        assert.ok(Math.abs(alterOf(tone.name)) <= 2, `${label} ${tone.name}`);
      });
    }
  }
});

test('double accidentals only appear where theory requires them', () => {
  const doubles = [];
  for (const type of chords.CHORD_TYPE_IDS) {
    for (let rootPc = 0; rootPc < 12; rootPc++) {
      const chord = chords.buildChord(rootPc, type);
      chord.tones.filter((tone) => Math.abs(alterOf(tone.name)) === 2).forEach((tone) => doubles.push(`${chord.symbol}:${tone.name}`));
    }
  }
  assert.deepStrictEqual(doubles.sort(), ['Baug:F##', 'Cdim7:Bbb', 'Fdim7:Ebb']);
});

test('voicings keep the octave number with the letter', () => {
  const eAug = chords.buildChord(4, 'aug');
  assert.deepStrictEqual(eAug.midis, [64, 68, 72]);
  assert.deepStrictEqual(eAug.tones.map((tone) => tone.vexKey), ['e/4', 'g#/4', 'b#/4']);

  const dFlat7 = chords.buildChord(1, '7');
  assert.deepStrictEqual(dFlat7.midis, [61, 65, 68, 71]);
  assert.deepStrictEqual(dFlat7.tones.map((tone) => tone.vexKey), ['db/4', 'f/4', 'ab/4', 'cb/5']);

  const cDim7 = chords.buildChord(0, 'dim7');
  assert.deepStrictEqual(cDim7.midis, [60, 63, 66, 69]);
  assert.deepStrictEqual(cDim7.tones.map((tone) => tone.vexKey), ['c/4', 'eb/4', 'gb/4', 'bbb/4']);

  const b11 = chords.buildChord(11, '11');
  assert.deepStrictEqual(b11.midis, [59, 66, 69, 73, 76]);
  assert.deepStrictEqual(b11.tones.map((tone) => tone.vexKey), ['b/3', 'f#/4', 'a/4', 'c#/5', 'e/5']);
});

test('every voicing is ascending and fits the default keyboard range', () => {
  const low = (chords.DEFAULT_KEYBOARD.startOctave + 1) * 12;
  const high = low + chords.DEFAULT_KEYBOARD.octaves * 12 - 1;
  for (const type of chords.CHORD_TYPE_IDS) {
    for (let rootPc = 0; rootPc < 12; rootPc++) {
      const chord = chords.buildChord(rootPc, type);
      chord.midis.forEach((midi, i) => {
        assert.ok(midi >= low && midi <= high, `${chord.symbol} ${midi}`);
        if (i > 0) assert.ok(midi > chord.midis[i - 1], `${chord.symbol} ascending`);
        assert.equal(midi % 12, chord.tones[i].pc);
      });
    }
  }
});

test('display strings use real accidental glyphs and full names', () => {
  const eFlatMinor7 = chords.buildChord(3, 'min7');
  assert.equal(eFlatMinor7.displaySymbol, 'E♭m7');
  assert.equal(eFlatMinor7.name, 'E-flat minor seventh');

  const halfDim = chords.buildChord(0, 'm7b5');
  assert.equal(halfDim.displaySymbol, 'Cm7♭5');
  assert.equal(halfDim.name, 'C half-diminished seventh');
  assert.equal(halfDim.aka, 'Cø7');

  assert.equal(chords.buildChord(6, 'maj').name, 'F-sharp major');
  assert.equal(chords.buildChord(0, 'maj').displaySymbol, 'C');
  assert.equal(chords.prettyNoteName('Bbb'), 'B♭♭');
  assert.equal(chords.prettyDegree('bb7'), '♭♭7');
  assert.equal(chords.spokenNoteName('F##'), 'F-double-sharp');
});

test('"notes" mode accepts any octave, order, inversion, and doubling', () => {
  const cMajor = chords.buildChord(0, 'maj');

  assert.equal(chords.evaluateAttempt(cMajor, [67, 60, 64]).correct, true);
  assert.equal(chords.evaluateAttempt(cMajor, [64, 67, 72]).correct, true);
  assert.equal(chords.evaluateAttempt(cMajor, [48, 60, 64, 67, 72]).correct, true);
  assert.equal(chords.evaluateAttempt(cMajor, []).correct, false);

  const partial = chords.evaluateAttempt(cMajor, [60, 64]);
  assert.equal(partial.correct, false);
  assert.deepStrictEqual(partial.missing.map((tone) => tone.name), ['G']);

  const minorInstead = chords.evaluateAttempt(cMajor, [60, 63, 67]);
  assert.equal(minorInstead.correct, false);
  assert.deepStrictEqual(minorInstead.missing.map((tone) => tone.name), ['E']);
  assert.deepStrictEqual(minorInstead.extra.map((note) => note.name), ['Eb4']);
});

test('"bass" mode requires the root as the lowest note', () => {
  const cMajor = chords.buildChord(0, 'maj');

  const inversion = chords.evaluateAttempt(cMajor, [64, 67, 72], 'bass');
  assert.equal(inversion.correct, false);
  assert.equal(inversion.bassOk, false);
  assert.equal(inversion.lowestName, 'E4');

  assert.equal(chords.evaluateAttempt(cMajor, [48, 64, 67], 'bass').correct, true);
});

test('"exact" mode compares the notes shown, ignoring the order they arrive in', () => {
  const cMajor = chords.buildChord(0, 'maj');

  assert.equal(chords.evaluateAttempt(cMajor, [67, 64, 60], 'exact').correct, true);

  const octaveUp = chords.evaluateAttempt(cMajor, [72, 64, 67], 'exact');
  assert.equal(octaveUp.correct, false);
  assert.deepStrictEqual(octaveUp.missing.map((tone) => tone.midi), [60]);
  assert.deepStrictEqual(octaveUp.extra, [{ midi: 72, name: 'C5', wrongOctave: true }]);
});

test('wrong notes are named to suit the chord', () => {
  assert.equal(chords.evaluateAttempt(chords.buildChord(3, 'maj'), [66]).extra[0].name, 'Gb4');
  assert.equal(chords.evaluateAttempt(chords.buildChord(4, 'maj'), [63]).extra[0].name, 'D#4');
  assert.equal(chords.evaluateAttempt(chords.buildChord(0, 'maj'), [63]).extra[0].name, 'Eb4');
  assert.equal(chords.midiNameInContext(71, chords.buildChord(1, '7')), 'Cb5');
});

test('unusual but correct spellings say which key they sound like', () => {
  assert.equal(chords.soundsLike('Bbb'), 'A');
  assert.equal(chords.soundsLike('Cb'), 'B');
  assert.equal(chords.soundsLike('E#'), 'F');
  assert.equal(chords.soundsLike('F##'), 'G');
  assert.equal(chords.soundsLike('Eb'), null);
  assert.equal(chords.soundsLike('C#'), null);
  assert.equal(chords.plainNoteName(61), 'C#4');
  assert.equal(chords.plainNoteName(70), 'Bb4');
});

test('isChordTone follows the match mode', () => {
  const cMajor = chords.buildChord(0, 'maj');
  assert.equal(chords.isChordTone(cMajor, 76), true);
  assert.equal(chords.isChordTone(cMajor, 76, 'exact'), false);
  assert.equal(chords.isChordTone(cMajor, 64, 'exact'), true);
  assert.equal(chords.isChordTone(cMajor, 61), false);
});

test('randomChord draws from the enabled types and never repeats the previous chord', () => {
  const previous = chords.buildChord(0, 'maj');
  for (let i = 0; i < 50; i++) {
    const next = chords.randomChord(['maj', 'min'], previous);
    assert.ok(['maj', 'min'].includes(next.type));
    assert.equal(chords.isSameChord(next, previous), false);
  }

  assert.equal(chords.randomChord(['maj'], previous, () => 0).symbol, 'Db');
  assert.equal(chords.randomChord(['nope'], null, () => 0).symbol, 'C');
  assert.equal(chords.randomChord(['min7'], null, () => 0.999999).symbol, 'Bm7');
});

test('stripOctave drops only a trailing octave number', () => {
  assert.equal(chords.stripOctave('E♭4'), 'E♭');
  assert.equal(chords.stripOctave('C#-1'), 'C#');
  assert.equal(chords.stripOctave('Bbb'), 'Bbb');
});

test('isWhiteKey follows the piano layout, below MIDI 0 too', () => {
  assert.equal(chords.isWhiteKey(60), true);
  assert.equal(chords.isWhiteKey(61), false);
  assert.equal(chords.isWhiteKey(71), true);
  assert.equal(chords.isWhiteKey(-1), true, 'MIDI -1 is a B');
  assert.equal(chords.isWhiteKey(70), false);
});
