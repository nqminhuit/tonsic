'use client';

import { EXACT_MODE } from '../../lib/chords';
import { LEARN, PRACTICE } from './useSettings';

const OPTIONS = [
  { id: LEARN, label: 'Learn', detail: 'Shows the notes, the staff and the keys to press.' },
  { id: PRACTICE, label: 'Practice', detail: 'Only the chord name — find the notes yourself.' },
];

const ARROW_STEPS = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

const EXACT_PRACTICE_DETAIL = 'The chord name and the staff — play exactly what is written.';

export default function ModeSwitch({ mode, matchMode, onChange }) {
  const current = OPTIONS.find((option) => option.id === mode) || OPTIONS[0];
  const detail = current.id === PRACTICE && matchMode === EXACT_MODE ? EXACT_PRACTICE_DETAIL : current.detail;

  function handleKeyDown(event) {
    const step = ARROW_STEPS[event.key];
    if (!step) return;
    event.preventDefault();
    const index = (OPTIONS.indexOf(current) + step + OPTIONS.length) % OPTIONS.length;
    onChange(OPTIONS[index].id);
    event.currentTarget.querySelectorAll('[role="radio"]')[index].focus();
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div role="radiogroup" aria-label="Mode" onKeyDown={handleKeyDown} className="inline-flex rounded-xl border border-line bg-surface p-1 shadow-sm">
        {OPTIONS.map((option) => {
          const selected = option.id === current.id;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(option.id)}
              className={`cursor-pointer rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-accent ${selected ? 'bg-accent text-white dark:text-neutral-950' : 'text-ink-2 hover:text-ink'}`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      <p className="text-sm text-ink-3">{detail}</p>
    </div>
  );
}
