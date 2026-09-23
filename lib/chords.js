/* lib/chords.js — pure chord theory helpers (CommonJS so `node --test` can require it).
 * Chords are spelled from intervals, so every tone gets the letter its degree implies
 * (E major = E G# B, never E Ab B). */

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const LETTER_PCS = [0, 2, 4, 5, 7, 9, 11];
const FLAT_SIGN = '♭';
const SHARP_SIGN = '♯';

// Tie-breaks for black-key roots when both spellings need the same number of accidentals.
// Minor-family chords follow minor key signatures (C#m, G#m), the rest follow major ones (Db, Ab).
const PREFERRED_ROOTS = { 1: 'Db', 3: 'Eb', 6: 'F#', 8: 'Ab', 10: 'Bb' };
const PREFERRED_MINOR_ROOTS = { 1: 'C#', 3: 'Eb', 6: 'F#', 8: 'G#', 10: 'Bb' };
const SHARP_PC_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_PC_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const COMMON_PC_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

const MINOR_THIRD = 'b3';
const TRIADS = 'triads';
const SEVENTHS = 'sevenths';
const EXTENDED = 'extended';

const CHORD_GROUPS = [
  { id: TRIADS, label: 'Triads' },
  { id: SEVENTHS, label: 'Seventh chords' },
  { id: EXTENDED, label: 'Sixth, added & extended' },
];

const CHORD_TYPES = {
  maj: { suffix: '', name: 'major', group: TRIADS, formula: ['1', '3', '5'] },
  min: { suffix: 'm', name: 'minor', group: TRIADS, formula: ['1', MINOR_THIRD, '5'] },
  dim: { suffix: 'dim', name: 'diminished', group: TRIADS, formula: ['1', MINOR_THIRD, 'b5'], aka: '°' },
  aug: { suffix: 'aug', name: 'augmented', group: TRIADS, formula: ['1', '3', '#5'], aka: '+' },
  sus2: { suffix: 'sus2', name: 'suspended second', group: TRIADS, formula: ['1', '2', '5'] },
  sus4: { suffix: 'sus4', name: 'suspended fourth', group: TRIADS, formula: ['1', '4', '5'] },
  '7': { suffix: '7', name: 'dominant seventh', group: SEVENTHS, formula: ['1', '3', '5', 'b7'] },
  maj7: { suffix: 'maj7', name: 'major seventh', group: SEVENTHS, formula: ['1', '3', '5', '7'], aka: 'Δ7' },
  min7: { suffix: 'm7', name: 'minor seventh', group: SEVENTHS, formula: ['1', MINOR_THIRD, '5', 'b7'] },
  m7b5: { suffix: 'm7b5', name: 'half-diminished seventh', group: SEVENTHS, formula: ['1', MINOR_THIRD, 'b5', 'b7'], aka: 'ø7' },
  dim7: { suffix: 'dim7', name: 'diminished seventh', group: SEVENTHS, formula: ['1', MINOR_THIRD, 'b5', 'bb7'], aka: '°7' },
  '6': { suffix: '6', name: 'major sixth', group: EXTENDED, formula: ['1', '3', '5', '6'] },
  min6: { suffix: 'm6', name: 'minor sixth', group: EXTENDED, formula: ['1', MINOR_THIRD, '5', '6'] },
  add9: { suffix: 'add9', name: 'added ninth', group: EXTENDED, formula: ['1', '3', '5', '9'] },
  '9': { suffix: '9', name: 'dominant ninth', group: EXTENDED, formula: ['1', '3', '5', 'b7', '9'] },
  maj9: { suffix: 'maj9', name: 'major ninth', group: EXTENDED, formula: ['1', '3', '5', '7', '9'] },
  min9: { suffix: 'm9', name: 'minor ninth', group: EXTENDED, formula: ['1', MINOR_THIRD, '5', 'b7', '9'] },
  // the 3rd is left out in practice: it sits a minor 9th below the 11th and clashes with it
  '11': { suffix: '11', name: 'dominant eleventh', group: EXTENDED, formula: ['1', '5', 'b7', '9', '11'], note: 'The 3rd is usually left out because it clashes with the 11th.' },
};

const CHORD_TYPE_IDS = ['maj', 'min', 'dim', 'aug', 'sus2', 'sus4', '7', 'maj7', 'min7', 'm7b5', 'dim7', '6', 'min6', 'add9', '9', 'maj9', 'min9', '11'];
const DEFAULT_ENABLED_TYPES = ['maj', 'min', '7'];

const DEGREE_NAMES = {
  '1': 'root',
  '2': 'major 2nd',
  b3: 'minor 3rd',
  '3': 'major 3rd',
  '4': 'perfect 4th',
  b5: 'diminished 5th',
  '5': 'perfect 5th',
  '#5': 'augmented 5th',
  '6': 'major 6th',
  bb7: 'diminished 7th',
  b7: 'minor 7th',
  '7': 'major 7th',
  '9': 'major 9th',
  '11': 'perfect 11th',
};

// Every voicing is built from here and lowered an octave only if it would pass MAX_VOICING_MIDI,
// so all targets fit the default keyboard (C3–B5).
const VOICING_ROOT_OCTAVE = 4;
const DEFAULT_KEYBOARD = { startOctave: 3, octaves: 3 };
const MAX_VOICING_MIDI = (DEFAULT_KEYBOARD.startOctave + DEFAULT_KEYBOARD.octaves + 1) * 12 - 1;

const NOTES_MODE = 'notes';
const BASS_MODE = 'bass';
const EXACT_MODE = 'exact';
const MATCH_MODES = [NOTES_MODE, BASS_MODE, EXACT_MODE];

function stripOctave(name) {
  return name.replace(/-?\d+$/, '');
}

function isWhiteKey(midi) {
  return LETTER_PCS.includes(mod12(midi));
}

function mod12(n) {
  return ((n % 12) + 12) % 12;
}

function parseDegree(label) {
  const match = /^(b{0,2}|#{0,2})(\d+)$/.exec(label);
  if (!match) throw new Error(`Invalid degree: ${label}`);
  const accidentals = match[1];
  const degree = Number(match[2]);
  const alter = accidentals.startsWith('#') ? accidentals.length : -accidentals.length;
  const stepIndex = (degree - 1) % 7;
  const semitones = LETTER_PCS[stepIndex] + 12 * Math.floor((degree - 1) / 7) + alter;
  return { degree, alter, semitones, letterSteps: degree - 1 };
}

function parseNoteName(name) {
  const match = /^([A-G])(b{0,2}|#{0,2})$/.exec(name);
  if (!match) throw new Error(`Invalid note name: ${name}`);
  const accidentals = match[2];
  const alter = accidentals.startsWith('#') ? accidentals.length : -accidentals.length;
  return { letterIndex: LETTERS.indexOf(match[1]), alter };
}

function accidentalText(alter) {
  return alter > 0 ? '#'.repeat(alter) : 'b'.repeat(-alter);
}

function spellNote(letterIndex, alter) {
  return LETTERS[letterIndex] + accidentalText(alter);
}

function spellTones(rootName, formula) {
  const root = parseNoteName(rootName);
  const rootPc = mod12(LETTER_PCS[root.letterIndex] + root.alter);

  return formula.map((label) => {
    const { semitones, letterSteps } = parseDegree(label);
    const letterIndex = (root.letterIndex + letterSteps) % 7;
    const pc = mod12(rootPc + semitones);
    let alter = mod12(pc - LETTER_PCS[letterIndex]);
    if (alter > 6) alter -= 12;
    return { degree: label, semitones, letter: LETTERS[letterIndex], letterIndex, alter, pc, name: spellNote(letterIndex, alter) };
  });
}

function spellingCost(tones) {
  // one point per accidental, double accidentals count heavily so they are avoided when possible
  return tones.reduce((cost, tone) => {
    const size = Math.abs(tone.alter);
    if (size === 0) return cost;
    return cost + (size === 1 ? 1 : 3);
  }, 0);
}

function rootCandidates(pc) {
  const natural = LETTER_PCS.indexOf(pc);
  if (natural >= 0) return [LETTERS[natural]];
  return [SHARP_PC_NAMES[pc], FLAT_PC_NAMES[pc]];
}

function chooseRootName(rootPc, typeId) {
  const type = getChordType(typeId);
  const candidates = rootCandidates(mod12(rootPc));
  if (candidates.length === 1) return candidates[0];

  const preferred = type.formula.includes(MINOR_THIRD) ? PREFERRED_MINOR_ROOTS : PREFERRED_ROOTS;
  const scored = candidates.map((name) => ({ name, cost: spellingCost(spellTones(name, type.formula)) }));
  scored.sort((a, b) => a.cost - b.cost || (a.name === preferred[mod12(rootPc)] ? -1 : 1));
  return scored[0].name;
}

function getChordType(typeId) {
  const type = CHORD_TYPES[typeId];
  if (!type) throw new Error(`Unknown chord type: ${typeId}`);
  return type;
}

function prettyNoteName(name) {
  if (!name) return '';
  return name[0] + name.slice(1).replace(/#/g, SHARP_SIGN).replace(/b/g, FLAT_SIGN);
}

function prettySuffix(suffix) {
  return suffix.replace(/b(?=\d)/g, FLAT_SIGN).replace(/#(?=\d)/g, SHARP_SIGN);
}

function prettyDegree(label) {
  return label.replace(/#/g, SHARP_SIGN).replace(/b/g, FLAT_SIGN);
}

function spokenNoteName(name) {
  const { letterIndex, alter } = parseNoteName(name);
  const size = Math.abs(alter);
  if (size === 0) return LETTERS[letterIndex];
  return `${LETTERS[letterIndex]}-${size === 2 ? 'double-' : ''}${alter > 0 ? 'sharp' : 'flat'}`;
}

function midiOctave(midi, alter) {
  // the octave number belongs to the letter: B#4 sounds as C5, Cb5 sounds as B4
  return Math.floor((midi - alter) / 12) - 1;
}

function voiceTones(tones, rootPc) {
  let rootMidi = (VOICING_ROOT_OCTAVE + 1) * 12 + rootPc;
  const span = Math.max(...tones.map((tone) => tone.semitones));
  if (rootMidi + span > MAX_VOICING_MIDI) rootMidi -= 12;

  return tones.map((tone) => {
    const midi = rootMidi + tone.semitones;
    const octave = midiOctave(midi, tone.alter);
    return {
      ...tone,
      midi,
      octave,
      vexKey: `${tone.name.toLowerCase()}/${octave}`,
    };
  });
}

function buildChord(rootPc, typeId) {
  const type = getChordType(typeId);
  const pc = mod12(rootPc);
  const root = chooseRootName(pc, typeId);
  const tones = voiceTones(spellTones(root, type.formula), pc);

  return {
    type: typeId,
    rootPc: pc,
    root,
    symbol: root + type.suffix,
    displaySymbol: prettyNoteName(root) + prettySuffix(type.suffix),
    name: `${spokenNoteName(root)} ${type.name}`,
    aka: type.aka ? prettyNoteName(root) + type.aka : null,
    note: type.note || null,
    tones,
    pcs: tones.map((tone) => tone.pc),
    midis: tones.map((tone) => tone.midi),
  };
}

function isSameChord(a, b) {
  return Boolean(a && b) && a.rootPc === b.rootPc && a.type === b.type;
}

function randomChord(enabledTypes, previous = null, random = Math.random) {
  const types = (enabledTypes || []).filter((id) => CHORD_TYPES[id]);
  const pool = types.length ? types : DEFAULT_ENABLED_TYPES;
  const candidates = [];
  for (const type of pool) {
    for (let rootPc = 0; rootPc < 12; rootPc++) {
      if (!previous || previous.rootPc !== rootPc || previous.type !== type) candidates.push({ rootPc, type });
    }
  }
  const pick = candidates[Math.min(candidates.length - 1, Math.floor(random() * candidates.length))];
  return buildChord(pick.rootPc, pick.type);
}

function accidentalLeaning(chord) {
  if (!chord) return 0;
  const total = chord.tones.reduce((sum, tone) => sum + Math.sign(tone.alter), 0);
  return Math.sign(total) || Math.sign(chord.tones[0].alter);
}

function pcNameInContext(pc, chord) {
  const tone = chord && chord.tones.find((t) => t.pc === pc);
  if (tone) return tone.name;
  const leaning = accidentalLeaning(chord);
  if (leaning > 0) return SHARP_PC_NAMES[pc];
  if (leaning < 0) return FLAT_PC_NAMES[pc];
  return COMMON_PC_NAMES[pc];
}

function plainNoteName(midi) {
  return COMMON_PC_NAMES[mod12(midi)] + (Math.floor(midi / 12) - 1);
}

// E#, B#, Cb, Fb and double accidentals are correct spellings that beginners rarely recognise
function soundsLike(name) {
  const { letterIndex, alter } = parseNoteName(name);
  const pc = mod12(LETTER_PCS[letterIndex] + alter);
  if (name === SHARP_PC_NAMES[pc] || name === FLAT_PC_NAMES[pc]) return null;
  return COMMON_PC_NAMES[pc];
}

function midiNameInContext(midi, chord) {
  const pc = mod12(midi);
  const name = pcNameInContext(pc, chord);
  return name + midiOctave(midi, parseNoteName(name).alter);
}

function isChordTone(chord, midi, matchMode = NOTES_MODE) {
  if (!chord) return false;
  if (matchMode === EXACT_MODE) return chord.midis.includes(midi);
  return chord.pcs.includes(mod12(midi));
}

function evaluateAttempt(chord, playedMidis, matchMode = NOTES_MODE) {
  const exact = matchMode === EXACT_MODE;
  const played = [...new Set((playedMidis || []).map(Math.round))].sort((a, b) => a - b);
  const playedPcs = new Set(played.map(mod12));

  const tones = chord.tones.map((tone) => ({
    ...tone,
    played: exact ? played.includes(tone.midi) : playedPcs.has(tone.pc),
  }));
  const missing = tones.filter((tone) => !tone.played);
  const extra = played
    .filter((midi) => !isChordTone(chord, midi, matchMode))
    .map((midi) => ({
      midi,
      name: midiNameInContext(midi, chord),
      wrongOctave: exact && chord.pcs.includes(mod12(midi)),
    }));
  const lowest = played.length ? played[0] : null;
  const bassOk = matchMode !== BASS_MODE || (lowest !== null && mod12(lowest) === chord.rootPc);

  return {
    correct: played.length > 0 && missing.length === 0 && extra.length === 0 && bassOk,
    matchMode,
    played,
    tones,
    missing,
    extra,
    bassOk,
    lowestName: lowest === null ? null : midiNameInContext(lowest, chord),
  };
}

module.exports = {
  CHORD_GROUPS,
  CHORD_TYPES,
  CHORD_TYPE_IDS,
  DEFAULT_ENABLED_TYPES,
  DEFAULT_KEYBOARD,
  DEGREE_NAMES,
  BASS_MODE,
  EXACT_MODE,
  MATCH_MODES,
  NOTES_MODE,
  buildChord,
  chooseRootName,
  evaluateAttempt,
  getChordType,
  isChordTone,
  isSameChord,
  isWhiteKey,
  midiNameInContext,
  mod12,
  plainNoteName,
  prettyDegree,
  prettyNoteName,
  randomChord,
  soundsLike,
  spokenNoteName,
  stripOctave,
};
