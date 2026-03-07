'use client';

import { useEffect, useRef, useState } from 'react';
import Keyboard from './Keyboard';
import ScoreCard from './ScoreCard';
import Staff from './Staff';

export default function MIDIController() {
  const [chordsModule, setChordsModule] = useState(null);
  const [target, setTarget] = useState(null);
  const [status, setStatus] = useState('Not connected');
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  const captureRef = useRef(new Set());
  const timerRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    import('../../lib/chords')
      .then((mod) => {
        const m = mod.default || mod;
        if (!mounted) return;
        setChordsModule(m);
        const first = m.randomChord({ includeExtended: true });
        setTarget(first);
      })
      .catch((err) => console.error('Failed to load chords module:', err));
    return () => { mounted = false; };
  }, []);

  function newChord() {
    if (!chordsModule) return;
    setHistory((h) => [target, ...h].filter(Boolean).slice(0, 6));
    const next = chordsModule.randomChord({ includeExtended: true });
    setTarget(next);
    setResult(null);
  }

  function handlePlayedNote(noteNumber) {
    const pc = ((noteNumber % 12) + 12) % 12;
    captureRef.current.add(pc);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const played = Array.from(captureRef.current);
      captureRef.current.clear();
      evaluate(played);
    }, 700);
  }

  function evaluate(played) {
    if (!target || !chordsModule) return;
    const res = chordsModule.matchChord(target.pcs, played);
    setResult(res);
  }

  async function connectMIDI() {
    if (typeof navigator === 'undefined' || !navigator.requestMIDIAccess) {
      setStatus('Web MIDI not supported');
      return;
    }
    try {
      const access = await navigator.requestMIDIAccess();
      setStatus('Connected');
      attach(access);
      access.onstatechange = () => attach(access);
    } catch (err) {
      console.error(err);
      setStatus('Failed to connect');
    }
  }

  function attach(access) {
    for (const input of access.inputs.values()) {
      input.onmidimessage = (e) => {
        const [statusByte] = e.data;
        const cmd = statusByte & 0xf0;
        if (cmd === 0x90) {
          const note = e.data[1];
          const velocity = e.data[2];
          if (velocity > 0) handlePlayedNote(note);
        }
      };
    }
  }

  return (
    <div className="p-6 rounded-2xl bg-gradient-to-b from-white/70 to-white/50 shadow-xl">
      <div className="grid lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm text-slate-500">Current target</div>
              <div className="mt-1">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 font-semibold text-lg">{target ? target.name : '—'}</span>
                  <div className="text-sm text-slate-600">Play the chord or use the on-screen keys</div>
                </div>
                <div className="mt-3">
                  <Staff pcs={target ? target.pcs : []} />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={connectMIDI} className="px-4 py-2 bg-indigo-600 text-white rounded-md shadow hover:bg-indigo-700 flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="opacity-90"><path d="M12 2v20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M5 7v10a7 7 0 0014 0V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Connect
              </button>
              <button onClick={newChord} className="px-4 py-2 bg-rose-500 text-white rounded-md shadow hover:bg-rose-600 flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                New
              </button>
            </div>
          </div>

          <div className="mb-4">
            <Keyboard onPlay={handlePlayedNote} />
          </div>

          <div className="space-y-2">
            <div className="text-sm text-slate-500">Recent targets</div>
            <div className="flex flex-wrap gap-2">
              {history.length === 0 ? <div className="text-sm text-slate-400">No history yet</div> : history.map((h, i) => (
                <div key={i} className="px-3 py-1 bg-white border border-slate-100 rounded-full text-sm text-slate-700 shadow-sm">{h.name}</div>
              ))}
            </div>
          </div>
        </div>

        <aside className="lg:col-span-1">
          <div className="mb-4">
            <div className="text-sm text-slate-500">Result</div>
            <ScoreCard result={result} />
          </div>

          <div className="text-sm text-slate-500">Status</div>
          <div className="mt-2 text-sm text-slate-600">{status}</div>
        </aside>
      </div>
    </div>
  );
}
