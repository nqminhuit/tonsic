import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import Trainer from '../app/components/Trainer';
import { ADVANCE_DELAY_MS } from '../app/components/useChordTrainer';

vi.mock('../app/components/Staff', () => ({
  default: ({ notes }) => <div data-testid="staff" data-notes={notes.map((n) => `${n.vexKey}:${n.status || ''}`).join(' ')} />,
  STAFF_SIZE: { width: 192, height: 163 },
  NOTE_COLORS: { ink: '#1f2937', good: '#15803d', bad: '#dc2626' },
}));

const NOTE_ON = 0x90;
const NOTE_OFF = 0x80;
const CORRECT_C = "Correct — that's C!";
const NOT_QUITE = 'Not quite — try again';
const C_MAJOR_CHECKBOX = /^C major/;
const ROOT_POSITION = /Root position/;
const C_MAJOR_SYMBOL = 'C';
const D_FLAT = 'D♭';
const C_MINOR = 'Cm';
const ATTEMPTS = 'Attempts';
const CORRECT = 'Correct';
const NOT_QUITE_PREFIX = 'Not quite';
const PRACTICE = 'Practice';
const SHOW_ANSWER = 'Show answer';
const SETTINGS_KEY = 'tonsic:settings';
const CHORD_NOTES = 'Notes in this chord';
const PRACTICE_MODE = 'practice';
const STAFF_TEST_ID = 'staff';
const DEVICE_NAME = 'Test Keys';
const CONNECT_MIDI = 'Connect MIDI keyboard';
const ENABLE_SOUND = 'Enable sound';
const C4 = 'C4';
const E4 = 'E4';
const G4 = 'G4';
const E_FLAT4 = 'E♭4';

function clickKey(name) {
  const keyboard = screen.getByRole('group', { name: 'Piano keyboard' });
  fireEvent.click(within(keyboard).getByRole('button', { name }));
}

function clickKeys(...names) {
  names.forEach(clickKey);
}

function pressCheck() {
  fireEvent.click(screen.getByRole('button', { name: 'Check' }));
}

function status() {
  return screen.getByRole('status').textContent;
}

function stat(label) {
  const term = screen.getAllByText(label, { selector: 'dt' })[0];
  return term.nextElementSibling.textContent;
}

// the Streak value is followed by a "best N" hint
function streak() {
  return screen.getAllByText('Streak', { selector: 'dt' })[0].nextElementSibling.firstChild.textContent;
}

function heading() {
  return document.getElementById('target-chord').textContent;
}

function savedSettings() {
  return JSON.parse(window.localStorage.getItem(SETTINGS_KEY));
}

function define(target, key, value) {
  Object.defineProperty(target, key, { configurable: true, value });
}

function fakeMidiAccess() {
  const input = { id: 'in-1', name: DEVICE_NAME, state: 'connected', onmidimessage: null };
  const access = { inputs: new Map([[input.id, input]]), outputs: new Map(), onstatechange: null };
  return { input, access };
}

function installMidi() {
  const { input, access } = fakeMidiAccess();
  define(navigator, 'requestMIDIAccess', () => Promise.resolve(access));
  return input;
}

function grantMidiPermission() {
  define(navigator, 'permissions', { query: () => Promise.resolve({ state: 'granted' }) });
}

function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function node() {
  return { connect(target) { return target; } };
}

function param() {
  return { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} };
}

class FakeAudioContext {
  constructor() {
    this.state = 'suspended';
    this.currentTime = 0;
    this.destination = {};
    this.onstatechange = null;
  }

  createDynamicsCompressor() {
    return node();
  }

  createGain() {
    return { ...node(), gain: param() };
  }

  createBiquadFilter() {
    return { ...node(), type: '', frequency: param() };
  }

  createOscillator() {
    return { ...node(), type: '', frequency: param(), start() {}, stop() {} };
  }

  resume() {
    this.state = 'running';
    this.onstatechange?.();
    return Promise.resolve();
  }

  close() {
    this.state = 'closed';
    return Promise.resolve();
  }
}

async function connectMidi() {
  const input = installMidi();
  render(<Trainer />);
  fireEvent.click(screen.getByRole('button', { name: CONNECT_MIDI }));
  await screen.findByText(DEVICE_NAME);
  return input;
}

function send(input, statusByte, note, velocity = 100) {
  act(() => input.onmidimessage({ data: [statusByte, note, velocity] }));
}

function openSettings() {
  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
}

function solveC() {
  clickKeys(C4, E4, G4);
  advance();
  expect(heading()).toBe(D_FLAT);
}

function recentChords() {
  return screen.getByRole('list', { name: 'Recent chords' });
}

function advance() {
  act(() => {
    vi.advanceTimersByTime(ADVANCE_DELAY_MS + 50);
  });
}

describe('Trainer', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    window.localStorage.clear();
    delete navigator.requestMIDIAccess;
    delete navigator.permissions;
    delete window.AudioContext;
  });

  it('accepts C major clicked on screen in any order', () => {
    render(<Trainer />);
    expect(screen.getByRole('heading', { name: C_MAJOR_SYMBOL })).toBeTruthy();
    clickKeys(G4, C4, E4);
    expect(status()).toContain(CORRECT_C);
    expect(stat(CORRECT)).toBe('1');
    expect(stat(ATTEMPTS)).toBe('1');
  });

  it('explains a wrong chord after Check, then accepts the fix', () => {
    render(<Trainer />);
    clickKeys(C4, E_FLAT4, G4);
    pressCheck();
    expect(status()).toContain(NOT_QUITE);
    expect(status()).toContain('Not in C: E♭.');
    expect(status()).toContain('Missing: E.');
    expect(stat(ATTEMPTS)).toBe('1');
    expect(stat(CORRECT)).toBe('0');

    clickKeys(E_FLAT4, E4);
    expect(status()).toContain(CORRECT_C);
  });

  it('auto-advances after a correct answer and records history', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    vi.useFakeTimers();
    render(<Trainer />);
    clickKeys(C4, E4, G4);
    advance();
    expect(heading()).toBe(D_FLAT);
    const history = recentChords();
    expect(history.textContent).toContain(C_MAJOR_SYMBOL);
    expect(history.textContent).toContain('first try');
  });

  it('accepts MIDI notes in any order and ignores keys still held on the next chord', async () => {
    const input = await connectMidi();
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);

    [67, 60, 64].forEach((note) => send(input, NOTE_ON, note));
    expect(status()).toContain(CORRECT_C);
    advance();
    expect(heading()).toBe(D_FLAT);
    expect(status()).toContain('Your turn');

    [60, 64, 67].forEach((note) => send(input, NOTE_OFF, note, 0));
    expect(stat(ATTEMPTS)).toBe('1');
    expect(status()).not.toContain(NOT_QUITE_PREFIX);
  });

  it('judges a wrong MIDI chord on release, treating velocity-0 note-on as note-off', async () => {
    const input = await connectMidi();
    [60, 63, 67].forEach((note) => send(input, NOTE_ON, note));
    expect(status()).not.toContain(NOT_QUITE_PREFIX);

    [60, 63, 67].forEach((note) => send(input, NOTE_ON, note, 0));
    expect(status()).toContain(NOT_QUITE);
    expect(stat(ATTEMPTS)).toBe('1');
  });

  it('does not count a single stray MIDI key as an attempt', async () => {
    const input = await connectMidi();
    send(input, NOTE_ON, 61);
    send(input, NOTE_OFF, 61, 0);
    expect(stat(ATTEMPTS)).toBe('0');
  });

  it('hides the answer in practice mode until asked', () => {
    render(<Trainer />);
    fireEvent.click(screen.getByRole('radio', { name: PRACTICE }));
    expect(screen.queryByRole('list', { name: CHORD_NOTES })).toBeNull();
    expect(screen.queryByTestId(STAFF_TEST_ID)).toBeNull();

    clickKeys(C4, E_FLAT4, G4);
    pressCheck();
    expect(status()).toContain('1 note missing.');
    expect(status()).not.toContain('Missing: E');

    fireEvent.click(screen.getByRole('button', { name: SHOW_ANSWER }));
    expect(screen.getByRole('list', { name: CHORD_NOTES })).toBeTruthy();
    expect(screen.getByTestId(STAFF_TEST_ID)).toBeTruthy();
    expect(savedSettings().mode).toBe(PRACTICE_MODE);
  });

  it('switches mode with the arrow keys', () => {
    render(<Trainer />);
    const learn = screen.getByRole('radio', { name: 'Learn' });
    learn.focus();
    fireEvent.keyDown(learn, { key: 'ArrowRight' });
    const practice = screen.getByRole('radio', { name: PRACTICE });
    expect(practice.getAttribute('aria-checked')).toBe('true');
    expect(document.activeElement).toBe(practice);
    expect(savedSettings().mode).toBe(PRACTICE_MODE);
  });

  it('rejects an inversion in root-position mode', () => {
    render(<Trainer />);
    openSettings();
    fireEvent.click(screen.getByRole('radio', { name: ROOT_POSITION }));
    fireEvent.click(screen.getByRole('button', { name: 'Close settings' }));

    clickKeys(E4, G4, 'C5');
    pressCheck();
    expect(status()).toContain('The lowest note should be the root, C — yours was E4.');
    expect(savedSettings().matchMode).toBe('bass');
  });

  it('replaces the current chord when its type is disabled', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    render(<Trainer />);
    openSettings();
    fireEvent.click(screen.getByRole('checkbox', { name: C_MAJOR_CHECKBOX }));
    expect(heading()).toBe(C_MINOR);
    expect(savedSettings().enabledTypes).toEqual(['min', '7']);
  });

  it('reports when the browser has no Web MIDI', () => {
    render(<Trainer />);
    fireEvent.click(screen.getByRole('button', { name: CONNECT_MIDI }));
    expect(screen.getByText('Web MIDI not supported in this browser')).toBeTruthy();
  });

  it('reads settings saved by the previous app version', () => {
    window.localStorage.setItem('enabledChordTypes', '["min7"]');
    window.localStorage.setItem('mode', 'test');
    render(<Trainer />);
    expect(heading()).toBe('Cm7');
    expect(screen.getByRole('radio', { name: PRACTICE }).getAttribute('aria-checked')).toBe('true');
  });

  it('keeps the first chord when another type is enabled', () => {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ enabledTypes: ['min', '7'] }));
    render(<Trainer />);
    expect(heading()).toBe(C_MINOR);
    openSettings();
    fireEvent.click(screen.getByRole('checkbox', { name: C_MAJOR_CHECKBOX }));
    expect(heading()).toBe(C_MINOR);
    expect(savedSettings().enabledTypes).toEqual(['maj', 'min', '7']);
  });

  it('a skip ends the streak', () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    render(<Trainer />);
    clickKeys(C4, E4, G4);
    expect(streak()).toBe('1');
    advance();
    expect(heading()).toBe(D_FLAT);

    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(streak()).toBe('0');
    expect(recentChords().textContent).toContain('skipped');
  });

  it('Show answer ends the streak and a revealed solve does not extend it', () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    render(<Trainer />);
    solveC();

    fireEvent.click(screen.getByRole('radio', { name: PRACTICE }));
    fireEvent.click(screen.getByRole('button', { name: SHOW_ANSWER }));
    expect(streak()).toBe('0');

    clickKeys('D♭4', 'F4', 'A♭4');
    expect(status()).toContain("Correct — that's D♭!");
    expect(stat(CORRECT)).toBe('2');
    expect(streak()).toBe('0');
  });

  it('dropping the current chord type in Settings ends the streak without a history entry', () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    render(<Trainer />);
    solveC();

    openSettings();
    fireEvent.click(screen.getByRole('checkbox', { name: C_MAJOR_CHECKBOX }));
    expect(heading()).not.toBe(D_FLAT);
    expect(streak()).toBe('0');
    expect(recentChords().querySelectorAll('li').length).toBe(1);
  });

  it('hides feedback judged under a different answer rule', () => {
    render(<Trainer />);
    clickKeys(C4, E_FLAT4, G4);
    pressCheck();
    expect(status()).toContain(NOT_QUITE_PREFIX);

    openSettings();
    fireEvent.click(screen.getByRole('radio', { name: ROOT_POSITION }));
    fireEvent.click(screen.getByRole('button', { name: 'Close settings' }));
    expect(status()).not.toContain(NOT_QUITE_PREFIX);
    expect(status()).toContain('Playing');

    pressCheck();
    expect(status()).toContain(NOT_QUITE_PREFIX);
  });

  it('shares one MIDI request between the auto-connect and a click', async () => {
    const permission = deferred();
    const request = deferred();
    const requestMIDIAccess = vi.fn(() => request.promise);
    define(navigator, 'permissions', { query: () => permission.promise });
    define(navigator, 'requestMIDIAccess', requestMIDIAccess);

    render(<Trainer />);
    fireEvent.click(screen.getByRole('button', { name: CONNECT_MIDI }));
    expect(screen.getByText('Connecting…')).toBeTruthy();

    await act(async () => {
      permission.resolve({ state: 'granted' });
    });
    await act(async () => {
      request.resolve(fakeMidiAccess().access);
    });
    expect(requestMIDIAccess).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(DEVICE_NAME)).toBeTruthy();
  });

  it('offers Enable sound when MIDI reconnects without a click, and unlocks on the first gesture', async () => {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ midiSounds: true }));
    define(window, 'AudioContext', FakeAudioContext);
    grantMidiPermission();
    installMidi();

    render(<Trainer />);
    await screen.findByText(DEVICE_NAME);
    expect(screen.getByRole('button', { name: ENABLE_SOUND })).toBeTruthy();

    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('button', { name: ENABLE_SOUND })).toBeNull();
  });

  it('unlocks sound on a touch tap, which only grants the gesture on pointerup', async () => {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ midiSounds: true }));
    define(window, 'AudioContext', FakeAudioContext);
    grantMidiPermission();
    installMidi();

    render(<Trainer />);
    await screen.findByText(DEVICE_NAME);
    expect(screen.getByRole('button', { name: ENABLE_SOUND })).toBeTruthy();

    fireEvent.pointerUp(document.body);
    expect(screen.queryByRole('button', { name: ENABLE_SOUND })).toBeNull();
  });

  it('hides Enable sound when the browser has no Web Audio', async () => {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ midiSounds: true }));
    grantMidiPermission();
    installMidi();

    render(<Trainer />);
    await screen.findByText(DEVICE_NAME);
    expect(screen.queryByRole('button', { name: ENABLE_SOUND })).toBeNull();
  });

  it('practice mode with the exact rule shows the staff but not the notes', () => {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ mode: PRACTICE_MODE, matchMode: 'exact' }));
    render(<Trainer />);
    expect(screen.getByTestId(STAFF_TEST_ID)).toBeTruthy();
    expect(screen.queryByRole('list', { name: CHORD_NOTES })).toBeNull();
    expect(screen.getByText(/Read the staff and play exactly those keys/)).toBeTruthy();
    expect(document.body.textContent).toContain('play exactly what is written');
    const keyboard = screen.getByRole('group', { name: 'Piano keyboard' });
    expect(keyboard.querySelector('[data-state="target"]')).toBeNull();
  });

  it('a chord solved just before its type is turned off keeps the streak', () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    render(<Trainer />);
    clickKeys(C4, E4, G4);
    expect(streak()).toBe('1');

    openSettings();
    fireEvent.click(screen.getByRole('checkbox', { name: C_MAJOR_CHECKBOX }));
    expect(streak()).toBe('1');
    expect(heading()).not.toBe(C_MAJOR_SYMBOL);
  });
});
