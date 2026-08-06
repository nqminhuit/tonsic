'use client';

import { useSyncExternalStore } from 'react';

const DEFAULT_PREFERENCES = {
  visualKeyboard: true,
  baseOctave: 4,
  mode: 'learning',
  numberingStyle: 'formula',
  octavesVisible: 3,
};

const DEFAULT_PREFERENCES_SNAPSHOT = JSON.stringify(DEFAULT_PREFERENCES);
const PREFERENCES_EVENT = 'tonsic:preferences-changed';

function readPreferences() {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;

  const next = { ...DEFAULT_PREFERENCES };

  try {
    const persistedStyle = window.localStorage.getItem('numberingStyle');
    if (persistedStyle) next.numberingStyle = persistedStyle;

    const persistedMode = window.localStorage.getItem('mode');
    if (persistedMode === 'test' || persistedMode === 'learning') next.mode = persistedMode;

    const persistedOctaves = Number(window.localStorage.getItem('octavesVisible'));
    if (Number.isFinite(persistedOctaves) && persistedOctaves > 0) next.octavesVisible = persistedOctaves;

    const persistedVisual = window.localStorage.getItem('visualKeyboard');
    if (persistedVisual !== null) next.visualKeyboard = persistedVisual === 'true';

    const persistedBaseOctave = Number(window.localStorage.getItem('keyboardBaseOctave'));
    if (Number.isFinite(persistedBaseOctave)) next.baseOctave = persistedBaseOctave;
  } catch (e) {
    // ignore
  }

  return next;
}

function subscribeToPreferences(callback) {
  if (typeof window === 'undefined') return () => {};

  function onChange() {
    callback();
  }

  window.addEventListener('storage', onChange);
  window.addEventListener(PREFERENCES_EVENT, onChange);

  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(PREFERENCES_EVENT, onChange);
  };
}

function getPreferencesSnapshot() {
  return JSON.stringify(readPreferences());
}

export function persistPreference(key, value) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(key, String(value));
    window.dispatchEvent(new Event(PREFERENCES_EVENT));
  } catch (e) {
    // ignore
  }
}

export function useMIDIControllerPreferences() {
  const preferences = useSyncExternalStore(
    subscribeToPreferences,
    getPreferencesSnapshot,
    () => DEFAULT_PREFERENCES_SNAPSHOT,
  );

  return JSON.parse(preferences);
}
