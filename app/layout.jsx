import '../styles/globals.css';

export const metadata = {
  title: 'Tonsic — chord trainer',
  description: 'Learn and practise piano chords with a MIDI keyboard or the on-screen keys.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-paper font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
