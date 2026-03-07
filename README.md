Tonsic — Chord Trainer (Next.js App Router)

Quick start:

1. Install dependencies: npm install
2. Run dev server: npm run dev
3. Build: npm run build
4. Start: npm start

Notes:
- This project has been refactored to use Next.js App Router (app/).
- Client MIDI UI and keyboard are implemented as React client components under app/components/.
- Chord logic is a pure module at lib/chords.js and is unit-tested (npm test).
- Legacy static files were moved to public/ as fallbacks (public/index.html, public/app.js).

Files changed:
- lib/chords.js: converted to a testable module without DOM usage.
- app/: added app/layout.jsx, app/page.jsx and client components.
- styles/globals.css: global styles and Tailwind directives.
- public/: legacy static files for fallback.

Running locally:
- npm install
- npm run dev
- npm run build
- npm start

If you need the previous Pages Router files they were archived to pages_legacy before cleanup.
