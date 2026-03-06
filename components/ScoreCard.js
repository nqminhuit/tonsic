import React from 'react';
import { NOTE_NAMES } from '../lib/chords';

export default function ScoreCard({ result }) {
  return (
    <div className="p-4 rounded border bg-gray-50">
      <div className="text-lg font-semibold">Score: {result.score}</div>
      <div className={`mt-2 ${result.match ? 'text-green-600' : 'text-yellow-700'}`}>{result.match ? 'Exact match!' : 'Not exact'}</div>
      {result.missing && result.missing.length > 0 && (
        <div className="mt-2 text-sm text-gray-700">Missing: {result.missing.map((n) => NOTE_NAMES[n]).join(', ')}</div>
      )}
      {result.extra && result.extra.length > 0 && (
        <div className="mt-1 text-sm text-gray-700">Extra: {result.extra.map((n) => NOTE_NAMES[n]).join(', ')}</div>
      )}
    </div>
  );
}
