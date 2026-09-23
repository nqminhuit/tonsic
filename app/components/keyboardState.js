import { isChordTone, midiNameInContext, mod12, plainNoteName, prettyDegree, prettyNoteName, stripOctave } from '../../lib/chords';
import { displayedNotes } from '../../lib/attempt';

export function defaultKeyName(midi) {
  return prettyNoteName(plainNoteName(midi));
}

export function defaultKeyLabel(midi) {
  const name = defaultKeyName(midi);
  return mod12(midi) === 0 ? name : stripOctave(name);
}

// the configured range, stretched to whole octaves that hold every note of the target voicing
export function keyboardRange(settings, chord) {
  let low = (settings.startOctave + 1) * 12;
  let high = low + settings.octaves * 12 - 1;
  const lowest = chord.midis[0];
  const highest = chord.midis[chord.midis.length - 1];
  if (lowest < low) low = lowest - mod12(lowest);
  if (highest > high) high = highest + 11 - mod12(highest);
  return { low, high };
}

export function buildKeyStates({ chord, attempt, showAnswer, matchMode }) {
  const keys = new Map();
  const { result, solved, selected } = attempt;

  if (showAnswer) {
    chord.tones.forEach((tone) => {
      const name = prettyNoteName(tone.name);
      keys.set(tone.midi, { state: 'target', label: name, sublabel: prettyDegree(tone.degree), name: name + tone.octave });
    });
  }

  const shown = displayedNotes(attempt);
  shown.forEach((midi) => {
    let state = 'active';
    // in practice mode keys stay neutral until the attempt is judged, so colours don't give the answer away
    if (solved) state = 'correct';
    else if (showAnswer || result) state = isChordTone(chord, midi, matchMode) ? 'correct' : 'wrong';

    const name = prettyNoteName(midiNameInContext(midi, chord));
    const target = keys.get(midi);
    keys.set(midi, {
      state,
      label: stripOctave(name),
      sublabel: target ? target.sublabel : null,
      name,
      selected: selected.includes(midi),
    });
  });

  if (showAnswer && result && !solved) {
    result.missing.forEach((tone) => {
      const target = keys.get(tone.midi);
      if (target && target.state === 'target') keys.set(tone.midi, { ...target, state: 'missing' });
    });
  }

  return keys;
}
