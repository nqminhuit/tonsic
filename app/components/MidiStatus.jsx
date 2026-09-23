'use client';

import { PlugIcon } from './Icons';
import { MIDI_STATUS } from './useWebMIDI';
import { BUTTON_SECONDARY } from './ui';

const CHIP = 'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm';

function Dot({ className }) {
  return <span aria-hidden="true" className={`size-2 rounded-full ${className}`} />;
}

export default function MidiStatus({ status, devices, onConnect }) {
  if (status === MIDI_STATUS.connected && devices.length) {
    return (
      <span className={`${CHIP} border-good/40 bg-good-soft text-ink`} title="MIDI keyboard connected">
        <Dot className="bg-good" />
        {devices.map((device) => device.name).join(', ')}
      </span>
    );
  }

  if (status === MIDI_STATUS.connecting) {
    return <span className={`${CHIP} border-line text-ink-2`}>Connecting…</span>;
  }

  if (status === MIDI_STATUS.unsupported) {
    return (
      <span className={`${CHIP} border-line text-ink-2`} title="Web MIDI works in Chrome, Edge, Opera and Firefox">
        Web MIDI not supported in this browser
      </span>
    );
  }

  const retry = {
    [MIDI_STATUS.connected]: { text: 'No MIDI keyboard found — retry', dot: 'bg-warn' },
    [MIDI_STATUS.denied]: { text: 'MIDI access blocked — retry', dot: 'bg-bad' },
    [MIDI_STATUS.error]: { text: 'MIDI failed — retry', dot: 'bg-bad' },
  }[status];

  return (
    <button type="button" className={BUTTON_SECONDARY} onClick={onConnect}>
      {retry ? <Dot className={retry.dot} /> : <PlugIcon />}
      {retry ? retry.text : 'Connect MIDI keyboard'}
    </button>
  );
}
