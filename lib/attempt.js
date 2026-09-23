/* lib/attempt.js — pure state machine for answering one chord with MIDI keys and/or on-screen keys.
 * The state carries the chord being answered, so input is always judged against the chord on screen.
 * MIDI: the chord is judged while keys are held; releasing everything judges the fullest chord held.
 * On-screen: clicks toggle keys; a match is accepted at once, a mismatch only when checked. */

const { evaluateAttempt } = require('./chords');

// a single stray key press is not treated as an answer
const MIN_NOTES_FOR_ATTEMPT = 2;

function createAttemptState(chord = null) {
  return { chord, held: [], blocked: [], selected: [], peak: [], result: null, solved: false, revealed: false, attempts: 0 };
}

function sortedUnique(notes) {
  return [...new Set(notes)].sort((a, b) => a - b);
}

function without(notes, midi) {
  return notes.filter((note) => note !== midi);
}

function sameNotes(a, b) {
  return a.length === b.length && a.every((note, i) => note === b[i]);
}

function pressedNotes(state) {
  return state.held.filter((note) => !state.blocked.includes(note));
}

function activeNotes(state) {
  return sortedUnique([...pressedNotes(state), ...state.selected]);
}

function displayedNotes(state) {
  const active = activeNotes(state);
  if (active.length) return active;
  return state.result ? state.result.played : [];
}

function judge(state, notes, matchMode, acceptMismatch) {
  if (state.solved || !state.chord || notes.length === 0) return state;
  const { result: last } = state;
  if (acceptMismatch && last && last.matchMode === matchMode && sameNotes(last.played, notes)) return state;

  const result = evaluateAttempt(state.chord, notes, matchMode);
  if (!result.correct && !acceptMismatch) return state;
  return { ...state, result, solved: result.correct, attempts: state.attempts + 1 };
}

function pressKey(state, midi, matchMode) {
  if (state.held.includes(midi)) return state;
  const startsNewPress = pressedNotes(state).length === 0;
  const next = {
    ...state,
    held: sortedUnique([...state.held, midi]),
    peak: startsNewPress ? [] : state.peak,
    result: startsNewPress && !state.solved ? null : state.result,
  };
  const pressed = pressedNotes(next);
  if (pressed.length >= next.peak.length) next.peak = pressed;
  return judge(next, activeNotes(next), matchMode, false);
}

function releaseKey(state, midi, matchMode) {
  if (!state.held.includes(midi)) return state;
  const next = { ...state, held: without(state.held, midi), blocked: without(state.blocked, midi) };
  // letting go of a wrong extra key can leave exactly the right chord held
  if (pressedNotes(next).length > 0) return judge(next, activeNotes(next), matchMode, false);

  const cleared = { ...next, peak: [] };
  if (state.peak.length < MIN_NOTES_FOR_ATTEMPT) return cleared;
  return judge(cleared, sortedUnique([...state.peak, ...state.selected]), matchMode, true);
}

function toggleKey(state, midi, matchMode) {
  if (state.solved) return state;
  const selected = state.selected.includes(midi) ? without(state.selected, midi) : sortedUnique([...state.selected, midi]);
  const next = { ...state, selected, result: null };
  return judge(next, activeNotes(next), matchMode, false);
}

function checkNotes(state, matchMode) {
  return judge(state, activeNotes(state), matchMode, true);
}

function clearSelection(state) {
  if (state.solved) return state;
  return { ...state, selected: [], result: null };
}

function startChord(state, chord) {
  // keys still held from the previous chord are ignored until they are released; Show answer resets too
  return { ...createAttemptState(chord), held: state.held, blocked: state.held };
}

function releaseAll(state) {
  return { ...state, held: [], blocked: [], peak: [] };
}

module.exports = {
  MIN_NOTES_FOR_ATTEMPT,
  activeNotes,
  checkNotes,
  clearSelection,
  createAttemptState,
  displayedNotes,
  pressKey,
  releaseAll,
  releaseKey,
  startChord,
  toggleKey,
};
