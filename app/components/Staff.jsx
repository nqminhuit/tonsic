'use client';

import { useEffect, useRef } from 'react';

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

export default function Staff({ pcs = [], notes = null, result = null }) {
  const input = notes || pcs;
  // result.mismatches: array of {index, expected, played} from matchExactVoicing

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

        if (!input || input.length === 0) return;

        // Determine whether input is MIDI note numbers (>12) or pitch classes (0-11)
        const isMidi = input.some(n => n > 12);
        let adjustedMidis = [];
        if (isMidi) {
          // use MIDI numbers directly and center around median
          const uniqueMidis = Array.from(new Set(input));
          const sorted = [...uniqueMidis].sort((a,b) => a-b);
          const mid = sorted.length % 2 === 1 ? sorted[(sorted.length-1)/2] : (sorted[sorted.length/2 - 1] + sorted[sorted.length/2]) / 2;
          adjustedMidis = uniqueMidis.map(m => {
            let midi = m;
            while (midi - mid > 6) midi -= 12;
            while (midi - mid < -6) midi += 12;
            return midi;
          });
        } else {
          // Map pitch classes to MIDI numbers and infer octaves to minimize vertical span on the staff
          const uniquePCs = Array.from(new Set(input));
          // base mapping: MIDI for octave 4 (C4 = 60)
          const baseMidis = uniquePCs.map(pc => 60 + ((pc % 12) + 12) % 12);
          // compute median to center the chord
          const sorted = [...baseMidis].sort((a,b) => a-b);
          const mid = sorted.length % 2 === 1 ? sorted[(sorted.length-1)/2] : (sorted[sorted.length/2 - 1] + sorted[sorted.length/2]) / 2;
          // bring notes within +/-6 semitones of median (roughly within a single staff octave)
          adjustedMidis = baseMidis.map(m => {
            let midi = m;
            while (midi - mid > 6) midi -= 12;
            while (midi - mid < -6) midi += 12;
            return midi;
          });
        }
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

        // If a result with per-note mismatches is provided, color noteheads
        if (result && result.mismatches) {
          // attempt to find notehead SVG elements corresponding to keys
          try {
            const svg = el.querySelector('svg');
            if (svg) {
              // common selectors for notehead paths/groups
              let noteheadElems = svg.querySelectorAll('.vf-notehead, .vf-note .vf-notehead, path.vf-notehead, g.vf-notehead');
              if (!noteheadElems || noteheadElems.length === 0) {
                // fallback: find elements that look like noteheads by class 'note' or 'notehead'
                noteheadElems = svg.querySelectorAll('[class*="notehead"], [class*="vf-note"] path');
              }
              // Convert NodeList to array
              const heads = Array.from(noteheadElems);
              // Color by index if possible
              const totalKeys = keys.length;
              // Determine indices that are incorrect
              const badIndices = new Set(result.mismatches.map(m => m.index));
              // Try to color the first N noteheads
              for (let i = 0; i < Math.min(heads.length, totalKeys); i++) {
                const elHead = heads[i];
                const color = badIndices.has(i) ? '#ef4444' : '#34d399';
                try { elHead.setAttribute('fill', color); elHead.style.fill = color; } catch (e) {}
              }
            }
          } catch (e) {
            // ignore coloring errors
          }
        }
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
  }, [pcs, notes, notes?.length, result]);

  return (
    <div className="staff-container w-full">
      <div ref={containerRef} />
    </div>
  );
}
