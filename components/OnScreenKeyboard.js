import React from 'react';
import { NOTE_NAMES } from '../lib/chords';

export default function OnScreenKeyboard({ onPlay }) {
  const notes = Array.from({ length: 12 }, (_, i) => 60 + i); // C4..B4
  return (
    <div className="keyboard">
      {notes.map((n) => (
        <button key={n} className="key" onClick={() => onPlay(n)}>
          {NOTE_NAMES[n % 12]}
        </button>
      ))}
    </div>
  );
}
