'use client';

import { CARD, EYEBROW } from './ui';
import { SKIPPED, SOLVED } from './useChordTrainer';

const OUTCOME_STYLES = {
  [SOLVED]: 'border-good/40 bg-good-soft',
  [SKIPPED]: 'border-line bg-surface-2 text-ink-3',
};

function Stat({ label, value, hint }) {
  return (
    <div className="rounded-xl bg-surface-2 px-4 py-3">
      <dt className="text-xs font-medium text-ink-3">{label}</dt>
      <dd className="mt-0.5 text-2xl font-bold tabular-nums text-ink">
        {value}
        {hint ? <span className="text-xs font-medium text-ink-3"> {hint}</span> : null}
      </dd>
    </div>
  );
}

function outcomeText(item) {
  if (item.outcome === SKIPPED) return 'skipped';
  return item.tries > 1 ? `${item.tries} tries` : 'first try';
}

export default function SessionStats({ session }) {
  const accuracy = session.attempts ? `${Math.round((100 * session.correct) / session.attempts)}%` : '—';

  return (
    <section className={`${CARD} p-5`} aria-labelledby="session-heading">
      <h2 id="session-heading" className={EYEBROW}>This session</h2>
      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Correct" value={session.correct} />
        <Stat label="Accuracy" value={accuracy} />
        <Stat label="Streak" value={session.streak} hint={session.bestStreak ? `best ${session.bestStreak}` : null} />
        <Stat label="Attempts" value={session.attempts} />
      </dl>

      <h3 className={`${EYEBROW} mt-5`}>Recent chords</h3>
      {session.history.length === 0 ? (
        <p className="mt-2 text-sm text-ink-3">Chords you finish or skip will show up here.</p>
      ) : (
        <ol className="mt-2 flex flex-wrap gap-2" aria-label="Recent chords">
          {session.history.map((item) => (
            <li key={item.id} className={`rounded-full border px-3 py-1 text-sm ${OUTCOME_STYLES[item.outcome]}`}>
              <span aria-hidden="true">{item.outcome === SOLVED ? '✓ ' : '↷ '}</span>
              <span className="font-semibold">{item.symbol}</span>{' '}
              <span className="ml-0.5 text-xs text-ink-3">{outcomeText(item)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
