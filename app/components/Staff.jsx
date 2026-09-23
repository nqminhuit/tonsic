'use client';

import { useEffect, useRef } from 'react';

export const NOTE_COLORS = {
  ink: '#1f2937',
  good: '#15803d',
  bad: '#dc2626',
};

// drawn in VexFlow units, then scaled up so noteheads and accidentals are easy to read
const SCALE = 1.45;
const LOGICAL_WIDTH = 132;
const LOGICAL_HEIGHT = 112;
export const STAFF_SIZE = { width: Math.ceil(LOGICAL_WIDTH * SCALE), height: Math.ceil(LOGICAL_HEIGHT * SCALE) };

function serialize(notes) {
  return notes.map((note) => `${note.vexKey}:${note.status || ''}`).join(' ');
}

function deserialize(key) {
  if (!key) return [];
  return key.split(' ').map((entry) => {
    const [vexKey, status] = entry.split(':');
    return { vexKey, status };
  });
}

// notes: [{ vexKey: 'eb/4', status?: 'good' | 'bad' }], already ordered low to high
export default function Staff({ notes = [], label = '' }) {
  const containerRef = useRef(null);
  // a string key keeps the SVG from being redrawn when only the array identity changes
  const renderKey = serialize(notes);

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    const entries = deserialize(renderKey);

    async function draw() {
      try {
        const mod = await import('vexflow');
        const VF = mod.default || mod;
        // VexFlow registers its music font on import but loads it async; measuring glyphs before
        // it is ready spreads the accidentals far away from the noteheads
        if (typeof document !== 'undefined' && document.fonts && document.fonts.load) {
          await document.fonts.load('30px Bravura').catch(() => {});
        }
        if (cancelled || !container) return;
        const { Renderer, Stave, StaveNote, Voice, Formatter, Accidental } = VF;

        container.innerHTML = '';
        const renderer = new Renderer(container, Renderer.Backends.SVG);
        renderer.resize(STAFF_SIZE.width, STAFF_SIZE.height);
        const context = renderer.getContext();
        context.scale(SCALE, SCALE);
        // negative y trims VexFlow's default headroom; G3 to B5 (every voicing) still fits
        const stave = new Stave(2, -12, LOGICAL_WIDTH - 6);
        stave.addClef('treble');
        stave.setContext(context).draw();
        if (!entries.length) return;

        const chord = new StaveNote({ keys: entries.map((note) => note.vexKey), duration: 'w' });
        entries.forEach((note, i) => {
          const accidental = note.vexKey.split('/')[0].slice(1);
          if (accidental) chord.addModifier(new Accidental(accidental), i);
          const color = NOTE_COLORS[note.status] || NOTE_COLORS.ink;
          chord.setKeyStyle(i, { fillStyle: color, strokeStyle: color });
        });

        const voice = new Voice({ numBeats: 4, beatValue: 4 });
        voice.addTickables([chord]);
        new Formatter().joinVoices([voice]).format([voice], LOGICAL_WIDTH - 60);
        voice.draw(context, stave);
      } catch (err) {
        console.error('VexFlow render error', err);
      }
    }

    draw();
    return () => {
      // the next draw replaces the SVG, so the old one stays up meanwhile (no flicker)
      cancelled = true;
    };
  }, [renderKey]);

  return <div ref={containerRef} role="img" aria-label={label} className="staff" style={STAFF_SIZE} />;
}
