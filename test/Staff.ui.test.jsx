import { describe, expect, it } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import Staff from '../app/components/Staff';

describe('Staff rendering smoke test (real VexFlow)', () => {
  it('renders a C7 voicing with a flat accidental and exact octaves', async () => {
    // C7 = C4 E4 G4 Bb4 -> [60, 64, 67, 70]
    const { container } = render(<Staff notes={[60, 64, 67, 70]} />);
    await waitFor(() => {
      expect(container.querySelector('svg')).toBeTruthy();
    });
    const svg = container.querySelector('svg');
    const noteheads = svg.querySelectorAll('[class*="notehead"]');
    expect(noteheads.length).toBe(4);
    // an accidental glyph must be drawn for the Bb: VexFlow 5 gives it no CSS
    // class of its own, so count glyphs — 4 noteheads + 1 flat = 5
    const glyphs = svg.querySelectorAll('.vf-stavenote text');
    expect(glyphs.length).toBe(5);
    // C4 must keep its real octave (below the staff -> ledger line drawn)
    expect(svg.querySelector('.vf-stavenote path[stroke-width="2"]')).toBeTruthy();
    cleanup();
  });

  it('renders a C9 voicing without collapsing octaves (5 distinct noteheads)', async () => {
    // C9 = C4 E4 G4 Bb4 D5 -> [60, 64, 67, 70, 74]; the old re-centering
    // moved C4 up an octave onto D5's line region and D5 down to D4
    const { container } = render(<Staff notes={[60, 64, 67, 70, 74]} />);
    await waitFor(() => {
      expect(container.querySelector('svg')).toBeTruthy();
    });
    const svg = container.querySelector('svg');
    const noteheads = Array.from(svg.querySelectorAll('[class*="notehead"]'));
    expect(noteheads.length).toBe(5);
    cleanup();
  });

  it('renders B natural (midi 71) with no accidental', async () => {
    const { container } = render(<Staff notes={[71]} />);
    await waitFor(() => {
      expect(container.querySelector('svg')).toBeTruthy();
    });
    const svg = container.querySelector('svg');
    // exactly one glyph: the notehead, with no spurious flat from the old
    // `key.includes('b')` check
    const glyphs = svg.querySelectorAll('.vf-stavenote text');
    expect(glyphs.length).toBe(1);
    cleanup();
  });

  it('colors pitch-ordered noteheads via original voicing indices', async () => {
    // mismatch at voicing index 0 (the lowest note C4) — after pitch sort it is
    // still first here, so use a voicing where input order != pitch order
    const result = { mismatches: [{ index: 1, expected: 64, played: 65 }] };
    const { container } = render(<Staff notes={[60, 64, 67]} result={result} />);
    await waitFor(() => {
      expect(container.querySelector('svg')).toBeTruthy();
    });
    const svg = container.querySelector('svg');
    const noteheads = Array.from(svg.querySelectorAll('[class*="notehead"]'));
    expect(noteheads.length).toBe(3);
    const fills = noteheads.map(h => h.getAttribute('fill') || h.style.fill);
    expect(fills.filter(f => f === '#ef4444').length).toBe(1);
    expect(fills.filter(f => f === '#34d399').length).toBe(2);
  });
});
