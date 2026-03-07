'use client';

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

export default function ScoreCard({ result }) {
  if (!result) return <div className="text-slate-600">Play notes to evaluate...</div>;
  const pct = Math.max(0, Math.min(100, result.score));
  return (
    <div className="p-4 bg-white border border-slate-100 rounded-md shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-slate-500">Score</div>
          <div className="text-2xl font-bold text-indigo-700">{result.score}</div>
        </div>
        <div className="w-36">
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-2 bg-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="text-xs text-slate-500 text-right mt-1">{pct}%</div>
        </div>
      </div>
      <div className="mt-3">
        <div className="text-sm">{result.match ? <span className="text-green-600 font-medium">Exact match!</span> : <span className="text-amber-600 font-medium">Not exact</span>}</div>
        {result.missing && result.missing.length ? <div className="mt-2 text-sm text-slate-600">Missing: {result.missing.map(n => NOTE_NAMES[n]).join(', ')}</div> : null}
        {result.extra && result.extra.length ? <div className="mt-1 text-sm text-slate-600">Extra: {result.extra.map(n => NOTE_NAMES[n]).join(', ')}</div> : null}
      </div>
    </div>
  );
}
