'use client';

import { useEffect, useEffectEvent, useState } from 'react';
import Keyboard from './Keyboard';
import ScoreCard from './ScoreCard';
import SettingsPopup from './SettingsPopup';
import Staff from './Staff';
import {
  createRandomTarget,
  deriveTargetDisplayState,
  getStoredEnabledTypes,
  persistEnabledTypes,
} from './midiControllerHelpers';
import {
  persistPreference,
  useMIDIControllerPreferences,
} from './midiControllerPreferences';
import { useExactVoicingCapture } from './useExactVoicingCapture';
import { useWebMIDI } from './useWebMIDI';

export default function MIDIController() {
  const debounceMs = 3000;
  const preferences = useMIDIControllerPreferences();
  const [chordsModule, setChordsModule] = useState(null);
  const [target, setTarget] = useState(null);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [availableTypes, setAvailableTypes] = useState([]);
  const [enabledTypes, setEnabledTypes] = useState(new Set(['maj', 'min', '7']));
  const [showSettings, setShowSettings] = useState(false);

  // Visual piano keyboard mode
  const { visualKeyboard, baseOctave, mode, numberingStyle, octavesVisible } = preferences;

  const highlightShowMs = 1200; // ms to show result highlights before clearing

  useEffect(() => {
    let mounted = true;
    import('../../lib/chords')
      .then((mod) => {
        const m = mod.default || mod;
        if (!mounted) return;
        setChordsModule(m);
        setTarget(createRandomTarget(m));
        // initialize available chord types and enabled set from localStorage
        const types = Object.keys(m.CHORD_FORMULAS || {});
        setAvailableTypes(types);
        const enabled = getStoredEnabledTypes();
        if (typeof m.setEnabledChordTypes === 'function') m.setEnabledChordTypes(enabled);
        setEnabledTypes(new Set(enabled));
      })
      .catch((err) => console.error('Failed to load chords module:', err));
    return () => { mounted = false; };
  }, []);

  const { targetMidis, targetOrderMap } = deriveTargetDisplayState(
    chordsModule,
    target,
    baseOctave,
    numberingStyle,
  );
  const expectedLen = target ? ((target.voicing && target.voicing.length) ? target.voicing.length : (target.pcs && target.pcs.length) ? target.pcs.length : null) : null;

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

    showCaptureFeedback();
  }

  const {
    handlePlayedNote,
    isRecording,
    playedMidis,
    resetCaptureState,
    resetPlayedMidis,
    showCaptureFeedback,
  } = useExactVoicingCapture({
    debounceMs,
    expectedLength: expectedLen,
    highlightShowMs,
    onCaptureComplete: evaluate,
    onNewAttempt: () => {
      if (result) {
        setResult(null);
        resetPlayedMidis();
      }
    },
  });
  const { connectMIDI, status } = useWebMIDI(handlePlayedNote);

  function newChord() {
    if (!chordsModule) return;
    setHistory((h) => [target, ...h].filter(Boolean).slice(0, 6));
    setTarget(createRandomTarget(chordsModule));
    setResult(null);
    resetCaptureState();
  }

  function toggleType(t) {
    const newSet = new Set(enabledTypes);
    if (newSet.has(t)) newSet.delete(t);
    else newSet.add(t);
    setEnabledTypes(newSet);
    const arr = [...newSet];
    if (chordsModule && typeof chordsModule.setEnabledChordTypes === 'function') chordsModule.setEnabledChordTypes(arr);
    persistEnabledTypes(arr);
  }

  const advanceChord = useEffectEvent(() => {
    newChord();
  });

  useEffect(() => {
    if (result && result.match && mode === 'learning') {
      const t = setTimeout(() => { advanceChord(); }, 900);
      return () => clearTimeout(t);
    }
  }, [result, mode]);

  return (
    <div className="grid lg:grid-cols-4 gap-6 items-start">
      <div className="lg:col-span-3">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm text-slate-500">Current target</div>
            <div className="mt-1">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 font-semibold text-lg">{target ? target.name : '—'}</span>
                <div className="text-sm text-slate-600">Match the exact voicing shown on the staff, including octave and note order</div>
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
              <span className="text-green-600">Recording exact voicing... evaluation runs after {debounceMs}ms of silence</span>
            ) : (
              <span>Ready to check exact voicing and note order. Evaluation delay: {debounceMs}ms</span>
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
        <div className={"mt-2 text-sm " + (status === 'Connected' ? 'text-green-600' : 'text-red-600')}>{status}</div>

        <div className="mt-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-500">Chord types</div>
            <button onClick={() => setShowSettings(s => !s)} className="px-4 py-2 text-white rounded-md cursor-pointer bg-indigo-600 hover:bg-indigo-900">Settings</button>
          </div>
          {showSettings && (
            <SettingsPopup
              availableTypes={availableTypes}
              enabledTypes={enabledTypes}
              toggleType={toggleType}
              visualKeyboard={visualKeyboard}
              setVisualKeyboard={(nextValue) => persistPreference('visualKeyboard', nextValue)}
              baseOctave={baseOctave}
              setBaseOctave={(nextValue) => persistPreference('keyboardBaseOctave', nextValue)}
              octavesVisible={octavesVisible}
              setOctavesVisible={(nextValue) => persistPreference('octavesVisible', nextValue)}
              mode={mode}
              setMode={(nextValue) => persistPreference('mode', nextValue)}
              numberingStyle={numberingStyle}
              setNumberingStyle={(nextValue) => persistPreference('numberingStyle', nextValue)}
              onClose={() => setShowSettings(false)}
            />
          )}
        </div>
      </aside>
    </div>
  );
}
