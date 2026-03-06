import React from 'react';
import { NOTE_NAMES } from '../lib/chords';

export default function OnScreenKeyboard({ onPlay }) {
  const notes = Array.from({ length: 12 }, (_, i) => 60 + i); // C4..B4
  return (
    <div className="grid grid-cols-6 gap-2">
      {notes.map((n) => (
        <button key={n} onClick={() => onPlay(n)} className="py-3 rounded bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400">{NOTE_NAMES[n % 12]}</button>
      ))}
    </div>
  );
}
