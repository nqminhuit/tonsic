'use client';

import { useEffect, useRef, useState } from 'react';

export function useExactVoicingCapture({
  debounceMs,
  expectedLength,
  highlightShowMs,
  onCaptureComplete,
  onNewAttempt,
}) {
  const captureRef = useRef([]);
  const timerRef = useRef(null);
  const highlightTimerRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [playedMidis, setPlayedMidis] = useState([]);

  function clearHighlightTimer() {
    if (highlightTimerRef.current) {
      clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = null;
    }
  }

  function clearCaptureTimer() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function resetPlayedMidis() {
    setPlayedMidis([]);
  }

  function finishCapture(played) {
    clearCaptureTimer();
    captureRef.current.length = 0;
    setIsRecording(false);
    onCaptureComplete(played);
  }

  function handlePlayedNote(noteNumber) {
    const startingNewCapture = captureRef.current.length === 0;
    if (startingNewCapture) {
      onNewAttempt();
      setIsRecording(true);
      clearHighlightTimer();
    }

    captureRef.current.push(noteNumber);
    setPlayedMidis((prev) => (prev.includes(noteNumber) ? prev : [...prev, noteNumber]));

    if (expectedLength && captureRef.current.length === expectedLength) {
      finishCapture(Array.from(captureRef.current));
      return;
    }

    clearCaptureTimer();
    timerRef.current = setTimeout(() => {
      finishCapture(Array.from(captureRef.current));
    }, debounceMs);
  }

  function showCaptureFeedback() {
    clearHighlightTimer();
    highlightTimerRef.current = setTimeout(() => {
      resetPlayedMidis();
      highlightTimerRef.current = null;
    }, highlightShowMs);
  }

  function resetCaptureState() {
    clearCaptureTimer();
    clearHighlightTimer();
    captureRef.current.length = 0;
    setIsRecording(false);
    resetPlayedMidis();
  }

  useEffect(() => {
    return () => {
      clearCaptureTimer();
      clearHighlightTimer();
    };
  }, []);

  return {
    handlePlayedNote,
    isRecording,
    playedMidis,
    resetCaptureState,
    resetPlayedMidis,
    showCaptureFeedback,
  };
}
