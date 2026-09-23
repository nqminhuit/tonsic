const test = require('node:test');
const assert = require('node:assert/strict');

const { buildChord } = require('../lib/chords');
const attempt = require('../lib/attempt');

const NOTES = 'notes';
const BASS = 'bass';
const C_MAJOR = buildChord(0, 'maj');
const G_MAJOR = buildChord(7, 'maj');

function fresh() {
  return attempt.createAttemptState(C_MAJOR);
}

function press(state, notes, mode = NOTES) {
  return notes.reduce((s, midi) => attempt.pressKey(s, midi, mode), state);
}

function release(state, notes, mode = NOTES) {
  return notes.reduce((s, midi) => attempt.releaseKey(s, midi, mode), state);
}

function toggle(state, notes, mode = NOTES) {
  return notes.reduce((s, midi) => attempt.toggleKey(s, midi, mode), state);
}

test('a held chord is accepted whatever order the keys arrive in', () => {
  const state = press(fresh(), [67, 60, 64]);
  assert.equal(state.solved, true);
  assert.equal(state.attempts, 1);
  assert.equal(state.result.correct, true);
});

test('releasing a wrong chord records one failed attempt for the fullest chord held', () => {
  let state = press(fresh(), [60, 63, 67]);
  assert.equal(state.result, null);

  state = release(state, [63, 60, 67]);
  assert.equal(state.solved, false);
  assert.equal(state.attempts, 1);
  assert.deepStrictEqual(state.result.played, [60, 63, 67]);
  assert.deepStrictEqual(attempt.displayedNotes(state), [60, 63, 67]);

  state = press(state, [60]);
  assert.equal(state.result, null, 'a new press clears the old feedback');
});

test('a single stray key is not counted as an attempt', () => {
  const state = release(press(fresh(), [61]), [61]);
  assert.equal(state.attempts, 0);
  assert.equal(state.result, null);
});

test('letting go of an extra key can complete the chord', () => {
  let state = press(fresh(), [71, 60, 64, 67]);
  assert.equal(state.solved, false);
  state = release(state, [71]);
  assert.equal(state.solved, true);
});

test('keys still held when the next chord starts are ignored until released', () => {
  let state = press(fresh(), [60, 64, 67]);
  assert.equal(state.solved, true);

  state = attempt.startChord(state, G_MAJOR);
  assert.deepStrictEqual(attempt.activeNotes(state), []);

  state = release(state, [60, 64, 67]);
  assert.equal(state.attempts, 0, 'releasing the old chord is not a failed attempt');

  state = press(state, [67, 71, 74]);
  assert.equal(state.solved, true);
});

test('on-screen keys toggle, match immediately, and only fail when checked', () => {
  let state = toggle(fresh(), [60, 63, 67]);
  assert.equal(state.attempts, 0);

  state = attempt.checkNotes(state, NOTES);
  assert.equal(state.attempts, 1);
  assert.deepStrictEqual(state.result.missing.map((tone) => tone.name), ['E']);

  state = attempt.checkNotes(state, NOTES);
  assert.equal(state.attempts, 1, 'checking the same notes twice counts once');

  state = toggle(state, [63, 64]);
  assert.equal(state.solved, true);
  assert.equal(state.attempts, 2);
});

test('input is ignored after the chord is solved', () => {
  let state = press(fresh(), [60, 64, 67]);
  state = attempt.toggleKey(state, 61, NOTES);
  assert.deepStrictEqual(state.selected, []);
  assert.equal(attempt.clearSelection(state), state);
});

test('the match mode is passed through to the evaluation', () => {
  const inversion = release(press(fresh(), [64, 67, 72], BASS), [64, 67, 72], BASS);
  assert.equal(inversion.solved, false);
  assert.equal(inversion.result.bassOk, false);
});

test('releaseAll forgets held keys (e.g. when a device disconnects)', () => {
  const state = attempt.releaseAll(press(fresh(), [60, 64]));
  assert.deepStrictEqual(state.held, []);
  assert.deepStrictEqual(attempt.activeNotes(state), []);
});

test('judges against the chord stored in the state', () => {
  let state = attempt.startChord(press(fresh(), [60, 64, 67]), G_MAJOR);
  state = release(state, [60, 64, 67]);

  const oldChord = press(state, [60, 64, 67]);
  assert.equal(oldChord.solved, false);

  state = press(state, [67, 71, 74]);
  assert.equal(state.solved, true);
});

test('re-judges the same notes after the answer rule changes', () => {
  let state = toggle(fresh(), [64, 67, 72], BASS);
  state = attempt.checkNotes(state, BASS);
  assert.equal(state.result.bassOk, false);
  assert.equal(state.attempts, 1);

  state = attempt.checkNotes(state, NOTES);
  assert.equal(state.solved, true);
  assert.equal(state.attempts, 2);
});

test('a new chord clears Show answer', () => {
  const state = { ...fresh(), revealed: true };
  assert.equal(attempt.startChord(state, G_MAJOR).revealed, false);
});
