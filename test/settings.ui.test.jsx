import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { DEFAULT_SETTINGS, sanitizeSettings, updateSettings, useSettings } from '../app/components/useSettings';

const HIGHEST_MIDI = 127;
const SETTINGS_KEY = 'tonsic:settings';
const LEARN = 'learn';
const PRACTICE = 'practice';

function notifyStorage() {
  act(() => {
    window.dispatchEvent(new Event('storage'));
  });
}

describe('sanitizeSettings', () => {
  it('returns the defaults for missing settings', () => {
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS);
  });

  it('drops unknown chord types and keeps the rest in canonical order', () => {
    expect(sanitizeSettings({ enabledTypes: ['7', 'nope', 'maj', 'maj'] }).enabledTypes).toEqual(['maj', '7']);
  });

  it('falls back to the default chord types when none are valid', () => {
    expect(sanitizeSettings({ enabledTypes: [] }).enabledTypes).toEqual(['maj', 'min', '7']);
    expect(sanitizeSettings({ enabledTypes: ['nope'] }).enabledTypes).toEqual(['maj', 'min', '7']);
    expect(sanitizeSettings({ enabledTypes: 'maj' }).enabledTypes).toEqual(['maj', 'min', '7']);
  });

  it('falls back to the default modes when they are invalid', () => {
    const settings = sanitizeSettings({ mode: 'test', matchMode: 'loose' });
    expect(settings.mode).toBe(LEARN);
    expect(settings.matchMode).toBe('notes');
  });

  it('clamps the keyboard range so it never passes the last MIDI note', () => {
    const { startOctave, octaves } = sanitizeSettings({ startOctave: 99, octaves: 99 });
    expect(startOctave).toBe(4);
    expect(octaves).toBe(5);
    expect((startOctave + 1) * 12 + octaves * 12 - 1).toBeLessThanOrEqual(HIGHEST_MIDI);
  });

  it('falls back to the default toggles for non-boolean values', () => {
    const settings = sanitizeSettings({ labelAllKeys: 'yes', keySounds: 0, midiSounds: null });
    expect(settings.labelAllKeys).toBe(DEFAULT_SETTINGS.labelAllKeys);
    expect(settings.keySounds).toBe(DEFAULT_SETTINGS.keySounds);
    expect(settings.midiSounds).toBe(DEFAULT_SETTINGS.midiSounds);
  });
});

describe('useSettings', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it('useSettings follows storage changes', () => {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ mode: PRACTICE }));
    const { result } = renderHook(() => useSettings());
    expect(result.current.mode).toBe(PRACTICE);

    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ mode: LEARN }));
    notifyStorage();
    expect(result.current.mode).toBe(LEARN);
  });

  it('useSettings reads legacy keys and notices when they change', () => {
    window.localStorage.setItem('mode', 'test');
    const { result } = renderHook(() => useSettings());
    expect(result.current.mode).toBe(PRACTICE);

    window.localStorage.setItem('mode', 'learning');
    notifyStorage();
    expect(result.current.mode).toBe(LEARN);
  });

  it('updateSettings applies immediately', () => {
    const { result } = renderHook(() => useSettings());
    act(() => updateSettings({ matchMode: 'exact' }));
    expect(result.current.matchMode).toBe('exact');
  });
});
