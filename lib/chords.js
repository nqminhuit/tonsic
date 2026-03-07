/* lib/chords.js — pure module version (CommonJS-compatible)
 * Exports: NOTE_NAMES, CHORD_FORMULAS, buildChord, chordName, randomChord, matchChord
 * This file intentionally contains no DOM or navigator usage so it can be tested in Node
 * and imported into client components. */

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const CHORD_FORMULAS = {
  maj: [0, 4, 7],
  min: [0, 3, 7],
  maj7: [0, 4, 7, 11],
  '7': [0, 4, 7, 10],
  min7: [0, 3, 7, 10],
  '9': [0, 4, 7, 10, 14],
  '11': [0, 4, 7, 10, 14, 17],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
};

// List of enabled chord types (runtime-configurable). Default to basic set.
let ENABLED_CHORD_TYPES = ['maj', 'min', '7'];

function setEnabledChordTypes(types) {
  if (Array.isArray(types) && types.length) {
    ENABLED_CHORD_TYPES = types.slice();
  }
}

function getEnabledChordTypes() {
  return ENABLED_CHORD_TYPES.slice();
}

function buildChord(root, type) {
  const formula = CHORD_FORMULAS[type] || CHORD_FORMULAS.maj;
  return formula.map((off) => ((root + off) % 12));
}

function chordName(root, type) {
  return type === 'maj' ? NOTE_NAMES[root] : NOTE_NAMES[root] + type;
}

function randomChord({ includeExtended = true } = {}) {
  const defaultTypes = includeExtended
    ? ['maj', 'min', '7', 'maj7', '9', '11', 'min7', 'sus2', 'sus4']
    : ['maj', 'min', '7', 'min7'];
  const pool = (Array.isArray(ENABLED_CHORD_TYPES) && ENABLED_CHORD_TYPES.length) ? ENABLED_CHORD_TYPES : defaultTypes;
  const root = Math.floor(Math.random() * 12);
  const type = pool[Math.floor(Math.random() * pool.length)];
  const pcs = buildChord(root, type);
  return { root, type, pcs, name: chordName(root, type) };
}

function matchChord(expectedPCs, playedPCs) {
  const expected = new Set(expectedPCs.map(p => ((p % 12) + 12) % 12));
  const played = new Set(playedPCs.map(p => ((p % 12) + 12) % 12));
  const missing = [...expected].filter(p => !played.has(p));
  const extra = [...played].filter(p => !expected.has(p));
  const matchingCount = [...expected].filter(p => played.has(p)).length;
  const baseScore = Math.round((matchingCount / expected.size) * 100);
  const penalty = extra.length * 10;
  const score = Math.max(0, baseScore - penalty);
  const match = missing.length === 0 && extra.length === 0;
  return { match, missing, extra, score };
}

// Build a concrete MIDI voicing for a chord given a root (0-11), type, and octave for the root (e.g., 4 for C4)
function buildVoicing(root, type, rootOctave = 4) {
  const formula = CHORD_FORMULAS[type] || CHORD_FORMULAS.maj;
  const rootMidi = (rootOctave + 1) * 12 + (root % 12);
  return formula.map(off => rootMidi + off);
}

// Debug helper: returns pitch classes and concrete voicing and note names for inspection
function getChordInfo(root, type, rootOctave = 4) {
  const pcs = buildChord(root, type);
  const voicing = buildVoicing(root, type, rootOctave);
  const names = pcs.map(p => NOTE_NAMES[(p % 12 + 12) % 12]);
  return { root, type, pcs, names, voicing };
}

// Strict ordered exact-octave matching for MIDI note arrays
function matchExactVoicing(expectedMidis, playedMidis) {
  const expected = Array.isArray(expectedMidis) ? expectedMidis.map(n => Math.floor(n)) : [];
  const played = Array.isArray(playedMidis) ? playedMidis.map(n => Math.floor(n)) : [];
  const len = expected.length;
  let matches = 0;
  const mismatches = [];
  for (let i = 0; i < len; i++) {
    if (played[i] === expected[i]) matches++;
    else mismatches.push({ index: i, expected: expected[i], played: played[i] });
  }
  const score = len === 0 ? 0 : Math.round((matches / len) * 100);
  const match = matches === len && played.length === len;
  return { match, score, matches, expected, played, mismatches };
}

// Export for Node and bundlers
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    NOTE_NAMES,
    CHORD_FORMULAS,
    buildChord,
    chordName,
    randomChord,
    matchChord,
    buildVoicing,
    matchExactVoicing,
    setEnabledChordTypes,
    getEnabledChordTypes,
    getChordInfo
  };
}

// Also expose on window for any legacy scripts (non-critical)
if (typeof window !== 'undefined') {
  window.Tonsic = { randomChord, matchChord, buildChord, CHORD_FORMULAS, NOTE_NAMES, buildVoicing, matchExactVoicing, setEnabledChordTypes, getEnabledChordTypes, getChordInfo };
}
