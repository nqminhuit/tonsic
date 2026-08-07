'use client';

import { useEffect, useRef, useState } from 'react';

export function useWebMIDI(onNoteOn) {
  const [status, setStatus] = useState('Not connected');
  const onNoteOnRef = useRef(onNoteOn);
  useEffect(() => { onNoteOnRef.current = onNoteOn; });

  function attach(access) {
    for (const input of access.inputs.values()) {
      input.onmidimessage = (event) => {
        const [statusByte] = event.data;
        const cmd = statusByte & 0xf0;
        if (cmd === 0x90) {
          const note = event.data[1];
          const velocity = event.data[2];
          if (velocity > 0) onNoteOnRef.current(note);
        }
      };
    }
  }

  async function connectMIDI() {
    if (typeof navigator === 'undefined' || !navigator.requestMIDIAccess) {
      setStatus('Web MIDI not supported');
      return;
    }

    try {
      const access = await navigator.requestMIDIAccess();
      setStatus('Connected');
      attach(access);
      access.onstatechange = () => attach(access);
    } catch (err) {
      console.error(err);
      setStatus('Failed to connect');
    }
  }

  return {
    connectMIDI,
    status,
  };
}
