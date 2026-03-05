Static fallback: Running without Node/npm

To use the standalone static version (no npm required):

1. Open index.html in a browser that supports the Web MIDI API (Chrome/Edge on desktop). For MIDI over USB, serving via localhost is recommended.
2. Alternatively, serve the folder with a simple HTTP server:
   - Python 3: python3 -m http.server 8000
   - Then open http://localhost:8000

Notes:
- Browsers require secure context or localhost for Web MIDI; use localhost if possible.
- Connect your USB MIDI keyboard and press "Connect MIDI" when prompted.
