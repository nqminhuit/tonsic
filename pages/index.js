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
    <div className="max-w-3xl mx-auto">
      <header className="flex items-center justify-between py-6">
        <h1 className="text-2xl font-semibold">Tonsic</h1>
        <div className="flex gap-3">
          <button onClick={connect} className="px-3 py-2 bg-blue-600 text-white rounded">{connected ? 'Connected' : 'Connect MIDI'}</button>
          <button onClick={newChord} className="px-3 py-2 border rounded">New chord</button>
        </div>
      </header>

      <main className="bg-white p-6 rounded shadow">
        <div className="mb-4">
          <div className="text-sm text-gray-500">Target chord</div>
          <div className="text-xl font-medium">{target ? target.name : '(press New chord)'}</div>
        </div>

        <OnScreenKeyboard onPlay={(note) => handleNote({ note, velocity: 127 })} />

        <div className="mt-4">{result ? <ScoreCard result={result} /> : null}</div>
      </main>
    </div>
  );
}
