'use client';

import { useEffect, useRef, useState } from 'react';
import Keyboard from './Keyboard';
import ScoreCard from './ScoreCard';
import Staff from './Staff';

export default function MIDIController() {
  const debounceMs = 3000;
  const [chordsModule, setChordsModule] = useState(null);
  const [target, setTarget] = useState(null);
  const [status, setStatus] = useState('Not connected');
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  // debounce for evaluating played notes (ms). This will be exposed in settings later.
  const [isRecording, setIsRecording] = useState(false);
  const [availableTypes, setAvailableTypes] = useState([]);
  const [enabledTypes, setEnabledTypes] = useState(new Set(['maj','min','7']));
  const [showSettings, setShowSettings] = useState(false);

  // Visual piano keyboard mode
  const [visualKeyboard, setVisualKeyboard] = useState(true);
  const [baseOctave, setBaseOctave] = useState(4);
  // mode: 'test' | 'learning'
  const [mode, setMode] = useState('learning');
  // numbering style: 'formula' (1,3,5) or 'pitch' (ascending order numbers)
  const [numberingStyle, setNumberingStyle] = useState('formula');
  // computed target mapping for keyboard highlights
  const [targetMidis, setTargetMidis] = useState([]);
  const [targetOrderMap, setTargetOrderMap] = useState([]);
  const [octavesVisible, setOctavesVisible] = useState(3);

  const captureRef = useRef([]);
  const timerRef = useRef(null);
  const highlightTimerRef = useRef(null);
  const highlightShowMs = 1200; // ms to show result highlights before clearing
  const [playedMidis, setPlayedMidis] = useState([]);

  useEffect(() => {
    let mounted = true;
    import('../../lib/chords')
      .then((mod) => {
        const m = mod.default || mod;
        if (!mounted) return;
        setChordsModule(m);
        const first = m.randomChord({ includeExtended: true });
        // compute a default voicing in octave 4
        first.voicing = m.buildVoicing(first.root, first.type, 4);
        setTarget(first);
        // initialize available chord types and enabled set from localStorage
        const types = Object.keys(m.CHORD_FORMULAS || {});
        setAvailableTypes(types);
        let enabled = ['maj','min','7'];
        try {
          const persisted = typeof window !== 'undefined' ? window.localStorage.getItem('enabledChordTypes') : null;
          if (persisted) enabled = JSON.parse(persisted) || enabled;
        } catch (e) {
          // ignore
        }
        if (Array.isArray(enabled) && enabled.length) {
          if (typeof m.setEnabledChordTypes === 'function') m.setEnabledChordTypes(enabled);
          setEnabledTypes(new Set(enabled));
        } else {
          if (typeof m.setEnabledChordTypes === 'function') m.setEnabledChordTypes(['maj','min','7']);
          setEnabledTypes(new Set(['maj','min','7']));
        }
      })
      .catch((err) => console.error('Failed to load chords module:', err));
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    // load persisted preferences for numbering style and octaves visible
    try {
      if (typeof window !== 'undefined') {
        const persistedStyle = window.localStorage.getItem('numberingStyle');
        if (persistedStyle) setNumberingStyle(persistedStyle);
        const persistedOctaves = window.localStorage.getItem('octavesVisible');
        if (persistedOctaves) setOctavesVisible(Number(persistedOctaves));
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const persistedVisual = window.localStorage.getItem('visualKeyboard');
        const persistedOct = window.localStorage.getItem('keyboardBaseOctave');
        if (persistedVisual !== null) setVisualKeyboard(persistedVisual === 'true');
        if (persistedOct !== null) setBaseOctave(Number(persistedOct));
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // compute target MIDI mapping and order labels for learning mode
  useEffect(() => {
    if (!chordsModule || !target) {
      setTargetMidis([]);
      setTargetOrderMap([]);
      return;
    }
    // If a concrete voicing exists, use it; otherwise build a voicing at baseOctave
    let midis = [];
    if (target.voicing && target.voicing.length) midis = target.voicing.slice();
    else if (target.pcs && target.pcs.length && typeof chordsModule.buildVoicing === 'function') midis = chordsModule.buildVoicing(target.root, target.type, baseOctave);
    else midis = [];
    setTargetMidis(midis);

    // compute order map depending on numberingStyle
    let map = [];
    if (numberingStyle === 'formula') {
      if (typeof chordsModule.getChordDegrees === 'function') {
        map = chordsModule.getChordDegrees(target.type).slice();
      } else {
        map = midis.map((_, i) => String(i + 1));
      }
    } else {
      // ascending pitch: assign numbers by ascending midi pitch
      const pairs = midis.map((m, i) => ({ m, i })).sort((a, b) => a.m - b.m);
      map = new Array(midis.length);
      pairs.forEach((p, idx) => { map[p.i] = String(idx + 1); });
    }
    setTargetOrderMap(map);
  }, [chordsModule, target, numberingStyle, baseOctave]);

  function newChord() {
    if (!chordsModule) return;
    setHistory((h) => [target, ...h].filter(Boolean).slice(0, 6));
    const next = chordsModule.randomChord({ includeExtended: true });
    // compute default voicing (root octave 4)
    next.voicing = chordsModule.buildVoicing(next.root, next.type, 4);
    setTarget(next);
    setResult(null);
    setIsRecording(false);
    setPlayedMidis([]);
  }

  function toggleType(t) {
    const newSet = new Set(enabledTypes);
    if (newSet.has(t)) newSet.delete(t);
    else newSet.add(t);
    setEnabledTypes(newSet);
    const arr = [...newSet];
    if (chordsModule && typeof chordsModule.setEnabledChordTypes === 'function') chordsModule.setEnabledChordTypes(arr);
    if (typeof window !== 'undefined') window.localStorage.setItem('enabledChordTypes', JSON.stringify(arr));
  }

  function handlePlayedNote(noteNumber) {
    // If this is the first note of a new capture window, clear previous result/highlights
    const startingNewCapture = captureRef.current.length === 0;
    if (startingNewCapture) {
      // If the previous result was visible, clear it and highlights when the user starts a new attempt by pressing a key
      if (result) {
        setResult(null);
        setPlayedMidis([]);
      }
      setIsRecording(true);
      // clear any pending highlight clear timer
      if (highlightTimerRef.current) { clearTimeout(highlightTimerRef.current); highlightTimerRef.current = null; }
    }

    // store raw MIDI number in order
    captureRef.current.push(noteNumber);
    // record played notes for keyboard highlighting (keep order, avoid duplicates)
    setPlayedMidis(prev => (prev.includes(noteNumber) ? prev : [...prev, noteNumber]));

    // If we know the expected length, and the user has played enough notes, evaluate immediately
    const expectedLen = target ? ((target.voicing && target.voicing.length) ? target.voicing.length : (target.pcs && target.pcs.length) ? target.pcs.length : null) : null;
    if (expectedLen && captureRef.current.length === expectedLen) {
      if (timerRef.current) clearTimeout(timerRef.current);
      const played = Array.from(captureRef.current);
      captureRef.current.length = 0;
      setIsRecording(false);
      evaluate(played);
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const played = Array.from(captureRef.current);
      captureRef.current.length = 0;
      setIsRecording(false);
      evaluate(played);
    }, debounceMs);
  }

  function evaluate(played) {
    if (!target || !chordsModule) return;
    // If the target has a concrete voicing, prefer exact-voicing match
    if (target.voicing && target.voicing.length) {
      const res = chordsModule.matchExactVoicing(target.voicing, played);
      setResult(res);
    } else {
      // fallback to pitch-class matching
      const pcs = target.pcs || [];
      const res = chordsModule.matchChord(pcs, played.map(n => n % 12));
      setResult(res);
    }

    // After showing result, clear visual key highlights after a short delay so user sees feedback
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => {
      setPlayedMidis([]);
      highlightTimerRef.current = null;
    }, highlightShowMs);
  }

  useEffect(() => {
    if (result && result.match && mode === 'learning') {
      const t = setTimeout(() => { newChord(); }, 900);
      return () => clearTimeout(t);
    }
  }, [result, mode]);

  // cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    };
  }, []);

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
                  <Staff notes={target ? (target.voicing || target.pcs) : []} result={result} />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={connectMIDI} className="px-4 py-2 bg-indigo-600 text-white rounded-md shadow hover:bg-indigo-700 flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="opacity-90"><path d="M12 2v20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M5 7v10a7 7 0 0014 0V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Connect
              </button>
              <button onClick={newChord} className="px-4 py-2 bg-rose-500 text-white rounded-md shadow hover:bg-rose-600 flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                New
              </button>
            </div>
          </div>

          <div className="mb-4">
            <Keyboard onPlay={handlePlayedNote} hideLabels={visualKeyboard} visual={visualKeyboard} baseOctave={baseOctave} octaves={octavesVisible} targetMidis={mode === 'learning' ? targetMidis : []} showOrderNumbers={mode === 'learning'} orderMap={targetOrderMap} highlightedMidis={mode === 'learning' ? playedMidis : []} />
            <div className="mt-2 text-sm text-slate-500">
              {isRecording ? (
                <span className="text-rose-600">Recording… will evaluate after {debounceMs}ms of silence (configurable)</span>
              ) : (
                <span>Ready — evaluation delay: {debounceMs}ms</span>
              )}
            </div>
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

          <div className="mt-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-500">Chord types</div>
              <button onClick={() => setShowSettings(s => !s)} className="text-sm text-indigo-600">Settings</button>
            </div>
            {showSettings && (
              <div className="mt-2 space-y-2">
                {availableTypes.map((t) => (
                  <label key={t} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={enabledTypes.has(t)} onChange={() => toggleType(t)} />
                    <span className="capitalize">{t}</span>
                  </label>
                ))}
                <div className="pt-2 border-t border-slate-100">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={visualKeyboard} onChange={() => { const n = !visualKeyboard; setVisualKeyboard(n); try { if (typeof window !== 'undefined') window.localStorage.setItem('visualKeyboard', String(n)); } catch (e) {} }} />
                    <span>Visual piano keyboard</span>
                  </label>
                  <div className="mt-2 text-sm text-slate-600 flex items-center gap-2">
                    <button onClick={() => { const n = Math.max(0, baseOctave - 1); setBaseOctave(n); try { if (typeof window !== 'undefined') window.localStorage.setItem('keyboardBaseOctave', String(n)); } catch (e) {} }} className="px-2 py-1 bg-gray-100 rounded">-</button>
                    <div>Base octave: <span className="font-medium">{baseOctave}</span></div>
                    <button onClick={() => { const n = Math.min(8, baseOctave + 1); setBaseOctave(n); try { if (typeof window !== 'undefined') window.localStorage.setItem('keyboardBaseOctave', String(n)); } catch (e) {} }} className="px-2 py-1 bg-gray-100 rounded">+</button>
                    <div className="text-xs text-slate-400">(Use the octave buttons to shift base octave)</div>
                  </div>

                  <div className="mt-2 text-sm text-slate-600 flex items-center gap-2">
                    <button onClick={() => { const n = Math.max(1, octavesVisible - 1); setOctavesVisible(n); try { if (typeof window !== 'undefined') window.localStorage.setItem('octavesVisible', String(n)); } catch (e) {} }} className="px-2 py-1 bg-gray-100 rounded">-</button>
                    <div>Visible octaves: <span className="font-medium">{octavesVisible}</span></div>
                    <button onClick={() => { const n = Math.min(6, octavesVisible + 1); setOctavesVisible(n); try { if (typeof window !== 'undefined') window.localStorage.setItem('octavesVisible', String(n)); } catch (e) {} }} className="px-2 py-1 bg-gray-100 rounded">+</button>
                    <div className="text-xs text-slate-400">(Adjust how many octaves are shown on the keyboard)</div>
                  </div>

                  <div className="mt-3 text-sm">
                    <div className="text-sm text-slate-500">Mode</div>
                    <div className="flex items-center gap-2 mt-1">
                      <label className="flex items-center gap-2 text-sm"><input type="radio" name="mode" value="test" checked={mode === 'test'} onChange={() => { setMode('test'); try { if (typeof window !== 'undefined') window.localStorage.setItem('mode', 'test'); } catch (e) {} }} /> <span>Test</span></label>
                      <label className="flex items-center gap-2 text-sm"><input type="radio" name="mode" value="learning" checked={mode === 'learning'} onChange={() => { setMode('learning'); try { if (typeof window !== 'undefined') window.localStorage.setItem('mode', 'learning'); } catch (e) {} }} /> <span>Learning</span></label>
                    </div>
                    <div className="mt-2 text-sm text-slate-500">Numbering style</div>
                    <div className="flex items-center gap-2 mt-1">
                      <label className="flex items-center gap-2 text-sm"><input type="radio" name="numbering" value="formula" checked={numberingStyle === 'formula'} onChange={() => { setNumberingStyle('formula'); try { if (typeof window !== 'undefined') window.localStorage.setItem('numberingStyle', 'formula'); } catch (e) {} }} /> <span>Formula-order (1,3,5)</span></label>
                      <label className="flex items-center gap-2 text-sm"><input type="radio" name="numbering" value="pitch" checked={numberingStyle === 'pitch'} onChange={() => { setNumberingStyle('pitch'); try { if (typeof window !== 'undefined') window.localStorage.setItem('numberingStyle', 'pitch'); } catch (e) {} }} /> <span>Ascending pitch (1..N)</span></label>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
