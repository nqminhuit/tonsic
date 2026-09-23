'use client';

import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { buildChord, randomChord } from '../../lib/chords';
import {
  checkNotes,
  clearSelection,
  createAttemptState,
  pressKey,
  releaseAll,
  releaseKey,
  startChord,
  toggleKey,
} from '../../lib/attempt';

export const ADVANCE_DELAY_MS = 1400;
const HISTORY_LENGTH = 12;
export const SOLVED = 'solved';
export const SKIPPED = 'skipped';

const EMPTY_SESSION = { attempts: 0, correct: 0, streak: 0, bestStreak: 0, finished: 0, history: [] };

export function useChordTrainer({ enabledTypes, matchMode }) {
  const [initialAttempt] = useState(() => createAttemptState());
  const attemptRef = useRef(initialAttempt);
  const [attempt, setAttempt] = useState(initialAttempt);
  const [session, setSession] = useState(EMPTY_SESSION);

  // null until the first input or advance: the first chord is derived, not random, so server and client agree
  const chord = attempt.chord ?? buildChord(0, enabledTypes[0]);

  function recordOutcome(correct, revealed) {
    setSession((s) => {
      // only solves without Show answer extend the streak
      const streak = correct && !revealed ? s.streak + 1 : 0;
      return {
        ...s,
        attempts: s.attempts + 1,
        correct: s.correct + (correct ? 1 : 0),
        streak,
        bestStreak: Math.max(s.bestStreak, streak),
      };
    });
  }

  function resetStreak() {
    setSession((s) => (s.streak ? { ...s, streak: 0 } : s));
  }

  function apply(update) {
    const prev = attemptRef.current;
    // pin the chord on screen so settings changes can't swap it mid-answer
    const base = prev.chord ? prev : { ...prev, chord };
    const next = update(base);
    if (next === prev) return;
    attemptRef.current = next;
    setAttempt(next);
    if (next.attempts > prev.attempts) recordOutcome(next.result.correct, next.revealed);
  }

  function goToNextChord({ outcome, types = enabledTypes }) {
    const current = attemptRef.current;
    const finished = current.chord ?? chord;
    if (outcome) {
      setSession((s) => ({
        ...s,
        finished: s.finished + 1,
        history: [
          { id: s.finished + 1, symbol: finished.displaySymbol, outcome, tries: current.attempts },
          ...s.history,
        ].slice(0, HISTORY_LENGTH),
      }));
    }
    // a chord solved just before a settings change keeps its streak
    if (outcome !== SOLVED && !current.solved) resetStreak();
    const next = randomChord(types, finished);
    apply((s) => startChord(s, next));
  }

  const advanceAfterSuccess = useEffectEvent(() => goToNextChord({ outcome: SOLVED }));

  useEffect(() => {
    if (!attempt.solved) return undefined;
    const timer = setTimeout(advanceAfterSuccess, ADVANCE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [attempt.solved]);

  // a result judged under another answer rule would disagree with the key colours
  const visibleAttempt = attempt.result && attempt.result.matchMode !== matchMode ? { ...attempt, result: null } : attempt;

  return {
    attempt: visibleAttempt,
    chord,
    revealed: attempt.revealed,
    session,
    pressKey: (midi) => apply((s) => pressKey(s, midi, matchMode)),
    releaseKey: (midi) => apply((s) => releaseKey(s, midi, matchMode)),
    toggleKey: (midi) => apply((s) => toggleKey(s, midi, matchMode)),
    check: () => apply((s) => checkNotes(s, matchMode)),
    clear: () => apply(clearSelection),
    releaseAll: () => apply(releaseAll),
    reveal: () => {
      apply((s) => (s.revealed ? s : { ...s, revealed: true }));
      resetStreak();
    },
    skip: () => goToNextChord({ outcome: attemptRef.current.solved ? SOLVED : SKIPPED }),
    // settings changes pass the new chord types, which this render has not seen yet
    typesChanged: (types) => {
      if (types.includes((attemptRef.current.chord ?? chord).type)) {
        // apply pins the current chord, so enabling a type can't swap it
        apply((s) => s);
        return;
      }
      // no history entry, but the streak ends so turning off a type can't dodge a hard chord
      goToNextChord({ outcome: null, types });
    },
  };
}
