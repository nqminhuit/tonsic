'use client';

import { BASS_MODE, EXACT_MODE, NOTES_MODE, midiNameInContext, prettyNoteName, stripOctave } from '../../lib/chords';

const TONE_STYLES = {
  neutral: 'border-line bg-surface-2 text-ink',
  good: 'border-good/40 bg-good-soft text-ink',
  bad: 'border-bad/40 bg-bad-soft text-ink',
};

const TONE_ICONS = { neutral: '♪', good: '✓', bad: '✗' };

const MATCH_HINTS = {
  [NOTES_MODE]: 'Any octave or inversion counts.',
  [BASS_MODE]: 'Keep the root as the lowest note.',
  [EXACT_MODE]: 'Play exactly the notes on the staff.',
};

function listNames(names) {
  return names.map(prettyNoteName).join(' ');
}

function plural(count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

function describeAttempt({ chord, attempt, activeNotes, showAnswer, matchMode }) {
  const result = attempt.result;

  if (attempt.solved) {
    return {
      tone: 'good',
      title: `Correct — that's ${chord.displaySymbol}!`,
      detail: `${listNames(chord.tones.map((tone) => tone.name))}. Next chord coming up…`,
    };
  }

  if (result) {
    const parts = [];
    if (result.extra.length) {
      const wrong = result.extra.map((note) => (note.wrongOctave ? `${prettyNoteName(note.name)} (wrong octave)` : prettyNoteName(stripOctave(note.name))));
      parts.push(`Not in ${chord.displaySymbol}: ${wrong.join(', ')}.`);
    }
    if (result.missing.length) {
      parts.push(showAnswer ? `Missing: ${listNames(result.missing.map((tone) => tone.name))}.` : `${plural(result.missing.length, 'note')} missing.`);
    }
    if (!result.bassOk) {
      parts.push(`The lowest note should be the root, ${prettyNoteName(chord.root)} — yours was ${prettyNoteName(result.lowestName)}.`);
    }
    return { tone: 'bad', title: 'Not quite — try again', detail: parts.join(' ') };
  }

  if (activeNotes.length) {
    return {
      tone: 'neutral',
      title: `Playing ${listNames(activeNotes.map((midi) => stripOctave(midiNameInContext(midi, chord))))}`,
      detail: attempt.selected.length ? 'Press Check when your chord is complete.' : 'Keep holding — all the notes must sound together.',
    };
  }

  return {
    tone: 'neutral',
    title: 'Your turn',
    detail: `${MATCH_HINTS[matchMode]} Hold the notes together on a MIDI keyboard, or click them on the keys below.`,
  };
}

export default function AttemptFeedback(props) {
  const message = describeAttempt(props);
  return (
    <div role="status" aria-live="polite" className={`flex min-h-16 items-start gap-3 rounded-xl border px-4 py-3 ${TONE_STYLES[message.tone]}`}>
      <span aria-hidden="true" className="mt-0.5 w-5 text-center text-lg leading-6">{TONE_ICONS[message.tone]}</span>
      <div className="min-w-0">
        <p className="font-semibold leading-6">{message.title}</p>
        {message.detail ? <p className="text-sm text-ink-2">{message.detail}</p> : null}
      </div>
    </div>
  );
}
