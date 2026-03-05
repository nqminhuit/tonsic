export const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

export const CHORD_FORMULAS = {
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

export function buildChord(root, type) {
  const formula = CHORD_FORMULAS[type] || CHORD_FORMULAS.maj;
  return formula.map((off) => ((root + off) % 12));
}

export function chordName(root, type) {
  if (type === 'maj') return NOTE_NAMES[root];
  return NOTE_NAMES[root] + type;
}

export function randomChord({ includeExtended = true } = {}) {
  const types = includeExtended ? ['maj','min','7','maj7','9','11','min7','sus2','sus4'] : ['maj','min','7','min7'];
  const root = Math.floor(Math.random() * 12);
  const type = types[Math.floor(Math.random() * types.length)];
  const pcs = buildChord(root, type);
  return { root, type, pcs, name: chordName(root, type) };
}

export function matchChord(expectedPCs, playedPCs) {
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
