'use client';

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

function barColor(score) {
  if (score === 100) return 'bg-green-500';
  if (score >= 67) return 'bg-amber-400';
  return 'bg-red-400';
}

function scoreColor(score) {
  if (score === 100) return 'text-green-600';
  if (score >= 67) return 'text-amber-600';
  return 'text-red-500';
}

export default function ScoreCard({ result }) {
  if (!result) return <div className="text-sm text-slate-500 italic">Play the exact voicing to evaluate...</div>;
  const pct = Math.max(0, Math.min(100, result.score));
  const mismatchRows = Array.isArray(result.mismatches) ? result.mismatches.filter((m) => m.expectedName || m.playedName) : [];
  return (
    <div className={`p-4 rounded-lg shadow-sm border ${result.match ? 'bg-green-50 border-green-200' : 'bg-white border-slate-100'}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wide">Score</div>
          <div className={`text-3xl font-bold ${scoreColor(result.score)}`}>{result.score}</div>
        </div>
        <div className="flex-1 max-w-40">
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-2.5 rounded-full transition-all duration-300 ${barColor(result.score)}`} style={{ width: `${pct}%` }} />
          </div>
          <div className="text-xs text-slate-400 text-right mt-1">{pct}%</div>
        </div>
      </div>

      <div className="mt-3">
        {result.match ? (
          <div className="flex items-center gap-2 text-sm font-medium text-green-600">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-600 text-xs">&#10003;</span>
            Exact voicing match!
          </div>
        ) : (
          <div className="text-sm font-medium text-amber-600">Voicing or note order did not match</div>
        )}
      </div>

      {result.missing && result.missing.length ? (
        <div className="mt-2 text-sm text-slate-600">
          <span className="font-medium text-slate-500">Missing:</span> {result.missing.map(n => NOTE_NAMES[n]).join(', ')}
        </div>
      ) : null}

      {result.extra && result.extra.length ? (
        <div className="mt-1 text-sm text-slate-600">
          <span className="font-medium text-slate-500">Extra:</span> {result.extra.map(n => NOTE_NAMES[n]).join(', ')}
        </div>
      ) : null}

      {mismatchRows.length ? (
        <div className="mt-3 rounded-md border border-slate-100 overflow-hidden">
          <div className="px-3 py-1.5 bg-slate-50 text-xs font-medium text-slate-500 uppercase tracking-wide">Note differences</div>
          <div className="divide-y divide-slate-100">
            {mismatchRows.map((mismatch) => (
              <div key={mismatch.index} className="px-3 py-1.5 flex items-center justify-between text-sm">
                <span className="text-slate-400 font-medium w-8">#{mismatch.index + 1}</span>
                <span className="flex items-center gap-1.5">
                  <span className="text-green-700 bg-green-50 px-1.5 py-0.5 rounded text-xs font-medium">{mismatch.expectedName}</span>
                  <span className="text-slate-300">&rarr;</span>
                  <span className="text-red-700 bg-red-50 px-1.5 py-0.5 rounded text-xs font-medium">{mismatch.playedName || 'nothing'}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
