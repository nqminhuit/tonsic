# Tonsic

Tonsic is a piano chord trainer — play the chord shown with a MIDI keyboard or the on-screen keys.

## Quick start

```sh
npm install
npm run dev      # http://localhost:3000
npm test         # unit + UI tests
npm run lint
npm run build && npm start   # production build
```

## Features

- **Learn mode** shows the notes, their formula degrees, the chord on a staff and the keys to press. **Practice mode** shows only the chord symbol (with the “exactly as written” rule it also shows the staff, as a sight-reading drill); use **Show answer** when stuck.
- **18 chord types** in three groups, with maj, m and 7 on by default:
  - Triads: maj, m, dim, aug, sus2, sus4
  - Sevenths: 7, maj7, m7, m7♭5, dim7
  - Sixth, added and extended: 6, m6, add9, 9, maj9, m9, 11
- **Three answer rules:** right notes in any octave or inversion (default), root position, or exactly the voicing on the staff.
- **MIDI input** handles note-on and note-off: a chord is accepted while held, and a wrong chord is judged once every key is released. Keys still held when the next chord appears are ignored.
- **On-screen keys** toggle on click; a correct chord is accepted at once, anything else is judged when you press **Check**.
- **Sound:** a Listen button and optional key sounds, synthesized with Web Audio (no samples).
- **Session stats** (correct, accuracy, streak, attempts) and a list of recent chords.
- Settings are saved in `localStorage`.

## How chords are spelled

- Notes are spelled by interval: each chord tone gets the letter its degree implies. E major is E–G♯–B, not E–A♭–B; C°7 is C–E♭–G♭–B𝄫.
- For black-key roots the spelling with fewer accidentals wins. Ties go to the conventional name: D♭, E♭, F♯, A♭, B♭ for major-type chords; C♯, E♭, F♯, G♯, B♭ for minor-type chords.
- The dominant 11th leaves out the 3rd, because it clashes with the 11th.
- Voicings are in root position starting in octave 4, lowered an octave only when the top note would pass B5, so every target fits the default keyboard (C3–B5).
- Octave numbers follow scientific pitch notation: C4 is middle C (MIDI 60), and B♯4 sounds like C5.

## MIDI

Web MIDI works in Chrome, Edge, Opera and Firefox (not Safari) and needs HTTPS or `localhost`. The browser asks for permission on the first connect; once granted, the app reconnects automatically.

## Project layout

- `lib/chords.js` — pure chord theory: spelling, voicing, evaluation.
- `lib/attempt.js` — pure state machine for held and selected keys.
- `app/components/Trainer.jsx` — page composition, using the hooks `useChordTrainer`, `useWebMIDI`, `useSettings` and `useSynth` plus the presentational components beside it.
- `test/` — `*.test.js` run with `node --test`; `*.ui.test.jsx` run with Vitest.
