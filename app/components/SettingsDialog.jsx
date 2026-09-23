'use client';

import { useEffect, useEffectEvent, useRef } from 'react';
import { BASS_MODE, CHORD_GROUPS, CHORD_TYPE_IDS, CHORD_TYPES, DEFAULT_ENABLED_TYPES, EXACT_MODE, NOTES_MODE, buildChord, prettyNoteName } from '../../lib/chords';
import { CloseIcon } from './Icons';
import { OCTAVE_LIMITS } from './useSettings';
import { BUTTON_QUIET, BUTTON_SECONDARY, EYEBROW } from './ui';

const CHORD_EXAMPLES = CHORD_TYPE_IDS.map((id) => ({ id, group: CHORD_TYPES[id].group, chord: buildChord(0, id) }));

function typesInGroup(group) {
  return CHORD_TYPE_IDS.filter((id) => CHORD_TYPES[id].group === group);
}

const PRESETS = [
  { label: 'Basics', types: DEFAULT_ENABLED_TYPES },
  { label: 'All triads', types: typesInGroup('triads') },
  { label: 'All sevenths', types: typesInGroup('sevenths') },
  { label: 'Everything', types: CHORD_TYPE_IDS },
];

const MATCH_OPTIONS = [
  { id: NOTES_MODE, title: 'Right notes, any octave or inversion', detail: 'E–G–C counts as C major. Best while you learn chord shapes.' },
  { id: BASS_MODE, title: 'Root position', detail: 'The same notes, with the root as the lowest one.' },
  { id: EXACT_MODE, title: 'Exactly as written', detail: 'Only the exact keys shown on the staff count.' },
];

const CONTROL = 'mt-1 size-4 accent-accent';
const OPTION_DETAIL = 'block text-xs text-ink-3';
const MATCH_TITLE_ID = 'match-title';
const SECTION = 'border-t border-line pt-5';
const OPTION_ROW = 'flex cursor-pointer items-start gap-3 rounded-lg border border-line px-3 py-2.5 hover:bg-surface-2';

function Stepper({ label, value, min, max, format, onChange }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-ink-2">{label}</span>
      <div className="flex items-center gap-1">
        <button type="button" className={BUTTON_SECONDARY} aria-label={`Decrease ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)}>−</button>
        <span className="w-12 text-center text-sm font-semibold tabular-nums" aria-live="polite">{format(value)}</span>
        <button type="button" className={BUTTON_SECONDARY} aria-label={`Increase ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)}>+</button>
      </div>
    </div>
  );
}

function Toggle({ label, detail, checked, onChange }) {
  return (
    <label className={OPTION_ROW}>
      <input type="checkbox" className={CONTROL} checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        {detail ? <span className={OPTION_DETAIL}>{detail}</span> : null}
      </span>
    </label>
  );
}

export default function SettingsDialog({ open, settings, onClose, onChange, onSetTypes, onToggleType }) {
  const panelRef = useRef(null);
  const closeOnEscape = useEffectEvent((event) => {
    if (event.key === 'Escape') onClose();
  });

  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement;
    panelRef.current?.focus();
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') previouslyFocused.focus();
    };
  }, [open]);

  if (!open) return null;

  const enabled = new Set(settings.enabledTypes);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div aria-hidden="true" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        tabIndex={-1}
        className="relative flex h-full w-full max-w-md flex-col gap-5 overflow-y-auto bg-surface p-6 shadow-2xl outline-none"
      >
        <div className="flex items-center justify-between">
          <h2 id="settings-title" className="text-xl font-bold text-ink">Settings</h2>
          <button type="button" className={BUTTON_QUIET} aria-label="Close settings" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        <section aria-labelledby="chords-title">
          <h3 id="chords-title" className={EYEBROW}>Chords to practise</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button key={preset.label} type="button" className={BUTTON_SECONDARY} onClick={() => onSetTypes(preset.types)}>
                {preset.label}
              </button>
            ))}
          </div>
          {CHORD_GROUPS.map((group) => (
            <fieldset key={group.id} className="mt-4">
              <legend className="text-sm font-semibold text-ink">{group.label}</legend>
              <div className="mt-2 grid gap-1.5">
                {CHORD_EXAMPLES.filter((example) => example.group === group.id).map(({ id, chord }) => {
                  const checked = enabled.has(id);
                  return (
                    <label key={id} className={OPTION_ROW}>
                      <input
                        type="checkbox"
                        className={CONTROL}
                        checked={checked}
                        disabled={checked && enabled.size === 1}
                        onChange={() => onToggleType(id)}
                      />
                      <span className="min-w-0">
                        <span className="text-sm font-semibold text-ink">{chord.displaySymbol}</span>{' '}
                        <span className="ml-1 text-sm text-ink-2">{CHORD_TYPES[id].name}</span>
                        <span className={OPTION_DETAIL}>{chord.tones.map((tone) => prettyNoteName(tone.name)).join(' – ')}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </section>

        <section className={SECTION} aria-labelledby={MATCH_TITLE_ID}>
          <h3 id={MATCH_TITLE_ID} className={EYEBROW}>What counts as correct</h3>
          <div className="mt-3 grid gap-1.5" role="radiogroup" aria-labelledby={MATCH_TITLE_ID}>
            {MATCH_OPTIONS.map((option) => (
              <label key={option.id} className={OPTION_ROW}>
                <input
                  type="radio"
                  name="match-mode"
                  className={CONTROL}
                  checked={settings.matchMode === option.id}
                  onChange={() => onChange({ matchMode: option.id })}
                />
                <span>
                  <span className="block text-sm font-medium text-ink">{option.title}</span>
                  <span className={OPTION_DETAIL}>{option.detail}</span>
                </span>
              </label>
            ))}
          </div>
        </section>

        <section className={`${SECTION} grid gap-3`} aria-labelledby="keyboard-title">
          <h3 id="keyboard-title" className={EYEBROW}>On-screen keyboard</h3>
          <Stepper
            label="Lowest key"
            value={settings.startOctave}
            min={OCTAVE_LIMITS.minStart}
            max={OCTAVE_LIMITS.maxStart}
            format={(octave) => `C${octave}`}
            onChange={(startOctave) => onChange({ startOctave })}
          />
          <Stepper
            label="Octaves"
            value={settings.octaves}
            min={OCTAVE_LIMITS.minCount}
            max={OCTAVE_LIMITS.maxCount}
            format={String}
            onChange={(octaves) => onChange({ octaves })}
          />
          <Toggle
            label="Name every key"
            detail="Otherwise only the C keys are named (C4 is middle C)."
            checked={settings.labelAllKeys}
            onChange={(labelAllKeys) => onChange({ labelAllKeys })}
          />
          <p className="text-xs text-ink-3">The keyboard grows by itself when a chord needs more room.</p>
        </section>

        <section className={`${SECTION} grid gap-1.5`} aria-labelledby="sound-title">
          <h3 id="sound-title" className={`${EYEBROW} mb-1.5`}>Sound</h3>
          <Toggle
            label="Play on-screen keys"
            checked={settings.keySounds}
            onChange={(keySounds) => onChange({ keySounds })}
          />
          <Toggle
            label="Play MIDI keys too"
            detail="For MIDI controllers without their own speakers."
            checked={settings.midiSounds}
            onChange={(midiSounds) => onChange({ midiSounds })}
          />
        </section>

        <p className="mt-auto text-xs text-ink-3">Settings are saved in this browser.</p>
      </div>
    </div>
  );
}
