import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { buildChord } from '../lib/chords';
import Staff, { NOTE_COLORS } from '../app/components/Staff';

function staffNotes(rootPc, type) {
  return buildChord(rootPc, type).tones.map((tone) => ({ vexKey: tone.vexKey }));
}

async function renderStaff(notes) {
  const { container } = render(<Staff notes={notes} label="chord" />);
  await waitFor(() => expect(container.querySelector('.vf-stavenote')).toBeTruthy());
  return container.querySelector('svg');
}

// VexFlow 5 draws noteheads and accidentals as text glyphs inside the note group
function glyphCount(svg) {
  return svg.querySelectorAll('.vf-stavenote text').length;
}

describe('Staff (real VexFlow)', () => {
  afterEach(cleanup);

  it('draws one accidental for C7 (the B♭) and keeps C4 on a ledger line', async () => {
    const svg = await renderStaff(staffNotes(0, '7'));
    expect(svg.querySelectorAll('[class*="notehead"]').length).toBe(4);
    expect(glyphCount(svg)).toBe(5);
    expect(svg.querySelector('.vf-stavenote path[stroke-width="2"]')).toBeTruthy();
  });

  it('spells E major with a sharp (E G♯ B), not a flat', async () => {
    const svg = await renderStaff(staffNotes(4, 'maj'));
    expect(glyphCount(svg)).toBe(4);
    expect(svg.innerHTML).toContain('');
    expect(svg.innerHTML).not.toContain('');
  });

  it('draws the double flat of C°7 (B𝄫) as one glyph', async () => {
    const svg = await renderStaff(staffNotes(0, 'dim7'));
    expect(glyphCount(svg)).toBe(7);
    expect(svg.innerHTML).toContain('');
  });

  it('renders B natural with no accidental', async () => {
    const svg = await renderStaff([{ vexKey: 'b/4' }]);
    expect(glyphCount(svg)).toBe(1);
  });

  it('colours noteheads by status', async () => {
    const svg = await renderStaff([
      { vexKey: 'c/4', status: 'good' },
      { vexKey: 'e/4', status: 'bad' },
      { vexKey: 'g/4' },
    ]);
    const fills = Array.from(svg.querySelectorAll('.vf-notehead')).map((head) => head.getAttribute('fill'));
    expect(fills).toEqual([NOTE_COLORS.good, NOTE_COLORS.bad, NOTE_COLORS.ink]);
  });
});
