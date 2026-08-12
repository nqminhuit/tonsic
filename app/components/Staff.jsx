'use client';

import { useEffect, useRef } from 'react';
import { chooseAccidentalStyle, noteNameForPitchClass } from '../../lib/chords';

export default function Staff({ pcs = [], notes = null, result = null, accidentalStyle = 'auto' }) {
  const input = notes || pcs;
  const accidentals = chooseAccidentalStyle(input, accidentalStyle);
  // result.mismatches: array of {index, expected, played} from matchExactVoicing

  const containerRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    let renderer = null;
    let context = null;
    const container = containerRef.current;

    async function render() {
      try {
        const mod = await import('vexflow');
        const VF = mod.Flow || mod.Vex || mod.default?.Flow || mod.default || mod;
        const { Renderer, Stave, StaveNote, Voice, Formatter, Accidental } = VF;
        if (!mounted) return;
        const el = container;
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
        // entries pair each displayed MIDI note with its position in the original input
        // so mismatch coloring can survive the pitch-order sort below
        let entries = [];
        if (isMidi) {
          // use the MIDI numbers as-is so the staff shows the exact target voicing
          entries = Array.from(new Set(input)).map(m => ({ midi: m, origIndex: input.indexOf(m) }));
        } else {
          // Map pitch classes to MIDI numbers and infer octaves to minimize vertical span on the staff
          const uniquePCs = Array.from(new Set(input));
          // base mapping: MIDI for octave 4 (C4 = 60)
          const baseMidis = uniquePCs.map(pc => 60 + ((pc % 12) + 12) % 12);
          // compute median to center the chord
          const sorted = [...baseMidis].sort((a,b) => a-b);
          const mid = sorted.length % 2 === 1 ? sorted[(sorted.length-1)/2] : (sorted[sorted.length/2 - 1] + sorted[sorted.length/2]) / 2;
          // bring notes within +/-6 semitones of median (roughly within a single staff octave)
          entries = baseMidis.map((m, i) => {
            let midi = m;
            while (midi - mid > 6) midi -= 12;
            while (midi - mid < -6) midi += 12;
            return { midi, origIndex: input.indexOf(uniquePCs[i]) };
          });
        }
        // VexFlow expects chord keys ordered from lowest to highest
        entries.sort((a, b) => a.midi - b.midi);
        // convert to VexFlow key strings (e.g., 'c/4' or 'db/5') using chosen accidental style
        const displayMidis = entries.map(e => e.midi);
        const keyInfos = entries.map(({ midi }) => {
          const name = noteNameForPitchClass(midi, accidentals, displayMidis).toLowerCase();
          const octave = Math.floor(midi / 12) - 1;
          // the accidental is the part after the letter ('' for naturals, so a
          // bare 'b' key stays natural B)
          return { key: `${name}/${octave}`, accidental: name.slice(1) };
        });

        const note = new StaveNote({ keys: keyInfos.map(k => k.key), duration: 'w' });
        // add accidentals when necessary ('#' or 'b')
        keyInfos.forEach((k, i) => {
          if (k.accidental === '#' || k.accidental === 'b') {
            note.addModifier(new Accidental(k.accidental), i);
          }
        });

        const voice = new Voice({ numBeats: 4, beatValue: 4 });
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
              // mismatch indices refer to positions in the original voicing, while
              // noteheads are pitch-ordered — map through origIndex
              const badIndices = new Set(result.mismatches.map(m => m.index));
              for (let i = 0; i < Math.min(heads.length, entries.length); i++) {
                const elHead = heads[i];
                const color = badIndices.has(entries[i].origIndex) ? '#ef4444' : '#34d399';
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
      if (renderer && renderer.getContext && container) {
        try { container.innerHTML = ''; } catch (e) {}
      }
    };
  }, [accidentals, input, result]);

  return (
    <div className="staff-container w-full">
      <div ref={containerRef} />
    </div>
  );
}
