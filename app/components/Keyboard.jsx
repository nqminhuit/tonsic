'use client';

import { useState } from 'react';
const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

export default function Keyboard({ onPlay, hideLabels = false, baseOctave = 4, visual = false }) {
  const [pressed, setPressed] = useState(new Set());
  const baseMidi = (Number(baseOctave) + 1) * 12;

  function clickMidi(midi) {
    onPlay(midi);
    setPressed(prev => {
      const next = new Set(prev);
      next.add(midi);
      return next;
    });
    setTimeout(() => {
      setPressed(prev => {
        const next = new Set(prev);
        next.delete(midi);
        return next;
      });
    }, 200);
  }

  if (!visual) {
    // simple button grid (fallback)
    const notes = Array.from({ length: 12 }, (_, i) => baseMidi + i);
    return (
      <div className="flex flex-wrap gap-2">
        {notes.map(n => {
          const isActive = pressed.has(n);
          return (
            <button key={n} onClick={() => clickMidi(n)} className={`px-4 py-2 rounded-md shadow-sm border transform transition ${isActive ? 'bg-indigo-600 text-white scale-95' : 'bg-white text-slate-800 hover:bg-indigo-50'}`}>
              {!hideLabels ? NOTE_NAMES[n % 12] : ''}
            </button>
          );
        })}
      </div>
    );
  }

  // Visual piano one-octave keyboard (C..B)
  const whiteKeys = [0,2,4,5,7,9,11];
  const blackKeys = {1:0, 3:1, 6:3, 8:4, 10:5}; // semitone -> position index of preceding white key

  return (
    <div className="relative select-none" style={{ height: 160 }}>
      <div className="flex bg-black/0" style={{ height: '100%' }}>
        {whiteKeys.map((s, i) => {
          const midi = baseMidi + s;
          const isActive = pressed.has(midi);
          return (
            <div key={midi} className="relative" style={{ width: 48 }}>
              <button onClick={() => clickMidi(midi)} aria-label={NOTE_NAMES[s]} className={`w-full h-full border border-slate-200 ${isActive ? 'bg-indigo-600 text-white' : 'bg-white'} rounded-b-md`}>
                {!hideLabels && <div className="text-xs text-center mt-28">{NOTE_NAMES[s]}</div>}
              </button>
            </div>
          );
        })}
      </div>
      {/* black keys overlay */}
      <div className="absolute top-0 left-0 pointer-events-none" style={{ height: '100%', width: whiteKeys.length * 48 }}>
        {Object.keys(blackKeys).map(k => {
          const semitone = Number(k);
          const posIdx = blackKeys[semitone];
          const midi = baseMidi + semitone;
          const left = posIdx * 48 + 34; // position offset to sit between white keys
          const isActive = pressed.has(midi);
          return (
            <button key={k} onClick={(e) => { e.stopPropagation(); clickMidi(midi); }} aria-label={NOTE_NAMES[semitone]} className={`absolute pointer-events-auto`} style={{ left, top: 0, width: 28, height: 100, borderRadius: 6, background: isActive ? '#3730a3' : '#111827', border: '1px solid rgba(0,0,0,0.4)' }}>
              {!hideLabels && <div className="text-xs text-white/90 mt-20">{NOTE_NAMES[semitone]}</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
