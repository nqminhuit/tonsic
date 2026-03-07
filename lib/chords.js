/* lib/chords.js — pure module version (CommonJS-compatible)
 * Exports: NOTE_NAMES, CHORD_FORMULAS, buildChord, chordName, randomChord, matchChord
 * This file intentionally contains no DOM or navigator usage so it can be tested in Node
 * and imported into client components. */

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

const CHORD_FORMULAS = {
  maj: [0,4,7],
  min: [0,3,7],
  maj7: [0,4,7,11],
  '7': [0,4,7,10],
  min7: [0,3,7,10],
  '9': [0,4,7,10,14],
  '11': [0,4,7,10,14,17],
  sus2: [0,2,7],
  sus4: [0,5,7],
};

function buildChord(root, type) {
  const formula = CHORD_FORMULAS[type] || CHORD_FORMULAS.maj;
  return formula.map((off) => ((root + off) % 12));
}

function chordName(root, type) {
  return type === 'maj' ? NOTE_NAMES[root] : NOTE_NAMES[root] + type;
}

function randomChord({ includeExtended = true } = {}) {
  const types = includeExtended ? ['maj','min','7','maj7','9','11','min7','sus2','sus4'] : ['maj','min','7','min7'];
  const root = Math.floor(Math.random() * 12);
  const type = types[Math.floor(Math.random() * types.length)];
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

// Export for Node and bundlers
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { NOTE_NAMES, CHORD_FORMULAS, buildChord, chordName, randomChord, matchChord };
}

// Also expose on window for any legacy scripts (non-critical)
if (typeof window !== 'undefined') {
  window.Tonsic = { randomChord, matchChord, buildChord, CHORD_FORMULAS, NOTE_NAMES };
}
