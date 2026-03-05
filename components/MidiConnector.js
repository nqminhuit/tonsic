import { useState, useRef } from 'react';

export function useMidi() {
  const [midiAccess, setMidiAccess] = useState(null);
  const listenersRef = useRef([]);

  async function connect() {
    if (midiAccess) return;
    if (!navigator.requestMIDIAccess) {
      alert('Web MIDI API not supported in this browser.');
      return;
    }
    try {
      const access = await navigator.requestMIDIAccess();
      setMidiAccess(access);
      attach(access);
    } catch (err) {
      console.error('MIDI access error', err);
      alert('Failed to access MIDI devices. See console for details.');
    }
  }

  function attach(access) {
    for (let input of access.inputs.values()) {
      input.onmidimessage = handleMessage;
    }
    access.onstatechange = () => {
      for (let input of access.inputs.values()) {
        input.onmidimessage = handleMessage;
      }
    };
  }

  function handleMessage(e) {
    const [status, data1, data2] = e.data;
    const cmd = status & 0xf0;
    if (cmd === 0x90 && data2 > 0) {
      listenersRef.current.forEach((fn) => fn({ note: data1, velocity: data2 }));
    }
  }

  function addListener(fn) {
    listenersRef.current.push(fn);
    return () => {
      listenersRef.current = listenersRef.current.filter((f) => f !== fn);
    };
  }

  function disconnect() {
    if (!midiAccess) return;
    for (let input of midiAccess.inputs.values()) {
      input.onmidimessage = null;
    }
    setMidiAccess(null);
  }

  return { connect, connected: !!midiAccess, addListener, disconnect, inputs: midiAccess ? Array.from(midiAccess.inputs.values()).map(i => i.name) : [] };
}
