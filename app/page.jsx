import MIDIController from './components/MIDIController';

export default function Page() {
  return (
    <section className="py-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white/80 backdrop-blur-md shadow-lg rounded-2xl p-6">
          <h2 className="text-2xl font-semibold text-slate-800 mb-2">Learn chords by playing</h2>
          <p className="text-slate-600 mb-4">Play a chord on your MIDI keyboard or use the on-screen keys.</p>
          <MIDIController />
        </div>
      </div>
    </section>
  );
}
