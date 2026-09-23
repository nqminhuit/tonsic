'use client';

import { useEffect, useEffectEvent, useRef, useState } from 'react';

const NOTE_SECONDS = 1.8;
const STRUM_SECONDS = 0.045;

function midiToHz(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

function createEngine() {
  const AudioContextClass = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  if (!AudioContextClass) return null;

  const context = new AudioContextClass();
  const compressor = context.createDynamicsCompressor();
  const master = context.createGain();
  master.gain.value = 0.6;
  master.connect(compressor);
  compressor.connect(context.destination);
  return { context, master };
}

function playTone(engine, midi, start, level) {
  const { context, master } = engine;
  const frequency = midiToHz(midi);
  const envelope = context.createGain();
  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = Math.min(6000, frequency * 6);

  // a triangle fundamental plus a quiet octave partial gives a soft electric-piano tone
  const partials = [
    { type: 'triangle', ratio: 1, gain: 1 },
    { type: 'sine', ratio: 2, gain: 0.25 },
  ];
  partials.forEach((partial) => {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = partial.type;
    osc.frequency.value = frequency * partial.ratio;
    gain.gain.value = partial.gain;
    osc.connect(gain).connect(filter);
    osc.start(start);
    osc.stop(start + NOTE_SECONDS + 0.05);
  });

  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(level, start + 0.01);
  envelope.gain.exponentialRampToValueAtTime(level * 0.35, start + 0.4);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + NOTE_SECONDS);
  filter.connect(envelope).connect(master);
}

export function useSynth() {
  const engineRef = useRef(null);
  // whether the AudioContext is running
  const [unlocked, setUnlocked] = useState(false);
  const supported = typeof window !== 'undefined' && Boolean(window.AudioContext || window.webkitAudioContext);

  function getEngine() {
    if (!engineRef.current) {
      const engine = createEngine();
      if (!engine) return null;
      engine.context.onstatechange = () => setUnlocked(engine.context.state === 'running');
      setUnlocked(engine.context.state === 'running');
      engineRef.current = engine;
    }
    const engine = engineRef.current;
    // browsers only start audio after a user gesture; resuming here covers that
    if (engine.context.state === 'suspended') engine.context.resume().catch(() => {});
    return engine;
  }

  function play(midis, { strum = false } = {}) {
    const engine = getEngine();
    if (!engine || !midis.length) return;
    const now = engine.context.currentTime + 0.01;
    const level = 0.5 / Math.sqrt(midis.length);
    [...midis].sort((a, b) => a - b).forEach((midi, i) => {
      playTone(engine, midi, now + (strum ? i * STRUM_SECONDS : 0), level);
    });
  }

  const unlockOnGesture = useEffectEvent(() => {
    if (!unlocked) getEngine();
  });

  useEffect(() => {
    // MIDI input doesn't count as a user gesture, so auto-reconnected MIDI would otherwise stay silent;
    // touch grants the gesture on pointerup
    const options = { capture: true };
    window.addEventListener('pointerdown', unlockOnGesture, options);
    window.addEventListener('pointerup', unlockOnGesture, options);
    window.addEventListener('keydown', unlockOnGesture, options);
    return () => {
      window.removeEventListener('pointerdown', unlockOnGesture, options);
      window.removeEventListener('pointerup', unlockOnGesture, options);
      window.removeEventListener('keydown', unlockOnGesture, options);
    };
  }, []);

  useEffect(() => () => {
    if (engineRef.current) engineRef.current.context.close().catch(() => {});
    engineRef.current = null;
  }, []);

  return { play, unlock: getEngine, unlocked, supported };
}
