'use client';

import { useEffect, useRef } from 'react';

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

export default function Staff({ pcs = [] }) {
  const containerRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    let renderer = null;
    let context = null;

    async function render() {
      try {
        const mod = await import('vexflow');
        const VF = mod.Flow || mod.Vex || mod.default?.Flow || mod.default || mod;
        const { Renderer, Stave, StaveNote, Voice, Formatter, Accidental } = VF;
        if (!mounted) return;
        const el = containerRef.current;
        if (!el) return;
        // clear
        el.innerHTML = '';
        renderer = new Renderer(el, Renderer.Backends.SVG);
        renderer.resize(380, 140);
        context = renderer.getContext();
        const stave = new Stave(10, 10, 360);
        stave.addClef('treble');
        stave.setContext(context).draw();

        if (!pcs || pcs.length === 0) return;

        // Map pitch classes to MIDI numbers and infer octaves to minimize vertical span on the staff
        const uniquePCs = Array.from(new Set(pcs));
        // base mapping: MIDI for octave 4 (C4 = 60)
        const baseMidis = uniquePCs.map(pc => 60 + ((pc % 12) + 12) % 12);
        // compute median to center the chord
        const sorted = [...baseMidis].sort((a,b) => a-b);
        const mid = sorted.length % 2 === 1 ? sorted[(sorted.length-1)/2] : (sorted[sorted.length/2 - 1] + sorted[sorted.length/2]) / 2;
        // bring notes within +/-6 semitones of median (roughly within a single staff octave)
        const adjustedMidis = baseMidis.map(m => {
          let midi = m;
          while (midi - mid > 6) midi -= 12;
          while (midi - mid < -6) midi += 12;
          return midi;
        });
        // convert to VexFlow key strings (e.g., 'c/4' or 'c#/5')
        const keys = adjustedMidis.map(midi => {
          const pc = midi % 12;
          const name = NOTE_NAMES[pc].toLowerCase();
          const octave = Math.floor(midi / 12) - 1;
          return `${name}/${octave}`;
        });

        const note = new StaveNote({ keys, duration: 'w' });
        // add accidentals when necessary (sharp in NOTE_NAMES)
        keys.forEach((k, i) => {
          if (k.includes('#')) {
            try { note.addAccidental(i, new Accidental('#')); } catch (e) { /* ignore */ }
          }
        });

        const voice = new Voice({ num_beats: 4, beat_value: 4 });
        voice.addTickables([note]);
        new Formatter().joinVoices([voice]).format([voice], 320);
        voice.draw(context, stave);
      } catch (err) {
        // If VexFlow import fails, show nothing
        console.error('VexFlow render error', err);
      }
    }

    render();
    return () => {
      mounted = false;
      if (renderer && renderer.getContext) {
        try { containerRef.current.innerHTML = ''; } catch (e) {}
      }
    };
  }, [pcs]);

  return (
    <div className="staff-container w-full">
      <div ref={containerRef} />
    </div>
  );
}
