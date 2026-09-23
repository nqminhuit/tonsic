'use client';

import { DEGREE_NAMES, prettyDegree, prettyNoteName, soundsLike } from '../../lib/chords';
import { EyeIcon, NextIcon, SpeakerIcon } from './Icons';
import Staff, { STAFF_SIZE } from './Staff';
import { BUTTON_PRIMARY, BUTTON_QUIET, BUTTON_SECONDARY, CARD, EYEBROW } from './ui';

const TONE_STYLES = {
  none: 'border-line bg-surface-2',
  good: 'border-good/50 bg-good-soft',
  bad: 'border-bad/50 bg-bad-soft',
};

function toneStatus(result, tone) {
  if (!result) return 'none';
  const judged = result.tones.find((t) => t.degree === tone.degree);
  return judged && judged.played ? 'good' : 'bad';
}

function ToneChips({ chord, result }) {
  return (
    <ul className="mt-5 flex flex-wrap gap-2" aria-label="Notes in this chord">
      {chord.tones.map((tone) => {
        const status = toneStatus(result, tone);
        const alias = soundsLike(tone.name);
        return (
          <li
            key={tone.degree}
            data-status={status}
            className={`flex min-w-[5.25rem] flex-col items-center rounded-xl border px-3 py-2 text-center ${TONE_STYLES[status]}`}
          >
            <span className="text-2xl font-semibold leading-none text-ink">{prettyNoteName(tone.name)}</span>
            <span className="mt-1.5 text-xs font-bold text-ink-2">{prettyDegree(tone.degree)}</span>
            <span className="text-[11px] leading-tight text-ink-3">{DEGREE_NAMES[tone.degree]}</span>
            {alias ? <span className="mt-0.5 text-[11px] leading-tight text-ink-3">same key as {prettyNoteName(alias)}</span> : null}
          </li>
        );
      })}
    </ul>
  );
}

export default function ChordPrompt({ chord, showAnswer, showStaff, canReveal, result, solved, onListen, onReveal, onNext }) {
  const staffNotes = chord.tones.map((tone) => {
    const status = toneStatus(result, tone);
    return { vexKey: tone.vexKey, status: status === 'none' ? '' : status };
  });
  const staffLabel = `${chord.name}: ${chord.tones.map((tone) => prettyNoteName(tone.name) + tone.octave).join(', ')}`;

  return (
    <section className={`${CARD} p-5 sm:p-7`} aria-labelledby="target-chord">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <p className={EYEBROW}>Play this chord</p>
          <h2 id="target-chord" className="mt-2 text-6xl font-bold tracking-tight text-ink sm:text-7xl">
            {chord.displaySymbol}
          </h2>
          <p className="mt-2 text-lg text-ink-2">
            {chord.name}
            {chord.aka ? <span className="text-ink-3"> · also written {chord.aka}</span> : null}
          </p>

          {showAnswer ? (
            <>
              <ToneChips chord={chord} result={result} />
              {chord.note ? <p className="mt-3 text-sm text-ink-3">{chord.note}</p> : null}
            </>
          ) : (
            <p className="mt-5 max-w-md rounded-xl border border-dashed border-line px-4 py-3 text-sm text-ink-2">
              {showStaff ? (
                <>Read the staff and play exactly those keys — or use <strong>Show answer</strong> if you are stuck.</>
              ) : (
                <>Which {chord.tones.length} notes make {chord.displaySymbol}? Play them — or use <strong>Show answer</strong> if you are stuck.</>
              )}
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            <button type="button" className={BUTTON_SECONDARY} onClick={onListen}>
              <SpeakerIcon />
              Listen
            </button>
            {canReveal ? (
              <button type="button" className={BUTTON_SECONDARY} onClick={onReveal}>
                <EyeIcon />
                Show answer
              </button>
            ) : null}
            <button type="button" className={solved ? BUTTON_PRIMARY : BUTTON_QUIET} onClick={onNext}>
              {solved ? 'Next chord' : 'Skip'}
              <NextIcon />
            </button>
          </div>
        </div>

        <figure className="shrink-0 self-center rounded-xl bg-white p-3 ring-1 ring-line md:self-start">
          {showStaff ? (
            <Staff notes={staffNotes} label={staffLabel} />
          ) : (
            <div className="grid place-items-center text-sm text-neutral-500" style={STAFF_SIZE}>Notation hidden</div>
          )}
          <figcaption className="text-center text-xs text-neutral-500">Treble clef · C4 is middle C</figcaption>
        </figure>
      </div>
    </section>
  );
}
