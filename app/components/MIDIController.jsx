'use client';

import { useEffect, useRef, useState } from 'react';
import Keyboard from './Keyboard';
import ScoreCard from './ScoreCard';
import SettingsPopup from './SettingsPopup';
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
  const [enabledTypes, setEnabledTypes] = useState(new Set(['maj', 'min', '7']));
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
        let enabled = ['maj', 'min', '7'];
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
          if (typeof m.setEnabledChordTypes === 'function') m.setEnabledChordTypes(['maj', 'min', '7']);
          setEnabledTypes(new Set(['maj', 'min', '7']));
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
    } catch (e) { }
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
      <div className="grid lg:grid-cols-4 gap-6 items-start">
        <div className="lg:col-span-3">
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
              <button onClick={connectMIDI} className="px-4 py-2 bg-indigo-600 cursor-pointer text-white rounded-md shadow hover:bg-indigo-900 flex items-center gap-2">
                Connect
              </button>
              <button onClick={newChord} className="px-4 py-2 bg-rose-500 cursor-pointer text-white rounded-md shadow hover:bg-rose-800 flex items-center gap-2">
                New
              </button>
            </div>
          </div>

          <div className="mb-4">
            <Keyboard onPlay={handlePlayedNote} hideLabels={visualKeyboard} visual={visualKeyboard} baseOctave={baseOctave} octaves={octavesVisible} targetMidis={mode === 'learning' ? targetMidis : []} showOrderNumbers={mode === 'learning'} orderMap={targetOrderMap} highlightedMidis={mode === 'learning' ? playedMidis : []} />
            <div className="mt-2 text-sm text-slate-500">
              {isRecording ? (
                <span className="text-green-600">Recording… will evaluate after {debounceMs}ms of silence (configurable)</span>
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
              <button onClick={() => setShowSettings(s => !s)} className="px-4 py-2 text-white rounded-md cursor-pointer bg-indigo-600 hover:bg-indigo-900 text-indigo-600">Settings</button>
            </div>
            {showSettings && (
              <SettingsPopup
                availableTypes={availableTypes}
                enabledTypes={enabledTypes}
                toggleType={toggleType}
                visualKeyboard={visualKeyboard}
                setVisualKeyboard={setVisualKeyboard}
                baseOctave={baseOctave}
                setBaseOctave={setBaseOctave}
                octavesVisible={octavesVisible}
                setOctavesVisible={setOctavesVisible}
                mode={mode}
                setMode={setMode}
                numberingStyle={numberingStyle}
                setNumberingStyle={setNumberingStyle}
                onClose={() => setShowSettings(false)}
              />
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
