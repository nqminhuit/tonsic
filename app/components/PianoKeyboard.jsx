'use client';

import { useEffect, useRef } from 'react';
import { isWhiteKey } from '../../lib/chords';

// black keys sit slightly off-centre on a real keyboard (fraction of a white key width)
const BLACK_KEY_NUDGE = { 1: -0.1, 3: 0.1, 6: -0.12, 8: 0, 10: 0.12 };
const BLACK_KEY_WIDTH = 0.62;
const MIN_WHITE_KEY_PX = 30;
const MIDDLE_C = 60;

const WHITE_STYLES = {
  idle: 'bg-white text-neutral-400 hover:bg-neutral-100',
  target: 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200',
  active: 'bg-indigo-500 text-white',
  correct: 'bg-green-600 text-white',
  wrong: 'bg-red-600 text-white',
  missing: 'bg-amber-100 text-amber-900 outline-2 outline-dashed outline-amber-600 -outline-offset-4',
};

const BLACK_STYLES = {
  idle: 'bg-neutral-900 text-neutral-500 hover:bg-neutral-700',
  target: 'bg-indigo-700 text-white ring-2 ring-inset ring-indigo-300',
  active: 'bg-indigo-400 text-white',
  correct: 'bg-green-500 text-white',
  wrong: 'bg-red-500 text-white',
  missing: 'bg-amber-400 text-neutral-900 outline-2 outline-dashed outline-amber-700 -outline-offset-2',
};

function KeyLabel({ label, sublabel }) {
  return (
    <span className="pointer-events-none flex flex-col items-center leading-tight">
      {label ? <span className="text-[13px] font-semibold">{label}</span> : null}
      {sublabel ? <span className="text-[10px] font-medium opacity-80">{sublabel}</span> : null}
    </span>
  );
}

function keyText(midi, info, labelAllKeys, defaultLabel) {
  if (info && info.label) return { label: info.label, sublabel: info.sublabel };
  if (labelAllKeys || midi % 12 === 0) return { label: defaultLabel(midi), sublabel: null };
  return { label: null, sublabel: null };
}

function whiteKeysBetween(low, high) {
  const whites = [];
  for (let midi = low; midi <= high; midi++) if (isWhiteKey(midi)) whites.push(midi);
  return whites;
}

// keys: Map<midi, { state, label?, sublabel?, name }>; state is one of the *_STYLES keys
// focusLow/focusHigh: the notes to keep in view when the keyboard is wider than the screen
export default function PianoKeyboard({ low, high, keys, focusLow, focusHigh, labelAllKeys = false, defaultLabel, defaultName, onKeyClick }) {
  const scrollRef = useRef(null);
  const midis = [];
  for (let midi = low; midi <= high; midi++) midis.push(midi);
  const whites = whiteKeysBetween(low, high);
  const whiteWidth = 100 / whites.length;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    const keysInRange = whiteKeysBetween(low, high);
    const first = keysInRange.filter((midi) => midi < focusLow).length;
    const last = keysInRange.filter((midi) => midi <= focusHigh).length;
    const center = ((first + last) / 2 / keysInRange.length) * el.scrollWidth;
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ left: center - el.clientWidth / 2, behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [low, high, focusLow, focusHigh]);

  function stateOf(midi) {
    const info = keys.get(midi);
    return info ? info.state : 'idle';
  }

  function ariaLabel(midi) {
    const info = keys.get(midi);
    return (info && info.name) || defaultName(midi);
  }

  return (
    <div ref={scrollRef} className="overflow-x-auto rounded-xl border border-line bg-neutral-900 p-1.5 pt-2 shadow-inner">
      <div
        role="group"
        aria-label="Piano keyboard"
        className="relative flex h-40 select-none sm:h-52"
        style={{ minWidth: whites.length * MIN_WHITE_KEY_PX }}
      >
        {whites.map((midi) => {
          const info = keys.get(midi);
          const state = stateOf(midi);
          const { label, sublabel } = keyText(midi, info, labelAllKeys, defaultLabel);
          return (
            <button
              key={midi}
              type="button"
              data-midi={midi}
              data-state={state}
              aria-label={ariaLabel(midi)}
              aria-pressed={info ? Boolean(info.selected) : false}
              title={midi === MIDDLE_C ? 'Middle C' : undefined}
              onClick={() => onKeyClick(midi)}
              className={`relative flex h-full flex-1 cursor-pointer items-end justify-center rounded-b-md border-x border-neutral-300/70 pb-2 transition-colors duration-100 focus-visible:z-20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 ${WHITE_STYLES[state]} ${midi === MIDDLE_C && !label ? 'font-bold' : ''}`}
            >
              <KeyLabel label={label} sublabel={sublabel} />
            </button>
          );
        })}

        {midis.filter((midi) => !isWhiteKey(midi)).map((midi) => {
          const info = keys.get(midi);
          const state = stateOf(midi);
          const whitesBefore = whites.filter((white) => white < midi).length;
          const nudge = BLACK_KEY_NUDGE[midi % 12] || 0;
          const left = (whitesBefore + nudge - BLACK_KEY_WIDTH / 2) * whiteWidth;
          const { label, sublabel } = keyText(midi, info, labelAllKeys, defaultLabel);
          return (
            <button
              key={midi}
              type="button"
              data-midi={midi}
              data-state={state}
              aria-label={ariaLabel(midi)}
              aria-pressed={info ? Boolean(info.selected) : false}
              onClick={() => onKeyClick(midi)}
              className={`absolute top-0 z-10 flex h-[62%] cursor-pointer items-end justify-center rounded-b-md pb-1.5 shadow-md transition-colors duration-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 ${BLACK_STYLES[state]}`}
              style={{ left: `${left}%`, width: `${BLACK_KEY_WIDTH * whiteWidth}%` }}
            >
              <KeyLabel label={label} sublabel={sublabel} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
