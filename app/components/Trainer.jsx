'use client';

import { useState } from 'react';
import { CHORD_TYPE_IDS, EXACT_MODE } from '../../lib/chords';
import { activeNotes } from '../../lib/attempt';
import AttemptFeedback from './AttemptFeedback';
import ChordPrompt from './ChordPrompt';
import { GearIcon, SpeakerIcon } from './Icons';
import MidiStatus from './MidiStatus';
import ModeSwitch from './ModeSwitch';
import PianoKeyboard from './PianoKeyboard';
import SessionStats from './SessionStats';
import SettingsDialog from './SettingsDialog';
import { buildKeyStates, defaultKeyLabel, defaultKeyName, keyboardRange } from './keyboardState';
import { useChordTrainer } from './useChordTrainer';
import { LEARN, updateSettings, useSettings } from './useSettings';
import { useSynth } from './useSynth';
import { MIDI_STATUS, useWebMIDI } from './useWebMIDI';
import { BUTTON_PRIMARY, BUTTON_QUIET, BUTTON_SECONDARY, CARD } from './ui';

function Logo() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden="true" className="shrink-0">
      <rect width="36" height="36" rx="9" className="fill-accent" />
      <g className="fill-white dark:fill-neutral-950">
        <ellipse cx="14" cy="25" rx="4.4" ry="3.2" transform="rotate(-20 14 25)" />
        <ellipse cx="14" cy="18" rx="4.4" ry="3.2" transform="rotate(-20 14 18)" />
        <ellipse cx="14" cy="11" rx="4.4" ry="3.2" transform="rotate(-20 14 11)" />
        <rect x="17.6" y="6" width="2" height="19" rx="1" />
      </g>
    </svg>
  );
}

export default function Trainer() {
  const settings = useSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const synth = useSynth();
  const trainer = useChordTrainer({ enabledTypes: settings.enabledTypes, matchMode: settings.matchMode });
  const { attempt, chord, revealed, session } = trainer;

  const midi = useWebMIDI({
    onNoteOn: (note) => {
      if (settings.midiSounds) synth.play([note]);
      trainer.pressKey(note);
    },
    onNoteOff: (note) => trainer.releaseKey(note),
    onReset: () => trainer.releaseAll(),
  });

  const learning = settings.mode === LEARN;
  const showAnswer = learning || revealed;
  // with the exact rule the staff is the question, so practice mode shows it
  const showStaff = showAnswer || settings.matchMode === EXACT_MODE;
  const range = keyboardRange(settings, chord);
  const keys = buildKeyStates({ chord, attempt, showAnswer, matchMode: settings.matchMode });
  const hasSelection = attempt.selected.length > 0;

  function handleKeyClick(note) {
    if (settings.keySounds) synth.play([note]);
    trainer.toggleKey(note);
  }

  function setTypes(types) {
    updateSettings({ enabledTypes: types });
    trainer.typesChanged(types);
  }

  function toggleType(id) {
    const next = new Set(settings.enabledTypes);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    if (next.size) setTypes(CHORD_TYPE_IDS.filter((type) => next.has(type)));
  }

  function connectMidi() {
    // the click is a user gesture, so audio can be unlocked for MIDI echo here too
    synth.unlock();
    midi.connect();
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-5 px-4 py-5 sm:px-6 sm:py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Logo />
          <div>
            <h1 className="text-xl font-bold leading-tight text-ink">Tonsic</h1>
            <p className="text-sm text-ink-3">Chord trainer for piano</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {midi.status === MIDI_STATUS.connected && settings.midiSounds && synth.supported && !synth.unlocked ? (
            <button type="button" className={BUTTON_SECONDARY} onClick={() => synth.unlock()} title="Browsers only play sound after you click or press a key on the page">
              <SpeakerIcon />
              Enable sound
            </button>
          ) : null}
          <MidiStatus status={midi.status} devices={midi.devices} onConnect={connectMidi} />
          <button type="button" className={BUTTON_SECONDARY} onClick={() => setSettingsOpen(true)}>
            <GearIcon />
            Settings
          </button>
        </div>
      </header>

      <ModeSwitch mode={settings.mode} matchMode={settings.matchMode} onChange={(mode) => updateSettings({ mode })} />

      <ChordPrompt
        chord={chord}
        showAnswer={showAnswer}
        showStaff={showStaff}
        canReveal={!showAnswer}
        result={attempt.result}
        solved={attempt.solved}
        onListen={() => synth.play(chord.midis, { strum: true })}
        onReveal={trainer.reveal}
        onNext={trainer.skip}
      />

      <section className={`${CARD} grid gap-4 p-4 sm:p-5`} aria-label="Keyboard">
        <AttemptFeedback
          chord={chord}
          attempt={attempt}
          activeNotes={activeNotes(attempt)}
          showAnswer={showAnswer}
          matchMode={settings.matchMode}
        />
        <PianoKeyboard
          low={range.low}
          high={range.high}
          keys={keys}
          focusLow={chord.midis[0]}
          focusHigh={chord.midis[chord.midis.length - 1]}
          labelAllKeys={settings.labelAllKeys}
          defaultLabel={defaultKeyLabel}
          defaultName={defaultKeyName}
          onKeyClick={handleKeyClick}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-ink-3">Click keys to select them (click again to remove). A right chord is accepted at once; press Check to see what is wrong.</p>
          <div className="flex gap-2">
            <button type="button" className={BUTTON_QUIET} disabled={!hasSelection || attempt.solved} onClick={trainer.clear}>
              Clear
            </button>
            <button type="button" className={BUTTON_PRIMARY} disabled={!hasSelection || attempt.solved} onClick={trainer.check}>
              Check
            </button>
          </div>
        </div>
      </section>

      <SessionStats session={session} />

      <footer className="pb-2 text-center text-xs text-ink-3">
        Notes are spelled by interval — E major is E–G♯–B, never E–A♭–B.
      </footer>

      <SettingsDialog
        open={settingsOpen}
        settings={settings}
        onClose={() => setSettingsOpen(false)}
        onChange={updateSettings}
        onSetTypes={setTypes}
        onToggleType={toggleType}
      />
    </div>
  );
}
