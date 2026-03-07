'use client';

import { useState, useEffect } from 'react';
const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

export default function Keyboard({ onPlay, hideLabels = false, baseOctave = 4, visual = false, octaves = 1, targetMidis = [], showOrderNumbers = false, orderMap = [], highlightedMidis = [] }) {
  const [pressed, setPressed] = useState(new Set());
  const baseMidi = (Number(baseOctave) + 1) * 12;
  // Sync internal pressed set with externally-provided highlightedMidis when it changes
  useEffect(() => {
    if (!Array.isArray(highlightedMidis)) return;
    setPressed(new Set(highlightedMidis));
  }, [highlightedMidis]);

  function clickMidi(midi) {
    onPlay(midi);
    setPressed(prev => {
      const next = new Set(prev);
      next.add(midi);
      return next;
    });
    // keep pressed highlights until higher-level clears them via highlightedMidis/props
  }

  if (!visual) {
    // simple button grid (fallback)
    const notes = Array.from({ length: 12 }, (_, i) => baseMidi + i);
    return (
      <div className="flex flex-wrap gap-2">
        {notes.map(n => {
          const isActive = isMidiHighlighted(n);
          return (
            <button key={n} onClick={() => clickMidi(n)} className={`px-4 py-2 rounded-md shadow-sm border transform transition ${isActive ? 'bg-indigo-600 text-white scale-95' : 'bg-white text-slate-800 hover:bg-indigo-50'}`}>
              {!hideLabels ? NOTE_NAMES[n % 12] : ''}
            </button>
          );
        })}
      </div>
    );
  }

  // Visual piano multi-octave keyboard
  const whiteKeys = [0,2,4,5,7,9,11];
  const blackKeys = {1:0, 3:1, 6:3, 8:4, 10:5}; // semitone -> position index of preceding white key

  // layout calculations
  const keyWidth = 48;
  const whiteCountPerOct = whiteKeys.length;
  const totalWhite = whiteCountPerOct * octaves;
  const totalWidth = totalWhite * keyWidth;

  const octaveRange = Array.from({ length: octaves }, (_, oi) => oi + 0);

  return (
      <div className="relative select-none" style={{ height: 160, overflowX: 'auto', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
        <div className="flex bg-black/0" style={{ height: '100%', width: totalWidth }}>
        {octaveRange.flatMap((octOffset) => whiteKeys.map((s, _) => {
          const midi = baseMidi + octOffset * 12 + s;
          const isPressed = pressed.has(midi);
          const isTarget = Array.isArray(targetMidis) && targetMidis.includes(midi);
          const isCorrect = isPressed && isTarget;
          const isWrong = isPressed && !isTarget;
          const badgeIndex = isTarget ? targetMidis.indexOf(midi) : -1;
          const badgeText = badgeIndex >= 0 ? (orderMap && orderMap[badgeIndex] ? orderMap[badgeIndex] : String(badgeIndex + 1)) : null;

          let btnClass = 'w-full h-full border border-slate-200 rounded-b-md';
          if (isCorrect) btnClass += ' bg-green-600 text-white';
          else if (isWrong) btnClass += ' bg-red-500 text-white';
          else if (isTarget) btnClass += ' ring-2 ring-green-400 bg-green-50';
          else if (isPressed) btnClass += ' bg-indigo-600 text-white';
          else btnClass += ' bg-white';

          return (
            <div key={midi} className="relative" style={{ width: keyWidth, zIndex: 1 }}>
              <button onClick={() => clickMidi(midi)} aria-label={NOTE_NAMES[s] + (baseOctave + octOffset)} className={btnClass}>
                {!hideLabels && <div className="text-xs text-center mt-28">{NOTE_NAMES[s]}{baseOctave + octOffset}</div>}
              </button>
              {isTarget && showOrderNumbers && (
                <div className="absolute left-0 right-0 top-1 flex justify-center">
                  <div className="text-xs font-semibold text-white bg-green-600 rounded-full w-6 h-6 flex items-center justify-center shadow">{badgeText}</div>
                </div>
              )}
            </div>
          );
        }))}
      </div>
      {/* black keys overlay - placed above white keys */}
      <div className="absolute top-0 left-0" style={{ height: '100%', width: totalWidth }}>
        {octaveRange.flatMap((octOffset) => Object.keys(blackKeys).map(k => {
          const semitone = Number(k);
          const posIdx = blackKeys[semitone];
          const midi = baseMidi + octOffset * 12 + semitone;
          const left = (octOffset * whiteCountPerOct + posIdx) * keyWidth + 34; // position offset to sit between white keys
          const isPressed = pressed.has(midi);
          const isTarget = Array.isArray(targetMidis) && targetMidis.includes(midi);
          const isCorrect = isPressed && isTarget;
          const isWrong = isPressed && !isTarget;
          const badgeIndex = isTarget ? targetMidis.indexOf(midi) : -1;
          const badgeText = badgeIndex >= 0 ? (orderMap && orderMap[badgeIndex] ? orderMap[badgeIndex] : String(badgeIndex + 1)) : null;

          let blackBg = '#111827';
          let blackColor = '#fff';
          let blackBoxShadow = 'none';
          if (isCorrect) { blackBg = '#065f46'; blackColor = '#fff'; blackBoxShadow = '0 0 12px rgba(6,95,70,0.6)'; }
          else if (isWrong) { blackBg = '#ef4444'; blackColor = '#fff'; blackBoxShadow = '0 0 12px rgba(239,68,68,0.5)'; }
          else if (isTarget) { blackBg = '#064e3b'; blackColor = '#fff'; blackBoxShadow = '0 0 6px rgba(16,185,129,0.25)'; }
          else if (isPressed) { blackBg = '#3730a3'; blackColor = '#fff'; blackBoxShadow = '0 0 6px rgba(55,48,163,0.4)'; }

          return (
            <button key={`${octOffset}-${k}`} onClick={(e) => { e.stopPropagation(); clickMidi(midi); }} aria-label={NOTE_NAMES[semitone] + (baseOctave + octOffset)} className={`absolute`} style={{ left, top: 0, width: 28, height: 100, borderRadius: 6, background: blackBg, color: blackColor, border: '1px solid rgba(0,0,0,0.4)', zIndex: 5, pointerEvents: 'auto', boxShadow: blackBoxShadow }}>
              {!hideLabels && <div className="text-xs text-white/90 mt-20" style={{color: blackColor}}>{NOTE_NAMES[semitone]}{baseOctave + octOffset}</div>}
              {isTarget && showOrderNumbers && (
                <div className="absolute left-0 right-0 top-2 flex justify-center">
                  <div className="text-xs font-semibold" style={{background:'#86efac', width:20, height:20, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', color:'#000', boxShadow:'0 1px 3px rgba(0,0,0,0.2)'}}>{badgeText}</div>
                </div>
              )}
            </button>
          );
        }))}
      </div>
    </div>
  );
}
