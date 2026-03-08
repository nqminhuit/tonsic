import '../styles/globals.css';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head />
      <body className="bg-gradient-to-br from-indigo-50 via-white to-rose-50 min-h-screen text-slate-900">
        <div className="min-h-screen flex flex-col">
          <header className="py-3">
            <div className="max-w-4xl mx-auto px-4">
              <h1 className="text-4xl font-extrabold text-center text-indigo-700">Tonsic</h1>
              <p className="mt-2 text-center text-slate-600">Interactive chord trainer — Web MIDI + on-screen keyboard</p>
            </div>
          </header>
          <main className="flex-1 container mx-auto px-4">
            {children}
          </main>
          <footer className="text-center text-sm text-slate-500">
            Built with ❤️ — Tonsic
          </footer>
        </div>
      </body>
    </html>
  );
}
