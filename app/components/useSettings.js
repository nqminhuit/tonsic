'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { CHORD_TYPE_IDS, DEFAULT_ENABLED_TYPES, DEFAULT_KEYBOARD, MATCH_MODES, NOTES_MODE } from '../../lib/chords';

const SETTINGS_KEY = 'tonsic:settings';
const SETTINGS_EVENT = 'tonsic:settings-changed';
// keys written by the previous version of the app
const LEGACY_MODE_KEY = 'mode';
const LEGACY_TYPES_KEY = 'enabledChordTypes';

export const LEARN = 'learn';
export const PRACTICE = 'practice';

export const MODES = [LEARN, PRACTICE];
export const OCTAVE_LIMITS = { minStart: 1, maxStart: 4, minCount: 2, maxCount: 5 }; // C4 + 5 octaves tops out at B8 (MIDI 119); MIDI notes stop at 127

export const DEFAULT_SETTINGS = {
  enabledTypes: DEFAULT_ENABLED_TYPES,
  mode: LEARN,
  matchMode: NOTES_MODE,
  startOctave: DEFAULT_KEYBOARD.startOctave,
  octaves: DEFAULT_KEYBOARD.octaves,
  labelAllKeys: false,
  keySounds: true,
  midiSounds: false,
};

const DEFAULT_SNAPSHOT = JSON.stringify(DEFAULT_SETTINGS);
// only used when localStorage refuses writes (e.g. private browsing), so changes still apply
let unsavedSnapshot = null;

function clampInt(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function booleanOr(value, fallback) {
  return typeof value === 'boolean' ? value : fallback;
}

export function sanitizeSettings(raw) {
  const value = raw && typeof raw === 'object' ? raw : {};
  const requested = new Set(Array.isArray(value.enabledTypes) ? value.enabledTypes : []);
  const enabledTypes = CHORD_TYPE_IDS.filter((id) => requested.has(id));

  return {
    enabledTypes: enabledTypes.length ? enabledTypes : DEFAULT_SETTINGS.enabledTypes,
    mode: MODES.includes(value.mode) ? value.mode : DEFAULT_SETTINGS.mode,
    matchMode: MATCH_MODES.includes(value.matchMode) ? value.matchMode : DEFAULT_SETTINGS.matchMode,
    startOctave: clampInt(value.startOctave, OCTAVE_LIMITS.minStart, OCTAVE_LIMITS.maxStart, DEFAULT_SETTINGS.startOctave),
    octaves: clampInt(value.octaves, OCTAVE_LIMITS.minCount, OCTAVE_LIMITS.maxCount, DEFAULT_SETTINGS.octaves),
    labelAllKeys: booleanOr(value.labelAllKeys, DEFAULT_SETTINGS.labelAllKeys),
    keySounds: booleanOr(value.keySounds, DEFAULT_SETTINGS.keySounds),
    midiSounds: booleanOr(value.midiSounds, DEFAULT_SETTINGS.midiSounds),
  };
}

// settings saved by the previous version of the app
function legacySettings(modeText, typesText) {
  let enabledTypes;
  try {
    enabledTypes = JSON.parse(typesText || 'null');
  } catch {
    enabledTypes = null;
  }
  return { enabledTypes, mode: modeText === 'test' ? PRACTICE : LEARN };
}

// getSnapshot runs on every render (every MIDI note), so only re-parse when the stored text changes
let cachedRead = { key: null, snapshot: DEFAULT_SNAPSHOT };

function readSnapshot() {
  if (unsavedSnapshot) return unsavedSnapshot;
  try {
    const storage = window.localStorage;
    const stored = storage.getItem(SETTINGS_KEY);
    const legacyMode = stored ? null : storage.getItem(LEGACY_MODE_KEY);
    const legacyTypes = stored ? null : storage.getItem(LEGACY_TYPES_KEY);
    // the key must cover every input, or a test/tab that changes legacy keys reads a stale snapshot
    const key = JSON.stringify([stored, legacyMode, legacyTypes]);
    if (key !== cachedRead.key) {
      const raw = stored ? JSON.parse(stored) : legacySettings(legacyMode, legacyTypes);
      cachedRead = { key, snapshot: JSON.stringify(sanitizeSettings(raw)) };
    }
    return cachedRead.snapshot;
  } catch {
    return DEFAULT_SNAPSHOT;
  }
}

function subscribe(callback) {
  window.addEventListener('storage', callback);
  window.addEventListener(SETTINGS_EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(SETTINGS_EVENT, callback);
  };
}

export function updateSettings(patch) {
  const next = JSON.stringify(sanitizeSettings({ ...JSON.parse(readSnapshot()), ...patch }));
  try {
    window.localStorage.setItem(SETTINGS_KEY, next);
    unsavedSnapshot = null;
  } catch {
    unsavedSnapshot = next;
  }
  window.dispatchEvent(new Event(SETTINGS_EVENT));
}

export function useSettings() {
  const snapshot = useSyncExternalStore(subscribe, readSnapshot, () => DEFAULT_SNAPSHOT);
  return useMemo(() => JSON.parse(snapshot), [snapshot]);
}
