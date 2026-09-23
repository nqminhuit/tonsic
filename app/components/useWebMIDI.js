'use client';

import { useEffect, useRef, useState } from 'react';

const NOTE_OFF = 0x80;
const NOTE_ON = 0x90;
const CONTROL_CHANGE = 0xb0;
const ALL_NOTES_OFF = 123;

export const MIDI_STATUS = {
  idle: 'idle',
  connecting: 'connecting',
  connected: 'connected',
  unsupported: 'unsupported',
  denied: 'denied',
  error: 'error',
};

function listInputs(access) {
  return Array.from(access.inputs.values()).filter((input) => input.state !== 'disconnected');
}

export function useWebMIDI({ onNoteOn, onNoteOff, onReset }) {
  const [midi, setMidi] = useState({ status: MIDI_STATUS.idle, devices: [] });
  const handlersRef = useRef({ onNoteOn, onNoteOff, onReset });
  const accessRef = useRef(null);
  // the pending or granted requestMIDIAccess() promise, shared by concurrent connects
  const requestRef = useRef(null);
  const disposedRef = useRef(false);

  useEffect(() => {
    handlersRef.current = { onNoteOn, onNoteOff, onReset };
  });

  function handleMessage(event) {
    const [statusByte, data1, data2 = 0] = event.data;
    const command = statusByte & 0xf0;
    const handlers = handlersRef.current;
    // a note-on with velocity 0 is a note-off (MIDI 1.0 running-status convention)
    if (command === NOTE_ON && data2 > 0) handlers.onNoteOn(data1, data2);
    else if (command === NOTE_OFF || command === NOTE_ON) handlers.onNoteOff(data1);
    else if (command === CONTROL_CHANGE && data1 === ALL_NOTES_OFF) handlers.onReset();
  }

  function syncInputs(access) {
    // assigning the handler (instead of addEventListener) keeps re-syncing idempotent
    const inputs = listInputs(access);
    inputs.forEach((input) => {
      input.onmidimessage = handleMessage;
    });
    setMidi({
      status: MIDI_STATUS.connected,
      devices: inputs.map((input) => ({ id: input.id, name: input.name || 'MIDI keyboard' })),
    });
  }

  async function connect() {
    if (typeof navigator === 'undefined' || typeof navigator.requestMIDIAccess !== 'function') {
      setMidi({ status: MIDI_STATUS.unsupported, devices: [] });
      return;
    }
    if (accessRef.current) {
      syncInputs(accessRef.current);
      return;
    }

    if (!requestRef.current) {
      setMidi((current) => ({ ...current, status: MIDI_STATUS.connecting }));
      requestRef.current = navigator.requestMIDIAccess();
    }
    const request = requestRef.current;
    try {
      const access = await request;
      // another connect() may already have attached this access, and after unmount nothing is attached
      if (disposedRef.current || accessRef.current) return;
      accessRef.current = access;
      access.onstatechange = (event) => {
        if (event.port && event.port.type === 'input' && event.port.state === 'disconnected') {
          handlersRef.current.onReset();
        }
        syncInputs(access);
      };
      syncInputs(access);
    } catch (err) {
      if (requestRef.current === request) requestRef.current = null; // allow a retry
      if (disposedRef.current) return;
      const denied = err && (err.name === 'NotAllowedError' || err.name === 'SecurityError');
      setMidi({ status: denied ? MIDI_STATUS.denied : MIDI_STATUS.error, devices: [] });
    }
  }

  const connectRef = useRef(connect);
  useEffect(() => {
    connectRef.current = connect;
  });

  useEffect(() => {
    // StrictMode re-runs this effect after its cleanup
    disposedRef.current = false;
    let cancelled = false;
    // reconnect silently when the browser already granted MIDI access on an earlier visit
    if (typeof navigator !== 'undefined' && navigator.permissions && navigator.requestMIDIAccess) {
      navigator.permissions
        .query({ name: 'midi' })
        .then((permission) => {
          if (!cancelled && permission.state === 'granted') connectRef.current();
        })
        .catch(() => {});
    }

    return () => {
      cancelled = true;
      disposedRef.current = true;
      const access = accessRef.current;
      if (!access) return;
      access.onstatechange = null;
      for (const input of access.inputs.values()) input.onmidimessage = null;
      accessRef.current = null;
    };
  }, []);

  return { ...midi, connect };
}
