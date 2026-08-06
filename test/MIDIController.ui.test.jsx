import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

vi.mock('../app/components/Keyboard', () => ({
  default: function MockKeyboard(props) {
    return (
      <div data-testid="mock-keyboard">
        <output data-testid="keyboard-props">
          {JSON.stringify({
            baseOctave: props.baseOctave,
            hideLabels: props.hideLabels,
            octaves: props.octaves,
            orderMap: props.orderMap,
            showOrderNumbers: props.showOrderNumbers,
            targetMidis: props.targetMidis,
            visual: props.visual,
          })}
        </output>
        {props.targetMidis.map((midi) => (
          <button key={midi} onClick={() => props.onPlay(midi)} type="button">
            {`play-${midi}`}
          </button>
        ))}
      </div>
    );
  },
}));

vi.mock('../app/components/Staff', () => ({
  default: function MockStaff() {
    return <div data-testid="mock-staff" />;
  },
}));

import MIDIController from '../app/components/MIDIController';

function readKeyboardProps() {
  return JSON.parse(screen.getByTestId('keyboard-props').textContent);
}

function seedMathRandom(values) {
  vi.spyOn(Math, 'random').mockImplementation(() => values.shift() ?? 0);
}

describe('MIDIController UI behavior', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it('loads persisted settings into the active UI state', async () => {
    window.localStorage.setItem('enabledChordTypes', JSON.stringify(['maj']));
    window.localStorage.setItem('visualKeyboard', 'false');
    window.localStorage.setItem('keyboardBaseOctave', '5');
    window.localStorage.setItem('octavesVisible', '2');
    window.localStorage.setItem('mode', 'test');
    window.localStorage.setItem('numberingStyle', 'pitch');
    seedMathRandom([0, 0]);

    render(<MIDIController />);

    await screen.findByText('C');

    expect(readKeyboardProps()).toMatchObject({
      baseOctave: 5,
      hideLabels: false,
      octaves: 2,
      orderMap: ['1', '2', '3'],
      showOrderNumbers: false,
      targetMidis: [],
      visual: false,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));

    expect(screen.getByLabelText('Visual piano keyboard').checked).toBe(false);
    expect(screen.getByLabelText('Test').checked).toBe(true);
    expect(screen.getByLabelText('Ascending pitch (1..N)').checked).toBe(true);
    expect(screen.getByText(/Base octave:/).textContent).toContain('5');
    expect(screen.getByText(/Visible octaves:/).textContent).toContain('2');
  });

  it('persists settings changes and updates keyboard props', async () => {
    window.localStorage.setItem('enabledChordTypes', JSON.stringify(['maj']));
    window.localStorage.setItem('visualKeyboard', 'false');
    window.localStorage.setItem('mode', 'test');
    window.localStorage.setItem('numberingStyle', 'pitch');
    seedMathRandom([0, 0]);

    render(<MIDIController />);

    await screen.findByText('C');
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));

    fireEvent.click(screen.getByLabelText('Visual piano keyboard'));
    fireEvent.click(screen.getByLabelText('Learning'));
    fireEvent.click(screen.getByLabelText('Formula-order (1,3,5)'));

    await waitFor(() => {
      expect(readKeyboardProps()).toMatchObject({
        hideLabels: true,
        orderMap: ['1', '3', '5'],
        showOrderNumbers: true,
        targetMidis: [60, 64, 67],
        visual: true,
      });
    });

    expect(window.localStorage.getItem('visualKeyboard')).toBe('true');
    expect(window.localStorage.getItem('mode')).toBe('learning');
    expect(window.localStorage.getItem('numberingStyle')).toBe('formula');
  });

  it('records completed targets in history when a new target is generated', async () => {
    window.localStorage.setItem('enabledChordTypes', JSON.stringify(['maj']));
    seedMathRandom([0, 0, 0.1, 0]);

    render(<MIDIController />);

    await screen.findByText('C');

    fireEvent.click(screen.getByRole('button', { name: 'New' }));
    await screen.findByText('C#');

    const historySection = screen.getByText('Recent targets').parentElement;
    expect(within(historySection).getByText('C')).toBeTruthy();
  });

  it('shows per-position mismatch feedback for exact voicing errors', async () => {
    window.localStorage.setItem('enabledChordTypes', JSON.stringify(['maj']));
    seedMathRandom([0, 0]);

    render(<MIDIController />);

    await screen.findByText('C');

    fireEvent.click(screen.getByRole('button', { name: 'play-60' }));
    fireEvent.click(screen.getByRole('button', { name: 'play-67' }));
    fireEvent.click(screen.getByRole('button', { name: 'play-64' }));

    await screen.findByText('Voicing or note order did not match');
    expect(screen.getByText('Position 2: expected E4, played G4')).toBeTruthy();
    expect(screen.getByText('Position 3: expected G4, played E4')).toBeTruthy();
  });

  it('shows an unsupported status when Web MIDI is unavailable', async () => {
    const originalNavigator = globalThis.navigator;
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {},
    });

    try {
      window.localStorage.setItem('enabledChordTypes', JSON.stringify(['maj']));
      seedMathRandom([0, 0]);

      render(<MIDIController />);

      await screen.findByText('C');
      fireEvent.click(screen.getByRole('button', { name: 'Connect' }));

      expect(screen.getByText('Web MIDI not supported')).toBeTruthy();
    } finally {
      Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        value: originalNavigator,
      });
    }
  });
});
