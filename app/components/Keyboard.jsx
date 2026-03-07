'use client';

import { useState } from 'react';
const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

export default function Keyboard({ onPlay }) {
  const [pressed, setPressed] = useState(new Set());
  const notes = Array.from({ length: 12 }, (_, i) => 60 + i);

  function handleClick(n) {
    onPlay(n);
    setPressed(prev => {
      const next = new Set(prev);
      next.add(n);
      return next;
    });
    setTimeout(() => {
      setPressed(prev => {
        const next = new Set(prev);
        next.delete(n);
        return next;
      });
    }, 300);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {notes.map(n => {
        const isActive = pressed.has(n);
        return (
          <button key={n} onClick={() => handleClick(n)} className={`px-4 py-2 rounded-md shadow-sm border transform transition ${isActive ? 'bg-indigo-600 text-white scale-95' : 'bg-white text-slate-800 hover:bg-indigo-50'}`}>
            {NOTE_NAMES[n % 12]}
          </button>
        );
      })}
    </div>
  );
}
