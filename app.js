(function(){
  const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const CHORD_FORMULAS = {
    maj: [0,4,7],
    min: [0,3,7],
    maj7: [0,4,7,11],
    '7': [0,4,7,10],
    min7: [0,3,7,10],
    '9': [0,4,7,10,14],
    '11': [0,4,7,10,14,17],
    sus2: [0,2,7],
    sus4: [0,5,7],
  };

  function buildChord(root,type){ const formula = CHORD_FORMULAS[type] || CHORD_FORMULAS.maj; return formula.map(off => ((root + off) % 12)); }
  function chordName(root,type){ return type === 'maj' ? NOTE_NAMES[root] : NOTE_NAMES[root] + type; }
  function randomChord({includeExtended = true} = {}){ const types = includeExtended ? ['maj','min','7','maj7','9','11','min7','sus2','sus4'] : ['maj','min','7','min7']; const root = Math.floor(Math.random() * 12); const type = types[Math.floor(Math.random() * types.length)]; return { root, type, pcs: buildChord(root, type), name: chordName(root, type) }; }
  function matchChord(expectedPCs, playedPCs){ const expected = new Set(expectedPCs.map(p => ((p % 12) + 12) % 12)); const played = new Set(playedPCs.map(p => ((p % 12) + 12) % 12)); const missing = [...expected].filter(p => !played.has(p)); const extra = [...played].filter(p => !expected.has(p)); const matchingCount = [...expected].filter(p => played.has(p)).length; const baseScore = Math.round((matchingCount / expected.size) * 100); const penalty = extra.length * 10; const score = Math.max(0, baseScore - penalty); const match = missing.length === 0 && extra.length === 0; return { match, missing, extra, score }; }

  let midiAccess = null;
  let capture = new Set();
  let timer = null;
  let currentTarget = null;

  const connectBtn = document.getElementById('connectBtn');
  const newChordBtn = document.getElementById('newChordBtn');
  const statusEl = document.getElementById('status');
  const targetEl = document.getElementById('target');
  const keyboardEl = document.getElementById('keyboard');
  const resultEl = document.getElementById('result');

  connectBtn.addEventListener('click', connectMIDI);
  newChordBtn.addEventListener('click', () => { currentTarget = randomChord({ includeExtended: true }); targetEl.textContent = 'Target: ' + currentTarget.name; resultEl.innerHTML = ''; });

  function connectMIDI(){
    if (!navigator.requestMIDIAccess) { alert('Web MIDI API not supported in this browser.'); return; }
    navigator.requestMIDIAccess().then(access => { midiAccess = access; statusEl.textContent = 'Connected'; attach(access); }, err => { console.error(err); alert('Failed to access MIDI devices.'); });
  }
  function attach(access){ for (let input of access.inputs.values()) input.onmidimessage = handleMessage; access.onstatechange = () => { for (let input of access.inputs.values()) input.onmidimessage = handleMessage; }; }
  function handleMessage(e){ const [status, data1, data2] = e.data; const cmd = status & 0xf0; if (cmd === 0x90 && data2 > 0) onNote(data1); }
  function onNote(note){ capture.add(note % 12); if (timer) clearTimeout(timer); timer = setTimeout(() => { const played = Array.from(capture); capture.clear(); evaluate(played); }, 700); }
  function evaluate(played){ if (!currentTarget) { resultEl.textContent = 'No target chord selected.'; return; } const res = matchChord(currentTarget.pcs, played); renderResult(res); }
  function renderResult(res){ resultEl.innerHTML = ''; const score = document.createElement('div'); score.textContent = 'Score: ' + res.score; resultEl.appendChild(score); const match = document.createElement('div'); match.textContent = res.match ? 'Exact match!' : 'Not exact'; resultEl.appendChild(match); if (res.missing && res.missing.length){ const m = document.createElement('div'); m.textContent = 'Missing: ' + res.missing.map(n => NOTE_NAMES[n]).join(', '); resultEl.appendChild(m); } if (res.extra && res.extra.length){ const e = document.createElement('div'); e.textContent = 'Extra: ' + res.extra.map(n => NOTE_NAMES[n]).join(', '); resultEl.appendChild(e); } }

  // on-screen keyboard (C..B)
  const notes = Array.from({ length: 12 }, (_, i) => 60 + i);
  notes.forEach(n => { const btn = document.createElement('button'); btn.className = 'key'; btn.textContent = NOTE_NAMES[n % 12]; btn.addEventListener('click', () => onNote(n)); keyboardEl.appendChild(btn); });

  // initial chord
  currentTarget = randomChord({ includeExtended: true });
  targetEl.textContent = 'Target: ' + currentTarget.name;

  window.Tonsic = { randomChord, matchChord, buildChord, CHORD_FORMULAS, NOTE_NAMES };
})();
