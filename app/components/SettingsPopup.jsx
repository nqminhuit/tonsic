'use client';

import React, { useEffect, useRef } from 'react';

export default function SettingsPopup({ availableTypes = [], enabledTypes = new Set(), toggleType = () => {}, visualKeyboard, setVisualKeyboard, baseOctave, setBaseOctave, octavesVisible, setOctavesVisible, mode, setMode, numberingStyle, setNumberingStyle, onClose = () => {} }) {
  const containerRef = useRef(null);
  useEffect(() => {
    function onDown(e) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target)) onClose();
    }
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div className="mt-2 relative">
      <div ref={containerRef} className="absolute right-0 mt-2 w-80 bg-white border border-slate-100 rounded-lg shadow-lg p-3 z-50">
        <div className="flex justify-between items-center mb-2">
          <div className="text-sm font-semibold">Settings</div>
          <button onClick={onClose} className="text-sm text-slate-500">Close</button>
        </div>
        <div className="space-y-3 max-h-96 overflow-auto">
          {availableTypes.map((t) => (
            <label key={t} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={enabledTypes.has(t)} onChange={() => toggleType(t)} />
              <span className="capitalize">{t}</span>
            </label>
          ))}

          <div className="pt-2 border-t border-slate-100">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={visualKeyboard} onChange={() => { const n = !visualKeyboard; setVisualKeyboard(n); try { if (typeof window !== 'undefined') window.localStorage.setItem('visualKeyboard', String(n)); } catch (e) {} }} />
              <span>Visual piano keyboard</span>
            </label>

            <div className="mt-2 text-sm text-slate-600 flex items-center gap-2">
              <button onClick={() => { const n = Math.max(0, baseOctave - 1); setBaseOctave(n); try { if (typeof window !== 'undefined') window.localStorage.setItem('keyboardBaseOctave', String(n)); } catch (e) {} }} className="px-2 py-1 bg-gray-100 rounded">-</button>
              <div>Base octave: <span className="font-medium">{baseOctave}</span></div>
              <button onClick={() => { const n = Math.min(8, baseOctave + 1); setBaseOctave(n); try { if (typeof window !== 'undefined') window.localStorage.setItem('keyboardBaseOctave', String(n)); } catch (e) {} }} className="px-2 py-1 bg-gray-100 rounded">+</button>
            </div>

            <div className="mt-2 text-sm text-slate-600 flex items-center gap-2">
              <button onClick={() => { const n = Math.max(1, octavesVisible - 1); setOctavesVisible(n); try { if (typeof window !== 'undefined') window.localStorage.setItem('octavesVisible', String(n)); } catch (e) {} }} className="px-2 py-1 bg-gray-100 rounded">-</button>
              <div>Visible octaves: <span className="font-medium">{octavesVisible}</span></div>
              <button onClick={() => { const n = Math.min(6, octavesVisible + 1); setOctavesVisible(n); try { if (typeof window !== 'undefined') window.localStorage.setItem('octavesVisible', String(n)); } catch (e) {} }} className="px-2 py-1 bg-gray-100 rounded">+</button>
            </div>

            <div className="mt-3 text-sm">
              <div className="text-sm text-slate-500">Mode</div>
              <div className="flex items-center gap-2 mt-1">
                <label className="flex items-center gap-2 text-sm"><input type="radio" name="mode-popup" value="test" checked={mode === 'test'} onChange={() => { setMode('test'); try { if (typeof window !== 'undefined') window.localStorage.setItem('mode', 'test'); } catch (e) {} }} /> <span>Test</span></label>
                <label className="flex items-center gap-2 text-sm"><input type="radio" name="mode-popup" value="learning" checked={mode === 'learning'} onChange={() => { setMode('learning'); try { if (typeof window !== 'undefined') window.localStorage.setItem('mode', 'learning'); } catch (e) {} }} /> <span>Learning</span></label>
              </div>

              <div className="mt-2 text-sm text-slate-500">Numbering style</div>
              <div className="flex items-center gap-2 mt-1">
                <label className="flex items-center gap-2 text-sm"><input type="radio" name="numbering-popup" value="formula" checked={numberingStyle === 'formula'} onChange={() => { setNumberingStyle('formula'); try { if (typeof window !== 'undefined') window.localStorage.setItem('numberingStyle', 'formula'); } catch (e) {} }} /> <span>Formula-order (1,3,5)</span></label>
                <label className="flex items-center gap-2 text-sm"><input type="radio" name="numbering-popup" value="pitch" checked={numberingStyle === 'pitch'} onChange={() => { setNumberingStyle('pitch'); try { if (typeof window !== 'undefined') window.localStorage.setItem('numberingStyle', 'pitch'); } catch (e) {} }} /> <span>Ascending pitch (1..N)</span></label>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
