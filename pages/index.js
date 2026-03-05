import React, { useEffect, useState, useRef } from 'react';
import { useMidi } from '../components/MidiConnector';
import { randomChord, matchChord } from '../lib/chords';
import OnScreenKeyboard from '../components/OnScreenKeyboard';
import ScoreCard from '../components/ScoreCard';

export default function Home() {
  const { connect, connected, addListener } = useMidi();
  const [target, setTarget] = useState(null);
  const [result, setResult] = useState(null);
  const captureRef = useRef(new Set());
  const timerRef = useRef(null);

  useEffect(() => {
    const unsubscribe = addListener(handleNote);
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleNote({ note, velocity }) {
    captureRef.current.add(note % 12);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const played = Array.from(captureRef.current);
      captureRef.current.clear();
      evaluate(played);
    }, 700);
  }

  function newChord() {
    const c = randomChord({ includeExtended: true });
    setTarget(c);
    setResult(null);
  }

  function evaluate(played) {
    if (!target) return;
    const res = matchChord(target.pcs, played);
    setResult(res);
  }

  return (
    <div className="app">
      <h1>Tonsic — Chord Trainer</h1>
      <div className="controls">
        <button onClick={connect}>{connected ? 'Connected' : 'Connect MIDI'}</button>
        <button onClick={newChord}>New chord</button>
      </div>
      <div className="target">
        {target ? <strong>Target:</strong> : null}
        {target ? ` ${target.name}` : ' (press New chord)'}
      </div>
      <OnScreenKeyboard onPlay={(note) => handleNote({ note, velocity: 127 })} />
      {result ? <ScoreCard result={result} /> : null}
    </div>
  );
}
