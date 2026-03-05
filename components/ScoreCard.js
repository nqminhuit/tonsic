import React from 'react';
import { NOTE_NAMES } from '../lib/chords';

export default function ScoreCard({ result }) {
  return (
    <div className="scorecard">
      <div>Score: {result.score}</div>
      <div>{result.match ? 'Exact match!' : 'Not exact'}</div>
      {result.missing && result.missing.length > 0 && (
        <div>Missing: {result.missing.map((n) => NOTE_NAMES[n]).join(', ')}</div>
      )}
      {result.extra && result.extra.length > 0 && (
        <div>Extra: {result.extra.map((n) => NOTE_NAMES[n]).join(', ')}</div>
      )}
    </div>
  );
}
